import { supabase } from '@/lib/supabase';
import AIRecommendations from '@/components/AIRecommendations';
import AIChat from '@/components/AIChat';
import RunAuditButton from '@/components/RunAuditButton';

export default async function WebsiteAnalyticsPage({
  params,
}: {
  params: Promise<{ website: string }>;
}) {
  const { website: encodedWebsite } = await params;
  const website = decodeURIComponent(encodedWebsite);

  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('website', website)
    .order('scan_date', { ascending: false });

  if (!scans || scans.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">No data found</h1>
      </div>
    );
  }

  const latestScan = scans[0];
  const previousScan = scans.length > 1 ? scans[1] : null;

  const { data: rankings } = await supabase
    .from('ranking_results')
    .select('*')
    .eq('scan_id', latestScan.id);

  const { data: previousRankings } = previousScan
    ? await supabase
        .from('ranking_results')
        .select('*')
        .eq('scan_id', previousScan.id)
    : { data: [] };

  const totalKeywords = rankings?.length || 0;

  const top10 =
    rankings?.filter((r) => {
      const rank = Number(r.rank);
      return !isNaN(rank) && rank <= 10;
    }).length || 0;

  const top20 =
    rankings?.filter((r) => {
      const rank = Number(r.rank);
      return !isNaN(rank) && rank <= 20;
    }).length || 0;

  const avgRank =
    rankings && rankings.length > 0
      ? (
          rankings.reduce((sum, r) => {
            const rank = Number(r.rank);
            return sum + (isNaN(rank) ? 100 : rank);
          }, 0) / rankings.length
        ).toFixed(1)
      : '0';

  const changes =
    rankings?.map((current) => {
      const previous = previousRankings?.find(
        (p) => p.keyword === current.keyword
      );

      const oldRank = Number(previous?.rank);
      const newRank = Number(current.rank);

      const safeOldRank = isNaN(oldRank) ? 100 : oldRank;
      const safeNewRank = isNaN(newRank) ? 100 : newRank;

      return {
        keyword: current.keyword,
        oldRank: safeOldRank,
        newRank: safeNewRank,
        change: safeOldRank - safeNewRank,
      };
    }) || [];

  const winners = [...changes]
    .filter((item) => item.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 10);

  const losers = [...changes]
    .filter((item) => item.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, 10);

  const { data: audits } = await supabase
    .from('website_audits')
    .select('*')
    .eq('website', website);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">{website}</h1>

      <p className="text-gray-500 mb-8">
        Website SEO Analytics
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Scans</p>
          <p className="text-3xl font-bold">{scans.length}</p>
        </div>

        <div className="rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Keywords</p>
          <p className="text-3xl font-bold">{totalKeywords}</p>
        </div>

        <div className="rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Top 10 Rankings</p>
          <p className="text-3xl font-bold text-green-600">{top10}</p>
        </div>

        <div className="rounded-xl border p-4 shadow-sm">
          <p className="text-sm text-gray-500">Average Rank</p>
          <p className="text-3xl font-bold">{avgRank}</p>
        </div>
      </div>

      <div className="rounded-xl border shadow-sm mb-8 overflow-hidden">
        <div className="bg-black text-white p-4">
          <h2 className="text-xl font-bold">Scan History</h2>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-4 text-left">Date</th>
              <th className="border p-4 text-left">Country</th>
              <th className="border p-4 text-left">Device</th>
            </tr>
          </thead>

          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="hover:bg-gray-50">
                <td className="border p-4">
                  {new Date(scan.scan_date).toLocaleString()}
                </td>
                <td className="border p-4">{scan.country}</td>
                <td className="border p-4">{scan.device}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previousScan && (
        <div className="rounded-xl border shadow-sm mb-8 overflow-hidden">
          <div className="bg-black text-white p-4">
            <h2 className="text-xl font-bold">
              Ranking Changes
            </h2>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-4 text-left">Keyword</th>
                <th className="border p-4 text-left">Old Rank</th>
                <th className="border p-4 text-left">New Rank</th>
                <th className="border p-4 text-left">Change</th>
              </tr>
            </thead>

            <tbody>
              {changes.map((item) => (
                <tr key={item.keyword}>
                  <td className="border p-4">{item.keyword}</td>
                  <td className="border p-4">{item.oldRank}</td>
                  <td className="border p-4">{item.newRank}</td>
                  <td
                    className={`border p-4 font-bold ${
                      item.change > 0
                        ? 'text-green-600'
                        : item.change < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.change > 0
                      ? `+${item.change}`
                      : item.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previousScan && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-green-600">
              Top Winners
            </h2>

            {winners.map((item) => (
              <div
                key={item.keyword}
                className="flex justify-between border-b py-2"
              >
                <span>{item.keyword}</span>
                <span className="font-bold text-green-600">
                  +{item.change}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Top Losers
            </h2>

            {losers.map((item) => (
              <div
                key={item.keyword}
                className="flex justify-between border-b py-2"
              >
                <span>{item.keyword}</span>
                <span className="font-bold text-red-600">
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mb-8">
     <RunAuditButton
    website={website}
    rankings={rankings || []}
     />
     </div>
      <div className="rounded-xl border shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">
          SEO Recommendations
        </h2>

        
          <AIRecommendations
            website={website}
            top10={top10}
            top20={top20}
            avgRank={avgRank}
            changes={changes}
             audits={audits || []}
          />
        
      </div>

      <div className="mt-8">
      <AIChat
        website={website}
        rankings={rankings}
        changes={changes}
        scans={scans}
        audits={audits || []}
      />
    </div>
    </div>
  );
}