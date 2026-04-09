# Joanie AI Ops Monitor — Live Dashboard

A Next.js dashboard that reads from your Notion activity log and displays live metrics, quality trends, flags, and workflow insights.

## What it shows
- Total interactions, average quality score, outputs saved, open flags
- Quality score trend by week
- Task type breakdown (donut chart)
- Quality score by task type (bar chart)
- Recent activity feed with scores
- Flags queue (sessions scoring below 6)
- Outcome distribution

## Tech stack
- Next.js 14 (App Router)
- Notion API (@notionhq/client)
- Recharts for data visualization
- Deployed on Vercel
- Auto-refreshes every 60 seconds

---

## Setup & Deployment

### Step 1 — Push to GitHub
1. Create a new GitHub repository called `joanie-dashboard`
2. Push this project to it:
```bash
git init
git add .
git commit -m "Initial dashboard"
git remote add origin https://github.com/YOUR_USERNAME/joanie-dashboard.git
git push -u origin main
```

### Step 2 — Deploy to Vercel
1. Go to vercel.com and click "Add New Project"
2. Import your `joanie-dashboard` GitHub repository
3. Vercel will auto-detect Next.js — click Deploy

### Step 3 — Add environment variables in Vercel
After deployment, go to your project in Vercel:
1. Click Settings → Environment Variables
2. Add these two variables:

| Name | Value |
|------|-------|
| `NOTION_API_KEY` | Your secret token (starts with secret_...) |
| `NOTION_DATABASE_ID` | 33dcb15b3901802f92a6c34f14d1fd80 |

3. Click Save, then go to Deployments and click "Redeploy"

### Step 4 — Connect Notion integration to your database
Make sure your "Joanie AI Ops Monitor" integration is connected to the database:
1. Open Joanie AI Activity Log in Notion
2. Click ··· menu → Connections → Joanie AI Ops Monitor → Connect

---

## Local development
```bash
npm install
cp .env.local.example .env.local
# Edit .env.local and add your real NOTION_API_KEY
npm run dev
# Open http://localhost:3000
```

---

## Auto-refresh
The dashboard polls Notion every 60 seconds automatically. You can also click the Refresh button manually.

---

## Adding more data
The dashboard gets richer as your team logs more entries. After 20+ entries you'll start seeing meaningful trends. After 50+ entries the weekly trend line becomes reliable.
