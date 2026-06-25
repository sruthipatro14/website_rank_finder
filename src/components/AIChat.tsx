'use client';

import { useState } from 'react';

interface AIChatProps {
  website: string;
  rankings: any[];
  changes: any[];
  scans: any[];
  
}

export default function AIChat({
  website,
  rankings,
  changes,
  scans,
  audit,
}: AIChatProps) {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  async function askAI() {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          website,
          rankings,
          changes,
          scans,
          audit,
        }),
      });

      const data = await response.json();

      setReply(data.reply);
    } catch (error) {
      console.error(error);
      setReply('Failed to get AI response');
    }

    setLoading(false);
  }

  return (
    <div className="rounded-xl border shadow-sm p-6 mt-8">
      <h2 className="text-2xl font-bold mb-4">
         AI SEO Assistant
      </h2>

      <p className="text-gray-500 mb-4">
        Ask questions about this website's SEO performance.
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Why did my rankings drop?"
        className="w-full border rounded-lg p-4 h-32"
      />

      <button
        onClick={askAI}
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Thinking...' : 'Ask AI'}
      </button>

      {reply && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg whitespace-pre-wrap">
          {reply}
        </div>
      )}
    </div>
  );
}