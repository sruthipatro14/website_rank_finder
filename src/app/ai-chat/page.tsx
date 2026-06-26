'use client';

import { useState } from 'react';

export default function AIChatPage() {
  const [website, setWebsite] = useState('');
  const [top10, setTop10] = useState('');
  const [avgRank, setAvgRank] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<
    {
      role: string;
      content: string;
    }[]
  >([]);

  async function sendMessage() {
    if (!message) return;

    setLoading(true);

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
  audits,
}),
    });

    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: message,
      },
      {
        role: 'assistant',
        content: data.reply,
      },
    ]);

    setMessage('');
    setLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">
        AI SEO Assistant
      </h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Website URL"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="border rounded-lg p-3"
        />

        <input
          type="text"
          placeholder="Top 10 Keywords"
          value={top10}
          onChange={(e) => setTop10(e.target.value)}
          className="border rounded-lg p-3"
        />

        <input
          type="text"
          placeholder="Average Rank"
          value={avgRank}
          onChange={(e) => setAvgRank(e.target.value)}
          className="border rounded-lg p-3"
        />
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask an SEO question..."
        className="w-full border rounded-lg p-4 h-32"
      />

      <button
        onClick={sendMessage}
        className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Ask AI
      </button>

      {loading && (
        <p className="mt-6 text-gray-500">
          Thinking...
        </p>
      )}

      <div className="mt-8 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100'
                : 'bg-gray-100'
            }`}
          >
            <strong>
              {msg.role === 'user'
                ? 'You'
                : 'AI'}
              :
            </strong>{' '}
            {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}