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
    const html = await response.text();

    const $ = cheerio.load(html);

    const title = $('title').text();

    const metaDescription =
      $('meta[name="description"]').attr('content') || '';

    const h1 = $('h1')
      .map((_, el) => $(el).text())
      .get();

    const h2 = $('h2')
      .map((_, el) => $(el).text())
      .get();

    const images = $('img').length;

    const links = $('a').length;

    const content = $('body').text().replace(/\s+/g, ' ').trim();

    // SAVE TO SUPABASE
    await supabase
  .from('website_audits')
  .insert({
    website,
    keyword,
    page_url: pageUrl,
    title,
    meta_description: metaDescription,
    h1,
    h2,
    images,
    links,
    word_count: content.split(' ').length,
    content: content.slice(0, 5000),
  });

    return NextResponse.json({
      title,
      metaDescription,
      h1,
      h2,
      images,
      links,
      wordCount: content.split(' ').length,
      content: content.slice(0, 5000),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Audit failed' },
      { status: 500 }
    );
  }
}