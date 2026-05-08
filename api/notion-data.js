const NOTION_TOKEN = process.env.NOTION_TOKEN;

// ── Client BD databases ──────────────────────────────────────────────────────
const PIPELINE_DB  = '5917ea76-3735-4640-8b63-0c7cdbb72d62';
const CONTACTS_DB  = 'be368873-1558-492b-b037-6369e4d4e69f';

// ── Media BD databases ───────────────────────────────────────────────────────
const MEDIA_PIPELINE_DB  = '3788d41d-165e-4125-92f2-8041fe2bfcad';
const MEDIA_CONTACTS_DB  = '1161f104-ed0e-4e8c-872c-88796e6c9b95';

// ── Shared query helper ──────────────────────────────────────────────────────
async function queryDatabase(databaseId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (!res.ok) throw new Error(`Notion API error ${res.status} on DB ${databaseId}`);
  return res.json();
}

// ── Property extractor ───────────────────────────────────────────────────────
function getProp(props, name, type) {
  const p = props[name];
  if (!p) return null;
  if (type === 'title')       return p.title?.map(t => t.plain_text).join('') || '';
  if (type === 'text')        return p.rich_text?.map(t => t.plain_text).join('') || '';
  if (type === 'select')      return p.select?.name || null;
  if (type === 'multi')       return p.multi_select?.map(ms => ms.name) || [];
  if (type === 'number')      return p.number ?? null;
  if (type === 'url')         return p.url || null;
  if (type === 'email')       return p.email || null;
  if (type === 'phone')       return p.phone_number || null;
  if (type === 'date')        return p.date?.start || null;
  if (type === 'last_edited') return p.last_edited_time || null;
  return null;
}

// ── Tier shorthand normaliser (client side) ──────────────────────────────────
function normaliseTier(raw) {
  if (!raw) return 'T3';
  if (raw.startsWith('Tier 1')) return 'T1';
  if (raw.startsWith('Tier 2')) return 'T2';
  if (raw.startsWith('Tier 3')) return 'T3';
  if (raw.startsWith('Wholesale')) return 'WS';
  return 'T3';
}

// ── Stage normaliser (client side) ───────────────────────────────────────────
function normaliseStage(raw) {
  if (!raw) return 'target';
  const s = raw.toLowerCase();
  if (s.includes('active'))   return 'active';
  if (s.includes('closing'))  return 'active';
  if (s.includes('negotiat')) return 'nego';
  if (s.includes('evaluat'))  return 'eval';
  if (s.includes('contact'))  return 'contact';
  if (s.includes('compli'))   return 'compliance';
  return 'target';
}

// ── Revenue formatter ($K number → "$X.XM" or "$XK") ────────────────────────
function fmtRev(kVal) {
  if (kVal === null || kVal === undefined) return '—';
  if (kVal >= 1000) return `$${(kVal / 1000).toFixed(1)}M`;
  return `$${kVal}K`;
}

// ── Media stage normaliser ───────────────────────────────────────────────────
function normaliseMediaStage(raw) {
  if (!raw) return 'mp-prospect';
  const s = raw.toLowerCase();
  if (s.includes('active smp'))    return 'mp-smp';
  if (s.includes('active mp'))     return 'mp-onboard';
  if (s.includes('onboard'))       return 'mp-onboard';
  if (s.includes('evaluat'))       return 'mp-eval';
  if (s.includes('outreach'))      return 'mp-outreach';
  if (s.includes('paused'))        return 'mp-paused';
  if (s.includes('rejected'))      return 'mp-paused';
  return 'mp-prospect';
}

