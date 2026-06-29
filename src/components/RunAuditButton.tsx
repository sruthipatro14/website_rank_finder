'use client';

export default function RunAuditButton({
  website,
  rankings,
}: {
  website: string;
  rankings: any[];
}) {
  async function runAudit() {
    for (const ranking of rankings) {

console.log(
  'AUDITING:',
  ranking.keyword,
  ranking.ranking_url
);

if (
  !ranking.ranking_url ||
  ranking.ranking_url === '-' ||
  !ranking.ranking_url.startsWith('http')
) {
  console.log(
    'SKIPPING INVALID URL:',
    ranking.keyword,
    ranking.ranking_url
  );
  continue;
}
      await fetch('/api/website-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website,
          keyword: ranking.keyword,
          pageUrl: ranking.ranking_url,
        }),
      });
    }

    alert('All ranking pages audited');
  }

  return (
    <button
      onClick={runAudit}
      className="bg-green-600 text-white px-4 py-2 rounded-lg"
    >
      Run Website Audit
    </button>
  );
}