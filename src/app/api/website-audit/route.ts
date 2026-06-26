import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const {
      website,
      keyword,
      pageUrl,
    } = await req.json();

    const response = await fetch(pageUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch page');
    }

    const html = await response.text();

    const $ = cheerio.load(html);

    const domain = new URL(pageUrl).hostname;

    // TITLE
    const title = $('title').text().trim();

    // META DESCRIPTION
    const metaDescription =
      $('meta[name="description"]').attr('content') || '';

    // H1
    const h1 = $('h1')
      .map((_, el) => $(el).text().trim())
      .get();

    // H2
    const h2 = $('h2')
      .map((_, el) => $(el).text().trim())
      .get();

    // IMAGES
    const images = $('img').length;

    // ALL LINKS
    const links = $('a').length;

    // INTERNAL LINKS
    const internalLinks = $('a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter((link) => {
        if (!link) return false;

        return (
          link.startsWith('/') ||
          link.includes(domain)
        );
      });

    const internalLinkCount = internalLinks.length;

    // EXTERNAL LINKS
    const externalLinks = $('a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter((link) => {
        if (!link) return false;

        return (
          link.startsWith('http') &&
          !link.includes(domain)
        );
      });

    const externalLinkCount = externalLinks.length;

    // MISSING ALT IMAGES
    const missingAltImages = $('img')
      .filter((_, img) => !$(img).attr('alt'))
      .length;

    // CANONICAL
    const canonicalUrl =
      $('link[rel="canonical"]').attr('href') || '';

    // SCHEMA
    const schemaPresent =
      $('script[type="application/ld+json"]').length > 0;
const psiRes = await fetch(
  `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
    pageUrl
  )}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&key=${process.env.PAGESPEED_API_KEY}`
);

const psi = await psiRes.json();

console.log(
  'CATEGORY KEYS:',
  Object.keys(
    psi?.lighthouseResult?.categories || {}
  )
);

console.log(
  'CATEGORIES OBJECT:',
  JSON.stringify(
    psi?.lighthouseResult?.categories,
    null,
    2
  )
);

console.log(
  'LIGHTHOUSE EXISTS:',
  !!psi?.lighthouseResult
);

console.log(
  'PSI ERROR:',
  psi?.error
);

console.log(
  'CATEGORIES:',
  JSON.stringify(
    psi?.lighthouseResult?.categories,
    null,
    2
  )
);

const lighthouse = psi?.lighthouseResult;

const categories = lighthouse?.categories ?? {};
console.log('PERFORMANCE SCORE:', categories.performance?.score);
console.log('SEO SCORE:', categories.seo?.score);
console.log('ACCESSIBILITY SCORE:', categories.accessibility?.score);
const audits = lighthouse?.audits ?? {};

console.log(
  'FULL PSI RESPONSE:',
  JSON.stringify(psi, null, 2)
);

const pagespeedScore =
typeof categories.performance?.score === 'number'
  ? Math.round(categories.performance.score * 100)
  : null;

const seoScore =
typeof categories.seo?.score === 'number'
  ? Math.round(categories.seo.score * 100)
  : null;

const accessibilityScore =
typeof categories.accessibility?.score === 'number'
  ? Math.round(categories.accessibility.score * 100)
  : null;

const lcp =
audits['largest-contentful-paint']?.numericValue ?? null;

const cls =
audits['cumulative-layout-shift']?.numericValue ?? null;

const inp =
audits['interaction-to-next-paint']?.numericValue ??
audits['experimental-interaction-to-next-paint']?.numericValue ??
null;

console.log({
  pagespeedScore,
  seoScore,
  accessibilityScore,
  lcp,
  cls,
  inp,
});
    // CONTENT
    const content = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    const wordCount = content.split(' ').length;

    console.log('Internal Links:', internalLinkCount);
    console.log('External Links:', externalLinkCount);
    console.log('Missing Alt Images:', missingAltImages);

    console.log({
  internalLinkCount,
  externalLinkCount,
  missingAltImages,
  canonicalUrl,
  schemaPresent,
});


    // SAVE TO SUPABASE

      // SAVE TO SUPABASE

const auditData = {
  website,
  keyword,
  page_url: pageUrl,

  title,
  meta_description: metaDescription,

  h1,
  h2,

  images,
  links,

  internal_links: internalLinkCount,
  external_links: externalLinkCount,
  missing_alt_images: missingAltImages,
  canonical_url: canonicalUrl,
  schema_present: schemaPresent,

  pagespeed_score: pagespeedScore,
  seo_score: seoScore,
  accessibility_score: accessibilityScore,

  lcp,
  cls,
  inp,

  word_count: wordCount,
  content: content.slice(0, 5000),
};

console.log('INSERTING:', auditData);

const { data, error } = await supabase
  .from('website_audits')
  .insert(auditData)
  .select();

console.log('INSERT RESULT:', data);
console.log('INSERT ERROR:', error);

if (error) {
  throw error;
}

return NextResponse.json({
  success: true,

  title,
  metaDescription,

  h1,
  h2,

  images,
  links,

  internalLinks: internalLinkCount,
  externalLinks: externalLinkCount,

  missingAltImages,

  canonicalUrl,

  schemaPresent,

  pagespeedScore,
  seoScore,
  accessibilityScore,

  lcp,
  cls,
  inp,

  wordCount,

  content: content.slice(0, 5000),
});

} catch (error) {
  console.error('AUDIT ERROR:', error);

  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Audit failed',
    },
    {
      status: 500,
    }
  );
}
}