// ── Media tier normaliser ────────────────────────────────────────────────────
function normaliseMediaTier(raw) {
  if (!raw) return 'PERF';
  if (raw.startsWith('SMP'))         return 'SMP';
  if (raw.startsWith('Broader'))     return 'MP';
  if (raw.startsWith('Performance')) return 'PERF';
  return 'PERF';
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
  }

  try {
    // Fetch all four databases in parallel
    const [pipelineRes, contactsRes, mediaPipelineRes, mediaContactsRes] = await Promise.all([
      queryDatabase(PIPELINE_DB),
      queryDatabase(CONTACTS_DB),
      queryDatabase(MEDIA_PIPELINE_DB),
      queryDatabase(MEDIA_CONTACTS_DB),
    ]);

    // ── Client pipeline ────────────────────────────────────────────────────
    const pipeline = pipelineRes.results.map(page => {
      const p = page.properties;
      const tierRaw  = getProp(p, 'ICP Tier', 'select');
      const stageRaw = getProp(p, 'Stage', 'select');
      const revK     = getProp(p, 'Est. Annual Rev ($K)', 'number');
      const tier     = normaliseTier(tierRaw);
      const stage    = normaliseStage(stageRaw);
      return {
        id:          page.id,
        url:         page.url,
        co:          getProp(p, 'Company', 'title'),
        tier,
        tl:          tierRaw || 'Tier 3',
        type:        getProp(p, 'Buyer Type', 'select') || '',
        stage,
        score:       getProp(p, 'ICP Score', 'number') ?? 50,
        aep:         getProp(p, 'AEP Buyer', 'select') || 'TBD',
        rev:         fmtRev(revK),
        owner:       getProp(p, 'BD Owner', 'select') || 'AE',
        action:      getProp(p, 'Next Action', 'text') || '',
        compliance:  getProp(p, 'Compliance Status', 'select'),
        lastUpdated: getProp(p, 'Last Updated', 'last_edited'),
        isActive:    stage === 'active' || stage === 'compliance',
      };
    }).filter(p => p.co && p.stage !== 'On hold');

    // ── Client contacts ────────────────────────────────────────────────────
    const contacts = contactsRes.results.map(page => {
      const p = page.properties;
      return {
        id:         page.id,
        name:       getProp(p, 'Full Name', 'title'),
        company:    getProp(p, 'Company', 'text'),
        title:      getProp(p, 'Title', 'text'),
        seniority:  getProp(p, 'Seniority', 'select'),
        role:       getProp(p, 'Contact Role', 'select'),
        status:     getProp(p, 'Outreach Status', 'select'),
        channel:    getProp(p, 'Outreach Channel', 'select'),
        linkedin:   getProp(p, 'LinkedIn URL', 'url'),
        owner:      getProp(p, 'BD Owner', 'select'),
        nextAction: getProp(p, 'Next Action', 'text'),
        nextTouch:  getProp(p, 'Next Touch Date', 'date'),
        tier:       getProp(p, 'ICP Tier', 'select'),
      };
    }).filter(c => c.name && !c.nextAction?.includes('Removed'));

    // ── Media partner pipeline ─────────────────────────────────────────────
    const mediaPipeline = mediaPipelineRes.results.map(page => {
      const p        = page.properties;
      const tierRaw  = getProp(p, 'Partner Tier', 'select');
      const stageRaw = getProp(p, 'Stage', 'select');
      const tier     = normaliseMediaTier(tierRaw);
      const stage    = normaliseMediaStage(stageRaw);
      return {
        id:               page.id,
        url:              page.url,
        co:               getProp(p, 'Partner Name', 'title'),
        tier,
        tl:               tierRaw || 'Performance — Emerging',
        type:             getProp(p, 'Channel Type', 'select') || '',
        stage,
        score:            getProp(p, 'SMP Fit Score', 'number') ?? 0,
        aep:              getProp(p, 'AEP Scale Factor', 'select') || 'TBD',
        vol:              getProp(p, 'Est. Monthly Volume', 'select') || 'TBD',
        quality:          getProp(p, 'Quality Index %', 'number') ?? 0,
        tcpa:             getProp(p, 'TCPA Compliance', 'select'),
        api:              getProp(p, 'API Integrated', 'select'),
        aepCommitted:     getProp(p, 'AEP Volume Committed', 'select'),
        states:           getProp(p, 'Primary States', 'select'),
        products:         getProp(p, 'Product Focus', 'multi'),
        owner:            getProp(p, 'MP Owner', 'select') || 'AE',
        action:           getProp(p, 'Next Action', 'text') || '',
        nextActionDate:   getProp(p, 'Next Action Date', 'date'),
        notes:            getProp(p, 'Notes', 'text') || '',
        lastUpdated:      getProp(p, 'Last Updated', 'last_edited'),
        isActiveSMP:      stage === 'mp-smp',
      };
    }).filter(p => p.co && p.stage !== 'mp-paused' || p.stage === 'mp-paused' && p.score > 0);

    // ── Media partner contacts ─────────────────────────────────────────────
    const mediaContacts = mediaContactsRes.results.map(page => {
      const p = page.properties;
      return {
        id:           page.id,
        name:         getProp(p, 'Contact Name', 'title'),
        org:          getProp(p, 'Partner / Organization', 'text'),
        role:         getProp(p, 'Role / Title', 'text'),
        channel:      getProp(p, 'Channel Type', 'select'),
        tier:         getProp(p, 'Partner Tier', 'select'),
        relationship: getProp(p, 'Relationship Status', 'select'),
        status:       getProp(p, 'Outreach Status', 'select'),
        linkedin:     getProp(p, 'LinkedIn', 'url'),
        email:        getProp(p, 'Email', 'email'),
        phone:        getProp(p, 'Phone', 'phone'),
        lastContact:  getProp(p, 'Last Contact Date', 'date'),
        nextFollowUp: getProp(p, 'Next Follow-Up Date', 'date'),
        notes:        getProp(p, 'Notes', 'text'),
        owner:        getProp(p, 'MP Owner', 'select'),
      };
    }).filter(c => c.name && c.status !== 'Removed from active pursuit');

    return res.status(200).json({
      pipeline,
      contacts,
      mediaPipeline,
      mediaContacts,
      lastFetched: new Date().toISOString(),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
