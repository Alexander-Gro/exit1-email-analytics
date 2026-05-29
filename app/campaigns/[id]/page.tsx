import Link from "next/link";
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";

async function getCampaign(id: string) {
  try {
    const [campaignRes, statsRes, linksRes] = await Promise.all([
      sql`SELECT id, name, subject, resend_template_id, created_at FROM campaigns WHERE id = ${id}::uuid`,
      sql`
        SELECT
          COUNT(CASE WHEN type = 'open' THEN 1 END)::int AS total_opens,
          COUNT(CASE WHEN type = 'click' THEN 1 END)::int AS total_clicks,
          COUNT(DISTINCT CASE WHEN type = 'open' THEN ip END)::int AS unique_opens,
          COUNT(DISTINCT CASE WHEN type = 'click' THEN ip END)::int AS unique_clicks
        FROM events WHERE campaign_id = ${id}::uuid
      `,
      sql`
        SELECT url, COUNT(*)::int AS count
        FROM events
        WHERE campaign_id = ${id}::uuid AND type = 'click'
        GROUP BY url ORDER BY count DESC LIMIT 20
      `,
    ]);

    if (!campaignRes.rows.length) return null;
    return { campaign: campaignRes.rows[0], stats: statsRes.rows[0], links: linksRes.rows };
  } catch {
    return null;
  }
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCampaign(id);
  if (!data) notFound();

  const { campaign, stats, links } = data;

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← All campaigns
          </Link>
          <h1 className="text-xl font-semibold mt-4">{campaign.name}</h1>
          {campaign.subject && (
            <p className="text-muted-foreground text-sm mt-1">{campaign.subject}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(campaign.created_at).toLocaleString()}
            {campaign.resend_template_id && (
              <span className="ml-3 font-mono">{campaign.resend_template_id}</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          {[
            { label: "Total Opens",   value: stats.total_opens   },
            { label: "Unique Opens",  value: stats.unique_opens  },
            { label: "Total Clicks",  value: stats.total_clicks  },
            { label: "Unique Clicks", value: stats.unique_clicks },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-semibold tabular-nums mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {links.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Top Links</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">URL</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-2.5 truncate max-w-xs">
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 hover:underline transition-colors"
                        >
                          {l.url}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{l.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
