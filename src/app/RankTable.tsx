import type { RankResult } from '@/types';

interface RankTableProps {
  results: RankResult[];
}

export default function RankTable({ results }: RankTableProps) {
  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full border border-gray-200">
        <thead>
          <tr>
            <th className="border p-2">Keyword</th>
            <th className="border p-2">Rank</th>
            <th className="border p-2">Page</th>
            <th className="border p-2">Device</th>
            <th className="border p-2">Position</th>
            <th className="border p-2">Ranking URL</th>
          </tr>
        </thead>

        <tbody>
          {results.map((result, index) => (
            <tr key={`${result.keyword}-${index}`}>
              <td className="border p-2">{result.keyword}</td>
              <td className="border p-2">{result.rank}</td>
              <td className="border p-2">{result.page}</td>
              <td className="border p-2 capitalize">{result.device}</td>
              <td className="border p-2">{result.positionOnPage}</td>
              <td className="border p-2">
                {result.rankingUrl !== '-' ? (
                  <a
                    href={result.rankingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.rankingUrl}
                  </a>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}