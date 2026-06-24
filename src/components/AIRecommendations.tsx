'use client';

import { useEffect, useState } from 'react';

export default function AIRecommendations(props: any) {
  const [recommendation, setRecommendation] = useState('Loading AI recommendations...');

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props),
      });

      const data = await res.json();
      setRecommendation(data.recommendation);
    };

    load();
  }, []);

  return (
    <div className="rounded-xl border shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">
        AI SEO Recommendations
      </h2>

      <pre className="whitespace-pre-wrap text-sm">
        {recommendation}
      </pre>
    </div>
  );
}