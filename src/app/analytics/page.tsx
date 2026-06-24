import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default async function AnalyticsPage() {
  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .order('scan_date', { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">
          Analytics
        </h1>
        <p className="text-red-500 mt-4">
          Failed to load analytics.
        </p>
      </div>
    );
  }

  const websitesMap = new Map();

  scans?.forEach((scan) => {
    if (!websitesMap.has(scan.website)) {
      websitesMap.set(scan.website, {
        website: scan.website,
        totalScans: 0,
        latestScan: scan.scan_date,
      });
    }

    websitesMap.get(scan.website).totalScans++;
  });

  const websites = Array.from(websitesMap.values());

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">
        Analytics Dashboard
      </h1>

      <p className="text-gray-500 mb-8">
        Select a website to view ranking analytics.
      </p>

      <div className="grid gap-6">
        {websites.map((site) => (
          <Link
            key={site.website}
            href={`/analytics/${encodeURIComponent(site.website)}`}
            className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-blue-600">
                  {site.website}
                </h2>

                <p className="text-gray-500 mt-2">
                  Total Scans: {site.totalScans}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Latest Scan
                </p>

                <p className="font-medium">
                  {new Date(
                    site.latestScan
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}