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

  const countryParam = engine === 'google' ? `gl=${country}` : `cc=${country}`;
  const serpApiUrl = `https://serpapi.com/search.json?engine=${engine}&q=${encodeURIComponent(keyword)}&num=100&${countryParam}&device=${device}&api_key=${apiKey}`;
  console.debug(`[serp] Fetching SerpApi for keyword: "${keyword}" (URL: ${serpApiUrl.split('api_key=')[0]}...)`);

  try {
    const res = await fetch(serpApiUrl);
    console.debug(`[serp] SerpApi response status for "${keyword}":`, res.status);
    const data = await res.json();

    if (!res.ok) {
      // SerpApi often returns error messages in the JSON body even for non-200 statuses
      const errorMessage = data.error || data.error_message || `SerpApi returned status ${res.status}`;
      throw new Error(`SerpApi error for "${keyword}": ${errorMessage}`);
    }

    const mappedResults: SerpSearchResult[] = (data.organic_results || []).map(
      (item: any, index: number) => ({
        position: item.position || index + 1,
        title: item.title || item.snippet || '',
        displayedUrl: item.displayed_link || item.domain || '',
        link: item.link || item.url || '',
      }),
    );

    console.debug(`[serp] Organic results count for "${keyword}":`, mappedResults.length);
    return { results: mappedResults, status: res.status };
  } catch (error) {
    console.error(`[serp] Error fetching SerpApi for "${keyword}":`, error);
    // Re-throw to be caught by checkKeywordRanking and then by the API route
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

  const normalizedTarget = targetDomain.toLowerCase();

  const found = results.find((result) => {
    const resultDomain = getDomain(result.link); // Use the robust getDomain helper
    return resultDomain === normalizedTarget;
  });

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
