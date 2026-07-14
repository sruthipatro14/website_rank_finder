'use client';

import { useMemo, useState } from 'react';

interface RankingResult {
  keyword: string;
  rank: string | number;
  scan_id: string;
}

interface Scan {
  id: string;
  scan_date: string;
  country: string;
  device: string;
}

interface ScanWithRankings extends Scan {
  rankings: RankingResult[];
}

interface Props {
  latestScanRankings: RankingResult[];
  latestScanDate: string;
  previousScans: ScanWithRankings[];
}

const formatScanDate = (dateStr: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateStr));

export default function RankingChanges({ latestScanRankings, latestScanDate, previousScans }: Props) {
  // Default to the most recent previous scan (index 0) — preserves existing behaviour
  const [selectedScanId, setSelectedScanId] = useState<string>(
    previousScans.length > 0 ? previousScans[0].id : ''
  );

  // Derive selectedScan strictly from selectedScanId — no silent fallback
  const selectedScan = useMemo(
    () => previousScans.find((s) => s.id === selectedScanId) ?? null,
    [previousScans, selectedScanId]
  );

  // Recompute changes whenever selectedScan or latestScanRankings changes
  const changes = useMemo(
    () => {
      console.log("Selected Scan:", selectedScanId);
      console.log("Selected Rankings Count:", selectedScan?.rankings?.length);
      console.log("Current Rankings Count:", latestScanRankings.length);

      return latestScanRankings.map((current) => {
        const previous = selectedScan?.rankings.find(
          (p) => p.keyword?.trim().toLowerCase() === current.keyword?.trim().toLowerCase()
        );

        const oldRank = Number(previous?.rank);
        const newRank = Number(current.rank);

        const safeOldRank = isNaN(oldRank) || !previous ? 100 : oldRank;
        const safeNewRank = isNaN(newRank) ? 100 : newRank;

        console.log({
          keyword: current.keyword,
          keywordInSelectedScan: previous?.keyword ?? 'NOT FOUND',
          oldRank: previous?.rank ?? 'none',
          newRank: current.rank,
        });

        return {
          keyword: current.keyword,
          oldRank: safeOldRank,
          newRank: safeNewRank,
          change: safeOldRank - safeNewRank,
        };
      });
    },
    [latestScanRankings, selectedScan]
  );

  return (
    <div className="rounded-xl border shadow-sm mb-8 overflow-hidden">
      <div className="bg-black text-white p-4">
        <h2 className="text-xl font-bold">Ranking Changes</h2>
      </div>

      {/* Compare Against Scan dropdown — moved into table header */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-4 text-left">Keyword</th>
            <th className="border p-4 text-left">
              <select
                id="compare-scan"
                value={selectedScanId}
                onChange={(e) => setSelectedScanId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 w-full"
              >
                {previousScans.map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {formatScanDate(scan.scan_date)} — {scan.country} / {scan.device}
                  </option>
                ))}
              </select>
            </th>
            <th className="border p-4 text-left text-sm font-semibold">
              {formatScanDate(latestScanDate)}
            </th>
            <th className="border p-4 text-left">Change</th>
          </tr>
        </thead>

        <tbody>
          {changes.map((item, index) => (
            <tr key={`${item.keyword}-${index}`}>
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
                {item.change > 0 ? `+${item.change}` : item.change}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
