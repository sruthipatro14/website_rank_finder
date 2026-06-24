import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function HistoryPage() {
  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .order('scan_date', { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">
          Error loading scans
        </h1>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Scan History
      </h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full border-collapse">
          <thead className="bg-black text-white">
            <tr>
              <th className="border px-6 py-4 text-left font-semibold">
                Website
              </th>

              <th className="border px-6 py-4 text-left font-semibold">
                Country
              </th>

              <th className="border px-6 py-4 text-left font-semibold">
                Device
              </th>

              <th className="border px-6 py-4 text-left font-semibold">
                Date
              </th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {scans?.map((scan) => (
              <tr
                key={scan.id}
                className="hover:bg-gray-50"
              >
                <td className="border px-6 py-4">
                  <Link
                    href={`/analytics/${encodeURIComponent(
                      scan.website
                    )}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {scan.website}
                  </Link>
                </td>

                <td className="border px-6 py-4">
                  {scan.country}
                </td>

                <td className="border px-6 py-4">
                  {scan.device}
                </td>

                <td className="border px-6 py-4">
                  {new Date(
                    scan.scan_date
                  ).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}