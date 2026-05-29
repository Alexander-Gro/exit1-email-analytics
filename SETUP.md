# Setup

## 1. Create Vercel Postgres

1. Go to https://vercel.com/alexanders-projects-8da7e191/exit1-email-analytics/stores
2. Click **Create Database** → **Postgres**
3. Name it `email-analytics-db`
4. Click **Connect** to link it to this project (all environments)
5. After creating, run: `npx vercel env pull .env.local` to pull the Postgres env vars locally

## 2. Initialize the database

After pulling env vars, run:

```bash
curl -X POST https://exit1-email-analytics.vercel.app/api/init \
  -H "x-api-key: ac0a43c8aec53d936ccc50258052ec568b02d4686284a47f444b50159edba28c"
```

This creates the `campaigns` and `events` tables.

## 3. Connect the Email Builder

In the email builder export flow, add a POST to save campaigns:

```js
const res = await fetch("https://exit1-email-analytics.vercel.app/api/campaigns", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "ac0a43c8aec53d936ccc50258052ec568b02d4686284a47f444b50159edba28c",
  },
  body: JSON.stringify({
    name: "Campaign name",        // required
    subject: "Email subject",     // optional
    html: "<html>...</html>",     // required — raw HTML from builder
    resend_template_id: "abc123", // optional
  }),
});

const { id, instrumented_html } = await res.json();
// Use instrumented_html as the actual template in Resend
// It contains the tracking pixel + wrapped click links
```

## 4. Environment variables

| Variable | Value |
|---|---|
| `ANALYTICS_API_KEY` | `ac0a43c8aec53d936ccc50258052ec568b02d4686284a47f444b50159edba28c` |
| `NEXT_PUBLIC_BASE_URL` | `https://exit1-email-analytics.vercel.app` |

Postgres env vars are auto-injected by Vercel after connecting the database.

## API Reference

| Endpoint | Description |
|---|---|
| `POST /api/campaigns` | Save a campaign, returns `instrumented_html` |
| `GET /api/campaigns` | List all campaigns with open/click counts |
| `GET /api/campaigns/:id` | Campaign detail + stats + top links |
| `GET /api/track/open/:campaignId` | 1x1 tracking pixel (no auth) |
| `GET /api/track/click/:campaignId?url=...` | Click redirect + log (no auth) |
| `POST /api/init` | Create DB tables (run once) |
