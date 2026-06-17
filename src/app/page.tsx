'use client';

import { useState } from 'react';
import RankTable from './RankTable';
import type { RankResult, CountryCode, DeviceType } from '@/types';

interface ApiResponse {
  results?: RankResult[];
  error?: string;
  debug?: {
    serpApiKeyPresent?: boolean;
    serpStatuses?: Record<string, number | null>;
  };
}

const COUNTRY_OPTIONS = [
  { label: 'India', value: 'in' },
  { label: 'United States', value: 'us' },
  { label: 'United Kingdom', value: 'uk' },
  { label: 'Canada', value: 'ca' },
  { label: 'Australia', value: 'au' },
];

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('google');
  const [country, setCountry] = useState<CountryCode>('in');
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [searchedCountry, setSearchedCountry] = useState<CountryCode | null>(null);
  const [searchedDevice, setSearchedDevice] = useState<DeviceType | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResults([]);

    if (!url.trim()) {
      setError('Website URL is required.');
      return;
    }

    if (!keywords.trim()) {
      setError('Please enter one or more keywords.');
      return;
    }

    setLoading(true);
    setSearchedCountry(country);
    setSearchedDevice(device);

    try {
      const targetDomain = url.trim();
      const keywordList = keywords
        .split(/\r?\n/)
        .map((k) => k.trim())
        .filter(Boolean);

      console.debug('[client] SERP target domain:', targetDomain);
      console.debug('[client] Keywords:', keywordList);
      const response = await fetch('/api/check-rank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          keywords: keywords.trim(),
          engine,
          country,
          device,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      // Surface server-side debug info to the client console for temporary troubleshooting
      if (data.debug) {
        console.debug('[client] server debug serpApiKeyPresent:', data.debug.serpApiKeyPresent);
        console.debug('[client] server debug serpStatuses:', data.debug.serpStatuses);
      }

      if (!response.ok) {
        setError(data.error || 'An unknown error occurred while checking rankings.');
        setLoading(false);
        return;
      }

      setResults(data.results || []);
    } catch (err) {
      console.error('[client] Network or unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Network error while checking rankings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-10 shadow-xl shadow-slate-200/50 backdrop-blur-lg">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              SERP Rank Tracker
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Monitor Google rankings for your website keywords.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Enter your website URL and keywords to compare your domain against the first 100 organic results. This lightweight dashboard uses a server-side API route for ranking checks.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/30"
          >
            <div className="space-y-6">
              <div>
                <label htmlFor="engine" className="mb-3 block text-sm font-semibold text-slate-700">
                  Search Engine
                </label>
                <select
                  id="engine"
                  value={engine}
                  onChange={(event) => setEngine(event.target.value)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                >
                  <option value="google">Google</option>
                  <option value="bing">Bing</option>
                </select>
              </div>

              <div>
                <label htmlFor="country" className="mb-3 block text-sm font-semibold text-slate-700">
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value as CountryCode)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="device" className="mb-3 block text-sm font-semibold text-slate-700">
                  Device
                </label>
                <select
                  id="device"
                  value={device}
                  onChange={(event) => setDevice(event.target.value as DeviceType)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              <div>
                <label htmlFor="website" className="mb-3 block text-sm font-semibold text-slate-700">
                  Website URL
                </label>
                <input
                  id="website"
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="example.com"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="keywords" className="mb-3 block text-sm font-semibold text-slate-700">
                  Keywords (one per line)
                </label>
                <textarea
                  id="keywords"
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  rows={8}
                  placeholder={"seo tools\nkeyword research\nbacklink checker"}
                  className="min-h-[220px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {error ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Checking rankings...' : 'Check Rankings'}
              </button>
            </div>
          </form>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/30">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">How it works</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Server-side ranking checks</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  The form submits to a Next.js API route that fetches SERP results, normalizes domains, and returns the exact ranking position for each keyword. Set your API key in <code className="rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-700">SERP_API_KEY</code>.
                </p>
              </div>

              <div className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Rank found</p>
                  <p className="mt-1 text-sm text-slate-600">Green badge indicates a matching domain within results.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Not found</p>
                  <p className="mt-1 text-sm text-slate-600">Red badge indicates the domain was not present in the first 100 results.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {results.length > 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/30">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Results</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Keyword ranking overview
                  {searchedCountry && (
                    <span className="ml-2 text-slate-500">
                      ({COUNTRY_OPTIONS.find(c => c.value === searchedCountry)?.label} • {searchedDevice})
                    </span>
                  )}
                </h2>
              </div>
              <p className="text-sm text-slate-600">Showing {results.length} keyword{results.length > 1 ? 's' : ''}.</p>
            </div>
            <RankTable results={results} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
