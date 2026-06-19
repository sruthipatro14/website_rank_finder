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
export function isDomainMatch(resultUrl: string, targetDomain: string): boolean {
  const result = getDomain(resultUrl);
  const target = getDomain(targetDomain);
  return result === target || result.endsWith(`.${target}`);
}

export async function fetchSerpResults(
  keyword: string,
  engine: string = 'google',
  country: CountryCode = 'in',
  device: DeviceType = 'desktop',
): Promise<{ results: SerpSearchResult[]; status?: number | null }> {
  const apiKey = process.env.SERP_API_KEY ?? '';
  const hasKey = Boolean(apiKey);
  console.debug('[serp] SERP_API_KEY present:', hasKey);

  if (!apiKey) {
    throw new Error('Missing SERP_API_KEY environment variable');
  }

  let countryParam = engine === 'google' ? `gl=${country}` : `cc=${country}`;
  if (engine === 'google' && country === 'ae') {
    countryParam += '&hl=en';
  }

  const PAGES = [0, 10, 20]; // start offsets covering positions 1–30
  let lastStatus: number | null = null;
  const allRaw: any[] = [];

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

      const pageOrganic: any[] = data.organic_results || [];
      console.debug(`[serp] Page start=${start} returned ${pageOrganic.length} results for "${keyword}"`);

      if (pageOrganic.length === 0) {
        console.debug(`[serp] Empty page at start=${start} for "${keyword}", stopping early`);
        break;
      }

      allRaw.push(...pageOrganic);
    }

    console.debug(`[serp] Total merged organic results for "${keyword}":`, allRaw.length);
    console.debug(`[serp] First position for "${keyword}":`, allRaw[0]?.position ?? 'n/a');
    console.debug(`[serp] Last  position for "${keyword}":`, allRaw[allRaw.length - 1]?.position ?? 'n/a');

    const mappedResults: SerpSearchResult[] = allRaw.map((item: any) => ({
      position: item.position,
      title: item.title || item.snippet || '',
      displayedUrl: item.displayed_link || item.domain || '',
      link: item.link || item.url || '',
    }));

    return { results: mappedResults, status: lastStatus };
  } catch (error) {
    console.error(`[serp] Error fetching SerpApi for "${keyword}":`, error);
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
  const found = sorted.find((result) => isDomainMatch(result.link, targetDomain));

  if (!found) {
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
