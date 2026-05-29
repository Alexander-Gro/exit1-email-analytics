import Link from "next/link";
import { sql } from "@/lib/db";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";

async function getCampaigns() {
  try {
    const result = await sql`
      SELECT
        c.id, c.name, c.subject, c.created_at,
        COUNT(DISTINCT CASE WHEN e.type = 'open' THEN e.id END)::int AS opens,
        COUNT(DISTINCT CASE WHEN e.type = 'click' THEN e.id END)::int AS clicks
      FROM campaigns c
      LEFT JOIN events e ON e.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return result.rows;
  } catch {
    return [];
  }
}

export default async function Home() {
  const campaigns = await getCampaigns();

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">exit1.dev</p>
            <h1 className="text-xl font-semibold tracking-tight">Email Analytics</h1>
          </div>
          <a
            href="https://github.com/Alexander-Gro/exit1---email-builder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Email Builder
          </a>
        </div>

        <AnalyticsDashboard />

        {/* Campaigns table */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold mb-3">Campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-border rounded-lg">
              <p className="text-sm">No campaigns yet.</p>
              <p className="text-xs mt-1">Export an email from the builder to get started.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Campaign</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Opens</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Clicks</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-sm">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{c.subject ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm">{c.opens}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm">{c.clicks}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-sm">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
