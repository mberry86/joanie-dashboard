'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#185FA5', '#3B6D11', '#BA7517', '#888780', '#A32D2D', '#0C447C'];

function MetricCard({ label, value, sub, subColor }) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 10,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: subColor || '#888', marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

function ScoreBar({ label, score, count }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? '#3B6D11' : score >= 6 ? '#185FA5' : '#BA7517';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: '#555', width: 110, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: 6, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', width: 28, textAlign: 'right' }}>{score}</span>
      <span style={{ fontSize: 11, color: '#aaa', width: 32 }}>({count})</span>
    </div>
  );
}

function FlagItem({ entry }) {
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '0.5px solid #eee',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, background: '#FCEBEB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, flexShrink: 0,
      }}>⚑</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
          {entry.taskType} · Score {entry.qualityScore}/10
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          {entry.projectContext || 'No context'} · {entry.date}
        </div>
        {entry.whatToImprove && (
          <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 3 }}>
            {entry.whatToImprove}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ entry }) {
  const scoreColor = entry.qualityScore >= 8 ? '#3B6D11' : entry.qualityScore >= 6 ? '#185FA5' : '#BA7517';
  const scoreBg = entry.qualityScore >= 8 ? '#EAF3DE' : entry.qualityScore >= 6 ? '#E6F1FB' : '#FAEEDA';
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '0.5px solid #eee',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, background: scoreBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: scoreColor, flexShrink: 0,
      }}>{entry.qualityScore || '—'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
          {entry.taskType} {entry.projectContext ? `· ${entry.projectContext}` : ''}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          {entry.teamMember} · {entry.date} · {entry.timeInvested}min
        </div>
        {entry.whatWorkedWell && (
          <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
            {entry.whatWorkedWell}
          </div>
        )}
      </div>
      {entry.outputSaved && (
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: '#EAF3DE', color: '#3B6D11', flexShrink: 0,
        }}>Saved</span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/notion');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#888' }}>
      Loading Joanie AI Activity Log...
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: '#A32D2D', fontWeight: 600 }}>Could not connect to Notion</div>
      <div style={{ color: '#888', fontSize: 13 }}>{error}</div>
      <div style={{ color: '#888', fontSize: 13 }}>Check that NOTION_API_KEY and NOTION_DATABASE_ID are set in Vercel.</div>
    </div>
  );

  const card = {
    background: '#fff',
    border: '0.5px solid #e8e8e8',
    borderRadius: 12,
    padding: '20px 22px',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '0 0 60px' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e8e8e8', padding: '0 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16 }}>◎</span>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Joanie AI Ops Monitor</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Live activity dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3B6D11' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B6D11', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Live · updated {lastUpdated}
            </div>
            <button onClick={fetchData} style={{
              fontSize: 12, padding: '6px 14px', border: '0.5px solid #ddd',
              borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#555',
            }}>Refresh</button>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 0' }}>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
          <MetricCard label="Total interactions" value={data.totalEntries} sub="All time" />
          <MetricCard
            label="Avg quality score"
            value={data.avgQuality || '—'}
            sub={data.avgQuality >= 8 ? '↑ Strong performance' : data.avgQuality >= 6 ? '→ Adequate' : '↓ Needs attention'}
            subColor={data.avgQuality >= 8 ? '#3B6D11' : data.avgQuality >= 6 ? '#185FA5' : '#A32D2D'}
          />
          <MetricCard label="Outputs saved" value={data.outputsSaved} sub={`${data.totalEntries > 0 ? Math.round((data.outputsSaved / data.totalEntries) * 100) : 0}% save rate`} />
          <MetricCard
            label="Open flags"
            value={data.flagCount}
            sub={data.flagCount > 0 ? 'Scores below 6 — review needed' : 'No flags this period'}
            subColor={data.flagCount > 0 ? '#A32D2D' : '#3B6D11'}
          />
        </div>

        {/* Row 2: Weekly trend + Task distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 16, marginBottom: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Quality score trend</div>
            {data.weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#aaa' }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#aaa' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #eee' }} />
                  <Line type="monotone" dataKey="avgScore" stroke="#185FA5" strokeWidth={2} dot={{ r: 3, fill: '#185FA5' }} name="Avg score" />
                  <Line type="monotone" dataKey="count" stroke="#B5D4F4" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Sessions" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>
                Log more entries to see trends
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Task type breakdown</div>
            {data.taskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.taskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name">
                    {data.taskDistribution.map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #eee' }} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>
                No task data yet
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Quality by task + Activity feed + Flags */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginBottom: 16 }}>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Quality by task type</div>
            {data.qualityByTask.length > 0 ? (
              data.qualityByTask.map((item) => (
                <ScoreBar key={item.type} label={item.type} score={item.avg} count={item.count} />
              ))
            ) : (
              <div style={{ color: '#ccc', fontSize: 13 }}>No scored entries yet</div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recent activity</div>
            {data.recentActivity.length > 0 ? (
              data.recentActivity.map((entry) => <ActivityItem key={entry.id} entry={entry} />)
            ) : (
              <div style={{ color: '#ccc', fontSize: 13 }}>No entries yet — log your first session</div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Flags · scores below 6
              {data.flagCount > 0 && <span style={{ marginLeft: 8, background: '#FCEBEB', color: '#A32D2D', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{data.flagCount} open</span>}
            </div>
            {data.flags.length > 0 ? (
              data.flags.map((entry) => <FlagItem key={entry.id} entry={entry} />)
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: '#ccc', fontSize: 13, gap: 8 }}>
                <span style={{ fontSize: 24 }}>✓</span>
                No flags — all scores above 6
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Outcome distribution bar chart */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Outcome distribution</div>
          {Object.keys(data.outcomeDist).length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={Object.entries(data.outcomeDist).map(([name, value]) => ({ name, value }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#aaa' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#555' }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #eee' }} />
                <Bar dataKey="value" fill="#185FA5" radius={[0, 4, 4, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>
              No outcome data yet
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
