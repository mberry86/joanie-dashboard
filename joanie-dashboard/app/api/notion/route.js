import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 100,
    });

    const entries = response.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        date: props.Date?.date?.start || null,
        teamMember: props['Team member']?.people?.[0]?.name || 'Unknown',
        taskType: props['Task type']?.select?.name || 'Other',
        projectContext: props['Project / context']?.rich_text?.[0]?.plain_text || '',
        timeInvested: props['Time invested (min)']?.number || 0,
        qualityScore: props['Quality score']?.number || null,
        outcome: props.Outcome?.select?.name || null,
        promptQuality: props['Prompt quality']?.select?.name || null,
        whatWorkedWell: props['What worked well']?.rich_text?.[0]?.plain_text || '',
        whatToImprove: props['What to improve']?.rich_text?.[0]?.plain_text || '',
        outputSaved: props['Output saved']?.checkbox || false,
        weekNumber: props['Week number']?.formula?.number || null,
      };
    });

    // Compute metrics
    const totalEntries = entries.length;
    const scoredEntries = entries.filter(e => e.qualityScore !== null);
    const avgQuality = scoredEntries.length > 0
      ? (scoredEntries.reduce((sum, e) => sum + e.qualityScore, 0) / scoredEntries.length).toFixed(1)
      : 0;

    const flags = entries.filter(e => e.qualityScore !== null && e.qualityScore < 6);
    const outputsSaved = entries.filter(e => e.outputSaved).length;

    // Quality by task type
    const taskTypes = {};
    entries.forEach(e => {
      if (e.taskType && e.qualityScore !== null) {
        if (!taskTypes[e.taskType]) taskTypes[e.taskType] = { total: 0, count: 0 };
        taskTypes[e.taskType].total += e.qualityScore;
        taskTypes[e.taskType].count += 1;
      }
    });
    const qualityByTask = Object.entries(taskTypes).map(([type, data]) => ({
      type,
      avg: parseFloat((data.total / data.count).toFixed(1)),
      count: data.count,
    })).sort((a, b) => b.avg - a.avg);

    // Task type distribution
    const taskDist = {};
    entries.forEach(e => {
      if (e.taskType) taskDist[e.taskType] = (taskDist[e.taskType] || 0) + 1;
    });
    const taskDistribution = Object.entries(taskDist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Weekly trend (last 10 weeks)
    const weeklyData = {};
    entries.forEach(e => {
      if (e.weekNumber && e.qualityScore !== null) {
        if (!weeklyData[e.weekNumber]) weeklyData[e.weekNumber] = { scores: [], count: 0 };
        weeklyData[e.weekNumber].scores.push(e.qualityScore);
        weeklyData[e.weekNumber].count += 1;
      }
    });
    const weeklyTrend = Object.entries(weeklyData)
      .sort((a, b) => a[0] - b[0])
      .slice(-10)
      .map(([week, data]) => ({
        week: `W${week}`,
        avgScore: parseFloat((data.scores.reduce((s, v) => s + v, 0) / data.scores.length).toFixed(1)),
        count: data.count,
      }));

    // Outcome distribution
    const outcomeDist = {};
    entries.forEach(e => {
      if (e.outcome) outcomeDist[e.outcome] = (outcomeDist[e.outcome] || 0) + 1;
    });

    // Recent 5 entries for activity feed
    const recentActivity = entries.slice(0, 5);

    return Response.json({
      totalEntries,
      avgQuality,
      flagCount: flags.length,
      outputsSaved,
      qualityByTask,
      taskDistribution,
      weeklyTrend,
      outcomeDist,
      recentActivity,
      flags: flags.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
