'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import * as XLSX from 'xlsx';
import RankTable from './RankTable';
import type { RankResult, CountryCode, DeviceType } from '@/types';
import Link from 'next/link';
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
  { label: 'United Arab Emirates', value: 'ae' },
  { label: 'Singapore', value: 'sg' },
  { label: 'Saudi Arabia', value: 'sa' },
  { label: 'Qatar', value: 'qa' },
  { label: 'Kuwait', value: 'kw' },
  { label: 'Oman', value: 'om' },
  { label: 'Bahrain', value: 'bh' },
  { label: 'Germany', value: 'de' },
  { label: 'France', value: 'fr' },
  { label: 'Spain', value: 'es' },
  { label: 'Italy', value: 'it' },
  { label: 'Netherlands', value: 'nl' },
  { label: 'South Africa', value: 'za' },
  { label: 'New Zealand', value: 'nz' },
];

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

type ImportCellValue = string | number | boolean | Date | null | undefined;

interface ImportStats {
  totalRows: number;
  importedKeywords: number;
  skippedRows: number;
}

interface ParsedImportSheet {
  fileName: string;
  headers: string[];
  rows: ImportCellValue[][];
  totalRows: number;
}

const getImportCellText = (value: ImportCellValue): string => {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  return value === null || value === undefined ? '' : String(value).trim();
};

