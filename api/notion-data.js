const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PIPELINE_DB = '5917ea76-3735-4640-8b63-0c7cdbb72d62';
const CONTACTS_DB = 'be368873-1558-492b-b037-6369e4d4e69f';

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
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
  return res.json();
}

function getProp(props, name, type) {
  const p = props[name];
  if (!p) return null;
  if (type === 'title') return p.title?.map(t => t.plain_text).join('') || '';
  if (type === 'text') return p.rich_text?.map(t => t.plain_text).join('') || '';
  if (type === 'select') return p.select?.name || null;
  if (type === 'number') return p.number ?? null;
  if (type === 'url') return p.url || null;
  if (type === 'date') return p.date?.start || null;
  if (type === 'last_edited') return p.last_edited_time || null;
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN not configured' });
  }

  try {
    const [pipelineRes, contactsRes] = await Promise.all([
      queryDatabase(PIPELINE_DB),
      queryDatabase(CONTACTS_DB),
    ]);

    const pipeline = pipelineRes.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        url: page.url,
        co: getProp(p, 'Company', 'title'),
        tier: getProp(p, 'ICP Tier', 'select'),
        type: getProp(p, 'Buyer Type', 'select'),
        stage: getProp(p, 'Stage', 'select'),
        score: getProp(p, 'ICP Score', 'number'),
        aep: getProp(p, 'AEP Buyer', 'select'),
        rev: getProp(p, 'Est. Annual Rev ($K)', 'number'),
        owner: getProp(p, 'BD Owner', 'select'),
        action: getProp(p, 'Next Action', 'text'),
        compliance: getProp(p, 'Compliance Status', 'select'),
        lastUpdated: getProp(p, 'Last Updated', 'last_edited'),
      };
    }).filter(p => p.co && p.stage !== 'On hold');

    const contacts = contactsRes.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        name: getProp(p, 'Full Name', 'title'),
        company: getProp(p, 'Company', 'text'),
        title: getProp(p, 'Title', 'text'),
        seniority: getProp(p, 'Seniority', 'select'),
        role: getProp(p, 'Contact Role', 'select'),
        status: getProp(p, 'Outreach Status', 'select'),
        channel: getProp(p, 'Outreach Channel', 'select'),
        linkedin: getProp(p, 'LinkedIn URL', 'url'),
        owner: getProp(p, 'BD Owner', 'select'),
        nextAction: getProp(p, 'Next Action', 'text'),
        nextTouch: getProp(p, 'Next Touch Date', 'date'),
        tier: getProp(p, 'ICP Tier', 'select'),
      };
    }).filter(c => c.name && !c.nextAction?.includes('Removed'));

    return res.status(200).json({
      pipeline,
      contacts,
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
