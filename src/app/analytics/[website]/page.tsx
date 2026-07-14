import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AIRecommendations from '@/components/AIRecommendations';
import AIChat from '@/components/AIChat';
import RunAuditButton from '@/components/RunAuditButton';
import RankingChanges from '@/components/RankingChanges';

const hasCoreAuditMetrics = (audit: any) =>
  audit.keyword !== null &&
  audit.page_url !== null &&
  audit.internal_links !== null &&
  audit.external_links !== null &&
  audit.missing_alt_images !== null &&
  audit.canonical_url !== null &&
  audit.schema_present !== null &&
  audit.pagespeed_score !== null &&
  audit.seo_score !== null &&
  audit.accessibility_score !== null &&
  audit.lcp !== null &&
  audit.cls !== null;

const latestAuditPerPage = (audits: any[] = []) => {
  const latest = new Map<string, any>();

  audits.forEach((audit) => {
    const key = `${audit.keyword || ''}|${audit.page_url || ''}`;

    if (hasCoreAuditMetrics(audit) && !latest.has(key)) {
      latest.set(key, audit);
    }
  });

  return Array.from(latest.values());
};

export default async function WebsiteAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ website: string }>;
  searchParams: Promise<{ scanId?: string }>;
}) {
  const { website: encodedWebsite } = await params;
  const { scanId } = await searchParams;
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

  // Use the scan from the URL query param, falling back to the most recent scan
  console.log('[analytics] scanId from URL:', scanId, '| typeof:', typeof scanId);
  console.log('[analytics] available scan ids:', scans.map((s) => `${s.id} (${typeof s.id})`));
  const foundScan = scanId ? scans.find((s) => String(s.id) === String(scanId)) : null;
  console.log('[analytics] scans.find result:', foundScan?.id ?? 'NOT FOUND — falling back to scans[0]');
  const activeScan = foundScan ?? scans[0];
  console.log('[analytics] activeScan.id:', activeScan.id, '| using fallback:', !foundScan);
  const previousScan = scans.length > 1 ? scans.find((s) => s.id !== activeScan.id) : null;

  const { data: rankings } = await supabase
    .from('ranking_results')
    .select('*')
    .eq('scan_id', activeScan.id);

  const { data: previousRankings } = previousScan
    ? await supabase
        .from('ranking_results')
        .select('*')
        .eq('scan_id', previousScan.id)
    : { data: [] };

  // Fetch rankings for all scans except the active one for the comparison dropdown
  const previousScans = scans.filter((s) => s.id !== activeScan.id);
  const previousScansWithRankings = await Promise.all(
    previousScans.map(async (scan) => {
      const { data: scanRankings } = await supabase
        .from('ranking_results')
        .select('*')
        .eq('scan_id', scan.id);
      return { ...scan, rankings: scanRankings || [] };
    })
  );

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
    .eq('website', website)
    .order('created_at', { ascending: false });

  const aiAudits = latestAuditPerPage(audits || []);

  const latestAudit =
    aiAudits.length > 0
      ? aiAudits[0]
      : audits && audits.length > 0
      ? audits[0]
      : null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">{website}</h1>

      <p className="text-gray-500 mb-8">
        Website SEO Analytics
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            {scans.map((scan) => {
              const isActive = scan.id === activeScan.id;
              return (
                <tr
                  key={scan.id}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-sky-50 border-l-4 border-l-sky-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="border p-4" colSpan={3}>
                    <Link
                      href={`/analytics/${encodedWebsite}?scanId=${scan.id}`}
                      className="grid grid-cols-3 w-full"
                    >
                      <span className={isActive ? 'font-semibold text-sky-700' : ''}>
                        {new Date(scan.scan_date).toLocaleString()}
                        {isActive && (
                          <span className="ml-2 text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">
                            viewing
                          </span>
                        )}
                      </span>
                      <span className={isActive ? 'font-semibold text-sky-700' : ''}>
                        {scan.country}
                      </span>
                      <span className={isActive ? 'font-semibold text-sky-700' : ''}>
                        {scan.device}
                      </span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previousScans.length > 0 && (
        <RankingChanges
          latestScanRankings={rankings || []}
          latestScanDate={activeScan.scan_date}
          previousScans={previousScansWithRankings}
        />
      )}

      {previousScans.length > 0 && (
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
     {latestAudit && (
  <div className="grid md:grid-cols-3 gap-4 mb-8">
    <div className="relative border rounded-xl p-4">
      <p className="text-gray-500 text-sm mb-1">PageSpeed Score</p>
      <p className="text-3xl font-bold">{latestAudit.pagespeed_score}</p>
      <div className="absolute bottom-2 right-2 group">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[13px] cursor-pointer select-none transition-transform hover:scale-110 hover:bg-gray-200 hover:text-gray-700">ⓘ</span>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 shadow-lg leading-relaxed">
          Overall loading speed of the page measured by Google. Higher is better. Good: 90+.
        </div>
      </div>
    </div>

    <div className="relative border rounded-xl p-4">
      <p className="text-gray-500 text-sm mb-1">SEO Score</p>
      <p className="text-3xl font-bold">{latestAudit.seo_score}</p>
      <div className="absolute bottom-2 right-2 group">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[13px] cursor-pointer select-none transition-transform hover:scale-110 hover:bg-gray-200 hover:text-gray-700">ⓘ</span>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 shadow-lg leading-relaxed">
          Overall SEO health of the page. Covers meta tags, structure and crawlability. Higher is better. Good: 90+.
        </div>
      </div>
    </div>

    <div className="relative border rounded-xl p-4">
      <p className="text-gray-500 text-sm mb-1">Accessibility Score</p>
      <p className="text-3xl font-bold">{latestAudit.accessibility_score}</p>
      <div className="absolute bottom-2 right-2 group">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[13px] cursor-pointer select-none transition-transform hover:scale-110 hover:bg-gray-200 hover:text-gray-700">ⓘ</span>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 shadow-lg leading-relaxed">
          Shows how easy the site is to use for all visitors, including those with disabilities. Higher is better. Good: 90+.
        </div>
      </div>
    </div>

    <div className="relative border rounded-xl p-4">
      <p className="text-gray-500 text-sm mb-1">Internal Links</p>
      <p className="text-3xl font-bold">{latestAudit.internal_links}</p>
      <div className="absolute bottom-2 right-2 group">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[13px] cursor-pointer select-none transition-transform hover:scale-110 hover:bg-gray-200 hover:text-gray-700">ⓘ</span>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 shadow-lg leading-relaxed">
          Number of links pointing to other pages on your own site. More internal links help Google discover and index your content.
        </div>
      </div>
    </div>

    <div className="relative border rounded-xl p-4">
      <p className="text-gray-500 text-sm mb-1">Missing Alt Images</p>
      <p className="text-3xl font-bold">{latestAudit.missing_alt_images}</p>
      <div className="absolute bottom-2 right-2 group">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[13px] cursor-pointer select-none transition-transform hover:scale-110 hover:bg-gray-200 hover:text-gray-700">ⓘ</span>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 shadow-lg leading-relaxed">
          Images without alt text. Search engines use alt text to understand images. Lower is better. Good: 0.
        </div>
      </div>
    </div>

    <div className="relative border rounded-xl p-4">
      <p className="text-gray-500 text-sm mb-1">LCP</p>
      <p className="text-3xl font-bold">
        {latestAudit.lcp ? `${(latestAudit.lcp / 1000).toFixed(2)}s` : 'N/A'}
      </p>
      <div className="absolute bottom-2 right-2 group">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[13px] cursor-pointer select-none transition-transform hover:scale-110 hover:bg-gray-200 hover:text-gray-700">ⓘ</span>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-2 shadow-lg leading-relaxed">
          Largest Contentful Paint — measures how quickly the main content loads. Lower is better. Good: under 2.5s.
        </div>
      </div>
    </div>
  </div>
)}
      <div className="rounded-xl border shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">
          SEO Recommendations
        </h2>

        
<AIRecommendations
  website={website}
  rankings={rankings || []}
  changes={changes}
  audits={aiAudits}
  top10={top10}
  top20={top20}
  avgRank={avgRank}
/>
        
      </div>

      <div className="mt-8">
      <AIChat
        website={website}
        rankings={rankings ?? []}
        changes={changes}
        scans={scans}
        audits={aiAudits}
      />
    </div>
    </div>
  );
}
