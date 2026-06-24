import { supabase } from '@/lib/supabase';

export default async function ScanDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('ranking_results')
    .select('*')
    .eq('scan_id', id)
    .order('keyword');

  if (error) {
    return <div>Error loading rankings</div>;
  }

  return (
  <div className="p-8">
    <div className="mb-6">
      <h1 className="text-3xl font-bold">
        Scan #{id}
      </h1>
      <p className="text-gray-500 mt-1">
        Keyword ranking results
      </p>
    </div>

    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-4 text-left font-semibold">
              Keyword
            </th>
            <th className="px-6 py-4 text-left font-semibold">
              Rank
            </th>
            <th className="px-6 py-4 text-left font-semibold">
              URL
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 bg-white">
          {data?.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4 font-medium">
                {row.keyword}
              </td>

              <td className="px-6 py-4">
                <span className="rounded-lg bg-blue-100 px-3 py-1 text-blue-700 font-semibold">
                  {row.rank}
                </span>
              </td>

              <td className="px-6 py-4 max-w-md truncate">
                {row.ranking_url}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
}