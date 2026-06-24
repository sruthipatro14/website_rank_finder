import { NextResponse } from 'next/server';
import { getDomain, checkKeywordRanking } from '@/lib/serp';
import type { RankResult, CountryCode, DeviceType } from '@/types';
import { supabase } from '@/lib/supabase';

interface CheckRankPayload {
  url: string;
  keywords: string;
  engine?: string;
  country?: CountryCode;
  device?: DeviceType;
}

const KEYWORD_CONCURRENCY_LIMIT = 2;

type KeywordCheck = Awaited<ReturnType<typeof checkKeywordRanking>>;

async function runKeywordChecksWithLimit(
  keywords: string[],
  limit: number,
  checkKeyword: (keyword: string) => Promise<KeywordCheck>,
): Promise<KeywordCheck[]> {
  const results: KeywordCheck[] = new Array(keywords.length);
  let nextIndex = 0;
  let activeRequests = 0;

  const runWorker = async () => {
    while (nextIndex < keywords.length) {
      const currentIndex = nextIndex;
      const keyword = keywords[currentIndex];
      nextIndex += 1;
      activeRequests += 1;

      console.debug(
        `[api/check-rank:queue] Starting keyword="${keyword}" active=${activeRequests} queued=${keywords.length - nextIndex}`,
      );

      try {
        results[currentIndex] = await checkKeyword(keyword);
      } finally {
        activeRequests -= 1;
        console.debug(
          `[api/check-rank:queue] Finished keyword="${keyword}" active=${activeRequests} queued=${keywords.length - nextIndex}`,
        );
      }
    }
  };

  const workerCount = Math.min(limit, keywords.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CheckRankPayload;

    if (!payload.url?.trim()) {
      return NextResponse.json({ error: 'Please provide a valid website URL.' }, { status: 400 });
    }

    if (!payload.keywords?.trim()) {
      return NextResponse.json({ error: 'Please provide at least one keyword.' }, { status: 400 });
    }

    const targetDomain = getDomain(payload.url.trim());
    const keywords = payload.keywords
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one keyword.' }, { status: 400 });
    }

    console.debug('[api/check-rank] Target domain:', targetDomain);
    console.debug('[api/check-rank] Keywords:', keywords);

    const serpApiKeyPresent = Boolean(process.env.SERP_API_KEY);
    console.debug('[api/check-rank] SERP_API_KEY present:', serpApiKeyPresent);

    const engine = payload.engine || 'google';
    console.debug('[api/check-rank] Selected engine:', engine);

    const country = payload.country || 'in';
    console.debug('[api/check-rank] Selected country:', country);

    const device = payload.device || 'desktop';
    console.debug('[api/check-rank] Selected device:', device);

    console.debug(
      `[api/check-rank:queue] Processing ${keywords.length} keyword(s) with concurrency=${KEYWORD_CONCURRENCY_LIMIT}`,
    );
    const checks = await runKeywordChecksWithLimit(
      keywords,
      KEYWORD_CONCURRENCY_LIMIT,
      (keyword) => checkKeywordRanking(targetDomain, keyword, engine, country, device),
    );

    const results: RankResult[] = checks.map((c) => c.result);
    const { data: scan, error: scanError } = await supabase
  .from('scans')
  .insert({
    website: targetDomain,
    country,
    device,
  })
  .select()
  .single();

if (scanError) {
  console.error('Failed to create scan:', scanError);
}

if (scan) {
  const rankingRows = results.map((r) => ({
    scan_id: scan.id,
    keyword: r.keyword,
    rank: r.rank,
    ranking_url: r.rankingUrl || null,
    page: r.page || null,
    position_on_page: r.positionOnPage || null,
  }));

  const { error } = await supabase
    .from('ranking_results')
    .insert(rankingRows);

  if (error) {
    console.error('Failed to save rankings:', error);
  }
}
    const serpStatuses: Record<string, number | null | undefined> = {};
    checks.forEach((c) => {
      serpStatuses[c.result.keyword] = c.serpStatus ?? null;
    });

    console.debug('[api/check-rank] SERP statuses:', serpStatuses);

    return NextResponse.json({ results, debug: { serpApiKeyPresent, serpStatuses } });
  } catch (error) {
    console.error('[api/check-rank] Server error:', error);

    let errorMessage = 'An unexpected server error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('Missing SERP_API_KEY')) {
        errorMessage = 'SERP_API_KEY is missing. Add it to .env.local and restart Next.js.';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { stack: error.stack }),
      },
      { status: 500 },
    );
  }
}
