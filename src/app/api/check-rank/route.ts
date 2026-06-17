import { NextResponse } from 'next/server';
import { getDomain, checkKeywordRanking } from '@/lib/serp';
import type { RankResult, CountryCode, DeviceType } from '@/types';

interface CheckRankPayload {
  url: string;
  keywords: string;
  engine?: string;
  country?: CountryCode;
  device?: DeviceType;
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

    // Run keyword checks concurrently and gather serp statuses for debugging
    const checks = await Promise.all(
      keywords.map((keyword) => checkKeywordRanking(targetDomain, keyword, engine, country, device))
    );

    const results: RankResult[] = checks.map((c) => c.result);
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
