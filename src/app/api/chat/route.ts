import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const {
      message,
      website,
      rankings = [],
      changes = [],
      scans = [],
      audits = [],
    } = await req.json();

    console.log('AUDITS RECEIVED:', audits?.length);
    console.log('FIRST AUDIT:', audits?.[0]);

    const auditContext = Array.isArray(audits)
      ? audits
          .map(
            (audit) => `
KEYWORD:
${audit.keyword}

PAGE URL:
${audit.page_url}

TITLE:
${audit.title}

META DESCRIPTION:
${audit.meta_description}

H1:
${JSON.stringify(audit.h1)}

H2:
${JSON.stringify(audit.h2)}

WORD COUNT:
${audit.word_count}

PAGESPEED SCORE:
${audit.pagespeed_score}

SEO SCORE:
${audit.seo_score}

ACCESSIBILITY SCORE:
${audit.accessibility_score}

LCP:
${audit.lcp}

CLS:
${audit.cls}

INP:
${audit.inp}

INTERNAL LINKS:
${audit.internal_links}

EXTERNAL LINKS:
${audit.external_links}

MISSING ALT IMAGES:
${audit.missing_alt_images}

CANONICAL URL:
${audit.canonical_url}

SCHEMA PRESENT:
${audit.schema_present}

IMAGES:
${audit.images}

LINKS:
${audit.links}

INTERNAL LINKS DATA:
${JSON.stringify(audit.internal_links_data, null, 2)}

EXTERNAL LINKS DATA:
${JSON.stringify(audit.external_links_data, null, 2)}

MISSING ALT IMAGES DATA:
${JSON.stringify(audit.missing_alt_images_data, null, 2)}

IMAGES DATA:
${JSON.stringify(audit.images_data, null, 2)}

CONTENT:
${audit.content?.slice(0, 2000) || ''}
`
          )
          .join('\n\n==============================\n\n')
      : '';

    const prompt = `
You are a senior SEO consultant.

WEBSITE:
${website}

AUDIT DATA:
${auditContext}

RANKINGS:
${JSON.stringify(rankings, null, 2)}

RANKING CHANGES:
${JSON.stringify(changes, null, 2)}

SCAN DATA:
${JSON.stringify(scans, null, 2)}

AUDITS:
${JSON.stringify(audits, null, 2)}

You have FULL access to the audit data.

Do not only summarize metrics.

Inspect the detailed datasets and identify:

- Internal linking opportunities
- Orphan page signals
- Missing alt text patterns
- Image optimization opportunities
- Content structure weaknesses
- Schema opportunities
- Ranking opportunities

Only use evidence found in the supplied audit data.

The audit contains detailed datasets.

When available, analyze:

- Internal links data
- External links data
- Missing alt image data
- Images data
- Backlink data
- Schema data
- Heading structure

Do not rely only on counts.

Use actual URLs, image sources, anchor text,
and link destinations when making recommendations.

If detailed data exists, cite specific examples.

==================================================
RULES
==================================================

1. ONLY use information found in:
   - Audit Data
   - Ranking Data
   - Ranking Changes
   - Scan Data

2. NEVER invent:
   - Title tags
   - Meta descriptions
   - H1 tags
   - H2 tags
   - URLs
   - Rankings
   - Word counts

3. If information does not exist in the audit:
   Reply:
   "That information is not available in the audit."

4. If answering about a specific page:
   Find the matching audit record and answer only from that page.

5. Always quote actual values before giving recommendations.

6. Use ranking data as evidence.

7. A low ranking does NOT automatically mean:
   - title is bad
   - H1 is bad
   - meta description is bad

8. Do NOT create fake SEO problems.

9. If no issue is visible in the audit:
   Say:
   "No issue detected in the audit data."

10. If a recommendation is made:
    Explain exactly WHY using audit data or ranking data.

11. When giving recommendations also analyze:

- PageSpeed score
- SEO score
- Accessibility score
- LCP
- CLS
- INP
- Internal linking
- Missing image alt text
- Canonical tags
- Structured data/schema
==================================================
HOW TO ANALYZE
==================================================

When a user asks for SEO improvements:

Step 1:
Identify the page and keyword.

Step 2:
Show:

- Current URL
- Current Ranking
- Current Title
- Current Meta Description
- Current H1
- Word Count

Step 3:
Analyze:

- Missing title?
- Missing meta description?
- Missing H1?
- Missing content?
- Very low word count?
- Ranking decline?
- Large ranking opportunity?

Step 4:
Only recommend changes if evidence exists.

==================================================
RESPONSE FORMAT
==================================================

# Page Overview

URL:
[actual URL]

Keyword:
[actual keyword]

Current Rank:
[actual rank]

Title:
[actual title]

Meta Description:
[actual meta]

H1:
[actual h1]

Word Count:
[actual word count]

# Findings

[List only proven findings]

# Opportunities

[List opportunities supported by data]

# Recommended Actions

[List recommendations supported by audit data]

If no issues exist:

"No issue detected in the audit data."

==================================================
USER QUESTION
==================================================

${message}
`;
    console.log('PROMPT LENGTH:', prompt.length);
    console.log(prompt.slice(0, 5000));

    const response = await fetch(
      'http://localhost:11434/api/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3',
          prompt,
          stream: false,
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({
      reply: data.response,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        reply: 'Failed to get response',
      },
      { status: 500 }
    );
  }
}