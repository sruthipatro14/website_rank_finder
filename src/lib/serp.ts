import type { RankResult, SerpSearchResult, CountryCode, DeviceType } from '@/types';
import { URL } from 'url'; // Import URL for Node.js environment

/**
 * Normalizes a URL to its domain component.
 * Removes protocol, removes 'www.', and converts to lowercase.
 */
export function getDomain(url: string): string {
  const sanitizedUrl = url.replace(/[<>]/g, '').trim();
  try {
    const formattedUrl = sanitizedUrl.startsWith('http') ? sanitizedUrl : `https://${sanitizedUrl}`;
    const parsed = new URL(formattedUrl);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return sanitizedUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

/**
 * Returns true if the result URL belongs to the target domain or any of its subdomains.
 * Matches: exact root domain, www, and subdomains (e.g. blog.example.com).
 * Does NOT match unrelated domains that happen to end with the same string.
 */
export function isDomainMatch(
  resultUrl: string,
  targetDomain: string
): boolean {
  const result = getDomain(resultUrl);
  const target = getDomain(targetDomain);

  const resultClean = result
    .replace(/^www\./, '')
    .toLowerCase();

  const targetClean = target
    .replace(/^www\./, '')
    .toLowerCase();

  return (
    resultClean === targetClean ||
    resultClean.endsWith(`.${targetClean}`)
  );
}

// Error message fragments that indicate an API availability / credit / key issue.
// Only these trigger fallback to Serper. Coding bugs and parse errors do not.
const FALLBACK_TRIGGERS = [
  'credit', 'quota', 'rate limit', 'invalid api', 'invalid key',
  'missing key', 'unauthorized', 'exceeded', 'run out',
];

function isFallbackError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return FALLBACK_TRIGGERS.some((trigger) => msg.includes(trigger));
}

const SERPER_MAX_ATTEMPTS = 4;

async function serperFetch(
  payload: object,
  apiKey: string,
  keyword: string,
  page: number,
): Promise<{ res: Response; data: any }> {
  let delayMs = 1000;
  for (let attempt = 1; attempt <= SERPER_MAX_ATTEMPTS; attempt++) {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status !== 429) return { res, data };
    if (attempt < SERPER_MAX_ATTEMPTS) {
      console.debug(`[serper] Rate limited keyword="${keyword}" page=${page} attempt=${attempt}/${SERPER_MAX_ATTEMPTS} retrying in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2; // exponential backoff: 1s → 2s → 4s
    }
  }
  throw new Error(`Serper rate limit not resolved for "${keyword}" page=${page} after ${SERPER_MAX_ATTEMPTS} attempts`);
}

async function fetchFromSerper(
  keyword: string,
  country: CountryCode = 'in',
  device: DeviceType = 'desktop',
): Promise<{ results: SerpSearchResult[]; status: number | null }> {
  const apiKey = process.env.SERPER_API_KEY ?? '';
  if (!apiKey) throw new Error('Missing SERPER_API_KEY environment variable');

  console.debug('[serp] Using Serper');

  const PAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // pages covering positions 1–100
  const DELAY_MS = 500; // 500ms between pages = max 2 req/sec per keyword
  let lastStatus: number | null = null;
  const allResults: SerpSearchResult[] = [];

  for (const page of PAGES) {
    if (page > 1) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

    const payload = { q: keyword, gl: country, num: 10, page, device };
    console.debug(`[serper] Fetching page=${page} payload=${JSON.stringify(payload)}`);

    let res: Response;
    let data: any;
    ({ res, data } = await serperFetch(payload, apiKey, keyword, page));
    lastStatus = res.status;

    if (!res.ok) {
      const errorMessage = data.message || data.error || `Serper returned status ${res.status}`;
      throw new Error(`Serper error for "${keyword}" (page=${page}): ${errorMessage}`);
    }

    const organic: any[] = data.organic || [];
    console.debug(`[serper] page=${page} organic_results=${organic.length}`);

    if (organic.length === 0) {
      console.debug(`[serper] page=${page} returned 0 results — Serper has no more data for this query, stopping`);
      break;
    }

    const startOffset = (page - 1) * 10;
    const mapped: SerpSearchResult[] = organic.map((item: any, index: number) => ({
      position: startOffset + index + 1,
      title: item.title || '',
      displayedUrl: item.displayedLink || item.link || '',
      link: item.link || '',
    }));

    const firstPos = mapped[0].position;
    const lastPos = mapped[mapped.length - 1].position;
    console.debug(`[serper] firstPosition=${firstPos} lastPosition=${lastPos}`);

    allResults.push(...mapped);
  }

  console.debug(`[serper] Total pages requested: ${PAGES.length}`);
  console.debug(`[serper] Total results received: ${allResults.length}`);
  console.debug(`[serper] First position: ${allResults[0]?.position ?? 'n/a'}`);
  console.debug(`[serper] Last  position: ${allResults[allResults.length - 1]?.position ?? 'n/a'}`);
  console.debug(`[serper] All positions: ${allResults.map((r) => r.position).join(', ')}`);

  return { results: allResults, status: lastStatus };
}

export async function fetchSerpResults(
  keyword: string,
  engine: string = 'google',
  country: CountryCode = 'in',
  device: DeviceType = 'desktop',
): Promise<{ results: SerpSearchResult[]; status?: number | null }> {
  const apiKey = process.env.SERP_API_KEY ?? '';
  console.debug('[serp] SERP_API_KEY present:', Boolean(apiKey));

  if (!apiKey) {
    console.debug('[serp] SERP_API_KEY missing — falling back to Serper immediately');
    console.debug('[serp] Falling back to Serper');
    return fetchFromSerper(keyword, country, device);
  }

  console.debug('[serp] Using SerpApi');

  let countryParam = engine === 'google' ? `gl=${country}` : `cc=${country}`;
  if (engine === 'google' && country === 'ae') {
    countryParam += '&hl=en';
  }

  const PAGES = [0, 10, 20, 30, 40,50, 60, 70, 80, 90]; // start offsets covering positions 1–30
  let lastStatus: number | null = null;
  const allRaw: SerpSearchResult[] = [];

  try {
    for (const start of PAGES) {
      const serpApiUrl = `https://serpapi.com/search.json?engine=${engine}&q=${encodeURIComponent(keyword)}&num=10&start=${start}&${countryParam}&device=${device}&api_key=${apiKey}`;
      console.debug(`[serp] Fetching page start=${start} for "${keyword}" (URL: ${serpApiUrl.split('api_key=')[0]}...)`);

      const res = await fetch(serpApiUrl);
      lastStatus = res.status;
      console.debug(`[serp] Response status for "${keyword}" start=${start}:`, res.status);

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || data.error_message || `SerpApi returned status ${res.status}`;
        throw new Error(`SerpApi error for "${keyword}" (start=${start}): ${errorMessage}`);
      }
console.log(
  JSON.stringify(data, null, 2)
);
      const pageOrganic: any[] = data.organic_results || [];
      
      const localPlaces = data.local_results?.places || [];

const mappedLocal: SerpSearchResult[] = localPlaces.map(
  (place: any, index: number) => ({
    position: place.position || index + 1,
    title: place.title || '',
    displayedUrl: place.links?.website || '',
    link: place.links?.website || '',
  })
);

allRaw.push(...mappedLocal);

console.log(
  'LOCAL RESULTS:',
  localPlaces.map((p: any) => ({
    position: p.position,
    title: p.title,
    website: p.links?.website
  }))
);

      console.debug(`[serp] Page start=${start} returned ${pageOrganic.length} results for "${keyword}"`);

      if (pageOrganic.length === 0) {
        console.debug(`[serp] Empty page at start=${start} for "${keyword}", skipping`);
        continue;
      }

      const mappedPage: SerpSearchResult[] = pageOrganic.map((item: any, index: number) => {
        const calculatedPosition = start + index + 1;
        console.debug(`[serp] start=${start} index=${index} calculatedPosition=${calculatedPosition}`);
        return {
          position: calculatedPosition,
          title: item.title || item.snippet || '',
          displayedUrl: item.displayed_link || item.domain || '',
          link: item.link || item.url || '',
        };
      });

      allRaw.push(...mappedPage);
    }

    console.debug(`[serp] Total merged organic results for "${keyword}":`, allRaw.length);
    console.debug(`[serp] First position for "${keyword}":`, allRaw[0]?.position ?? 'n/a');
    console.debug(`[serp] Last  position for "${keyword}":`, allRaw[allRaw.length - 1]?.position ?? 'n/a');
    console.debug(`[serp] All positions for "${keyword}":`, allRaw.map((r) => r.position).join(', '));

    return { results: allRaw, status: lastStatus };
  } catch (error) {
    console.error(`[serp] Error fetching SerpApi for "${keyword}":`, error);
    if (isFallbackError(error)) {
      console.debug('[serp] Falling back to Serper');
      return fetchFromSerper(keyword, country, device);
    }
    throw error;
  }
}