const getColumnLabel = (value: ImportCellValue, index: number): string => {
  const label = getImportCellText(value);
  return label || `Column ${index + 1}`;
};

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<RankResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('google');
  const [searchedEngine, setSearchedEngine] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryCode>('in');
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [searchedCountry, setSearchedCountry] = useState<CountryCode | null>(null);
  const [searchedDevice, setSearchedDevice] = useState<DeviceType | null>(null);
  const [error, setError] = useState('');
  const [importSheet, setImportSheet] = useState<ParsedImportSheet | null>(null);
  const [selectedImportColumn, setSelectedImportColumn] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [location, setLocation] = useState('');

  const selectedColumnIndex = selectedImportColumn === '' ? -1 : Number(selectedImportColumn);

  const selectedColumnSamples = useMemo(() => {
    if (!importSheet || selectedColumnIndex < 0) {
      return [];
    }

    return importSheet.rows
      .map((row) => getImportCellText(row[selectedColumnIndex]))
      .filter(Boolean)
      .slice(0, 5);
  }, [importSheet, selectedColumnIndex]);

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setImportError('');
    setImportStats(null);
    setImportSheet(null);
    setSelectedImportColumn('');

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = new Set(['xlsx', 'xls', 'csv']);

    if (!extension || !allowedExtensions.has(extension)) {
      setImportError('Please upload a .xlsx, .xls, or .csv file.');
      event.target.value = '';
      return;
    }

    if (file.size >= MAX_IMPORT_FILE_SIZE) {
      setImportError('Please upload a file smaller than 10 MB.');
      event.target.value = '';
      return;
    }

    setImportLoading(true);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: 'array',
        cellDates: true,
      });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setImportError('No sheets were found in this file.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const sheetRows = XLSX.utils.sheet_to_json<ImportCellValue[]>(worksheet, {
        header: 1,
        blankrows: false,
        defval: '',
      });
      const [headerRow, ...dataRows] = sheetRows;

      if (!headerRow || headerRow.length === 0) {
        setImportError('No column headers were found in the first row.');
        return;
      }

      const columnCount = Math.max(
        headerRow.length,
        ...dataRows.map((row) => row.length),
      );
      const headers = Array.from({ length: columnCount }, (_, index) => getColumnLabel(headerRow[index], index));

      setImportSheet({
        fileName: file.name,
        headers,
        rows: dataRows,
        totalRows: dataRows.length,
      });
    } catch (err) {
      console.error('[client] Import parse error:', err);
      setImportError('Could not read this file. Please check the format and try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportKeywords = () => {
    if (!importSheet || selectedColumnIndex < 0) {
      setImportError('Please select the column that contains keywords.');
      return;
    }

    const seenKeywords = new Set<string>();
    const importedKeywords: string[] = [];

    importSheet.rows.forEach((row) => {
      const keyword = getImportCellText(row[selectedColumnIndex]);

      if (!keyword || seenKeywords.has(keyword.toLowerCase())) {
        return;
      }

      seenKeywords.add(keyword.toLowerCase());
      importedKeywords.push(keyword);
    });

    const skippedRows = Math.max(importSheet.totalRows - importedKeywords.length, 0);

    setKeywords(importedKeywords.join('\n'));
    setImportStats({
      totalRows: importSheet.totalRows,
      importedKeywords: importedKeywords.length,
      skippedRows,
    });
    setImportError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    setSearchedEngine(engine);

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
          location,
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

  const handleExportCsv = () => {
    if (results.length === 0) return;

    const headers = [
      'Keyword',
      'Rank',
      'Page',
      'Position On Page',
      'Ranking URL',
      'Search Engine',
      'Country',
      'Device',
      'Timestamp',
    ];

    const timestamp = new Date().toLocaleString();
    const dateStr = new Date().toISOString().split('T')[0];
    const countryLabel = COUNTRY_OPTIONS.find((c) => c.value === searchedCountry)?.label || searchedCountry || 'N/A';
    const engineLabel = searchedEngine ? searchedEngine.charAt(0).toUpperCase() + searchedEngine.slice(1) : 'N/A';

    const csvRows = results.map((res) => {
      const deviceLabel = res.device !== '-' ? res.device.charAt(0).toUpperCase() + res.device.slice(1) : '-';
      const row = [
        res.keyword,
        res.rank,
        res.page,
        res.positionOnPage,
        res.rankingUrl,
        engineLabel,
        countryLabel,
        deviceLabel,
        timestamp,
      ];
      return row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', `rankings-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-10 shadow-xl shadow-slate-200/50 backdrop-blur-lg">
          <div className="mb-6 flex gap-4">
  <Link
    href="/history"
    className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
  >
    History
  </Link>

  <Link
    href="/analytics"
     className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
  >
    Analytics
  </Link>
</div>
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
  <label
    htmlFor="country"
    className="mb-3 block text-sm font-semibold text-slate-700"
  >
    Country
  </label>

  <select
    id="country"
    value={country}
    onChange={(event) =>
      setCountry(event.target.value as CountryCode)
    }
    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
  >
    {COUNTRY_OPTIONS.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
</div>

              <div>
  <label
    htmlFor="location"
    className="mb-3 block text-sm font-semibold text-slate-700"
  >
    Location (optional)
  </label>

  <input
    id="location"
    type="text"
    value={location}
    onChange={(event) => setLocation(event.target.value)}
    placeholder="Hyderabad, Telangana, India"
    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
  />
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

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Import keywords from file</p>
                    <p className="mt-1 text-sm text-slate-600">Upload File -&gt; Select Column -&gt; Preview Values -&gt; Import Keywords</p>
                  </div>
                  {importSheet ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {importSheet.totalRows} row{importSheet.totalRows === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <label htmlFor="keyword-import-file" className="mb-2 block text-sm font-semibold text-slate-700">
                      Upload File
                    </label>
                    <input
                      id="keyword-import-file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportFileChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                    />
                    <p className="mt-2 text-xs text-slate-500">Supports .xlsx, .xls, and .csv files under 10 MB.</p>
                  </div>

                  {importLoading ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                      Reading file...
                    </div>
                  ) : null}

                  {importSheet ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 sm:grid-cols-3">
                        <div>
                          <p className="font-semibold text-slate-900">File</p>
                          <p className="mt-1 break-words">{importSheet.fileName}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Columns detected</p>
                          <p className="mt-1">{importSheet.headers.length}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Total rows found</p>
                          <p className="mt-1">{importSheet.totalRows}</p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="keyword-import-column" className="mb-2 block text-sm font-semibold text-slate-700">
                          Select Column
                        </label>
                        <select
                          id="keyword-import-column"
                          value={selectedImportColumn}
                          onChange={(event) => {
                            setSelectedImportColumn(event.target.value);
                            setImportStats(null);
                            setImportError('');
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        >
                          <option value="">Choose a column</option>
                          {importSheet.headers.map((header, index) => (
                            <option key={`${header}-${index}`} value={index}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedImportColumn !== '' ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-slate-900">Preview Values</p>
                            <p className="text-xs text-slate-500">First 5 non-empty values</p>
                          </div>
                          {selectedColumnSamples.length > 0 ? (
                            <ul className="mt-3 space-y-2">
                              {selectedColumnSamples.map((sample, index) => (
                                <li key={`${sample}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                  {sample}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                              No non-empty sample values found in this column.
                            </p>
                          )}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleImportKeywords}
                        disabled={selectedImportColumn === ''}
                        className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Import Keywords
                      </button>
                    </div>
                  ) : null}

                  {importStats ? (
                    <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 sm:grid-cols-3">
                      <div>
                        <p className="font-semibold">Total rows found</p>
                        <p className="mt-1">{importStats.totalRows}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Total keywords imported</p>
                        <p className="mt-1">{importStats.importedKeywords}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Total skipped rows</p>
                        <p className="mt-1">{importStats.skippedRows}</p>
                      </div>
                    </div>
                  ) : null}

                  {importError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {importError}
                    </div>
                  ) : null}
                </div>
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
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Results</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Keyword ranking overview
                  {searchedCountry && (
                    <span className="ml-2 text-slate-500">
                      ({searchedCountry === 'ae' ? 'UAE' : COUNTRY_OPTIONS.find((c) => c.value === searchedCountry)?.label} •{' '}
                      {searchedDevice
                        ? searchedDevice.charAt(0).toUpperCase() + searchedDevice.slice(1)
                        : ''})
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-600">Showing {results.length} keyword{results.length > 1 ? 's' : ''}.</p>
                <button
                  onClick={handleExportCsv}
                  disabled={results.length === 0}
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Export CSV
                </button>
              </div>
            </div>
            <RankTable results={results} />
          </section>
        ) : null}
      </div>
    </main>

    
  );
}
