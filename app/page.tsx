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
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Email Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">
              Open &amp; click tracking for all campaigns
            </p>
          </div>
          <a
            href="https://github.com/Alexander-Gro/exit1---email-builder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Email Builder
          </a>
        </div>

        <AnalyticsDashboard />

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border border-white/10 rounded-xl">
              <p className="text-base">No campaigns yet.</p>
              <p className="text-sm mt-2">
                Export an email from the builder to create your first campaign.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Campaign</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Subject</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Opens</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Clicks</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-gray-400">{c.subject ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.opens}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.clicks}</td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
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