// Returns both the RankResult and the optional serp response status for debugging
export async function checkKeywordRanking(
  targetDomain: string,
  keyword: string,
  engine: string = 'google',
  country: CountryCode = 'in',
  device: DeviceType = 'desktop',
): Promise<{ result: RankResult; serpStatus?: number | null }> {
  let results: SerpSearchResult[] = [];
  let status: number | null = null;

  try {
    const serpResponse = await fetchSerpResults(keyword, engine, country, device);
    results = serpResponse.results;
    status = serpResponse.status ?? null;
  } catch (error) {
    // If fetchSerpResults throws, we still want to return a 'Not Found' result
    // and propagate the error message through the API route.
    // The API route will catch this and return a 500 or specific error.
    throw error; // Re-throw the error to be caught by the API route
  }

  console.debug(`[serp:match] keyword="${keyword}" target="${targetDomain}" total results=${results.length}`);
  results.forEach((result) => {
    const matched = isDomainMatch(result.link, targetDomain);
    console.debug(`[serp:match] Position: ${result.position} | URL: ${result.link} | Matched: ${matched}`);
  });

  const sorted = [...results].sort((a, b) => a.position - b.position);
  console.log('====================================');
console.log('TARGET DOMAIN:', targetDomain);
console.log('KEYWORD:', keyword);

sorted.forEach((result) => {
  console.log({
    position: result.position,
    url: result.link,
    domain: getDomain(result.link),
    matched: isDomainMatch(result.link, targetDomain),
  });
});

const found = sorted.find((result) =>
  isDomainMatch(result.link, targetDomain)
);

console.log('FOUND RESULT:', found);
console.log('====================================');
const possibleMatches = sorted.filter((result) =>
  getDomain(result.link).includes(
    targetDomain.replace(/^www\./, '')
  )
);

console.log(
  'POSSIBLE DOMAIN MATCHES:',
  possibleMatches
);
  if (!found) {
    console.debug(`[serp:match] No match found for target="${targetDomain}" keyword="${keyword}"`);
    return {
      result: {
        keyword,
        rank: 'Not Found',
        page: '-',
        positionOnPage: '-',
        rankingUrl: '-',
        device,
      },
      serpStatus: status ?? null,
    };
  }

  const rank = found.position;
  console.debug(`[serp:match] Match found for target="${targetDomain}" keyword="${keyword}" matchedUrl="${found.link}" rank=${rank}`);
  console.debug(`[serp:match] Final rank returned: ${rank}`);
  return {
    result: {
      keyword,
      rank,
      page: Math.floor((rank - 1) / 10) + 1,
      positionOnPage: ((rank - 1) % 10) + 1,
      rankingUrl: found.link,
      device,
    },
    serpStatus: status ?? null,
  };
}
