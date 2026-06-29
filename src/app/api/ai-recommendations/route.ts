import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'working',
    message: 'AI Recommendations API is running',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      website,
      rankings = [],
      changes = [],
      audits = [],
      top10,
      top20,
      avgRank,
    } = body;

    const auditContext = audits
      ?.map(
        (audit: any) => `
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

CONTENT:
${audit.content?.slice(0, 1500) || ''}
`
      )
      .join('\n\n========================\n\n');

    const prompt = `
You are an expert SEO consultant.

WEBSITE:
${website}

TOP 10 KEYWORDS:
${top10}

TOP 20 KEYWORDS:
${top20}

AVERAGE RANK:
${avgRank}

RANKINGS:
${JSON.stringify(rankings, null, 2)}

RANKING CHANGES:
${JSON.stringify(changes, null, 2)}

AUDIT DATA:
${auditContext}



TASK:

Analyze the ranking data and audit data together.

IMPORTANT:

- Use ONLY the provided data.
- Never invent SEO issues.
- Never invent duplicate content issues.
- Never invent backlink issues.
- Never invent technical SEO issues.
- Never assume a title, H1 or meta description is bad.
- Never recommend changing a title, H1 or meta description unless the audit data clearly supports it.
- If evidence is not present, say "Not supported by audit data."
- Reference exact URLs.
- Reference exact keywords.
- Reference exact titles.
- Reference exact H1s.
- Reference exact word counts.
- Use ranking data when explaining opportunities.

OUTPUT FORMAT:

# Executive Summary

Brief overview of ranking performance.

# Top Performing Pages

For each strong page:

URL:
Keyword:
Rank:
Title:
Why it is performing well based on available audit data.

# Pages With Improvement Opportunities

Only include pages supported by the data.

URL:
Keyword:
Rank:
Audit Evidence:
Opportunity:
Reason:

# Priority Actions

List the highest impact opportunities supported by the data.

If no opportunity is supported by the audit data, write:

"No issue detected in the audit data."
`;

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

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      recommendation: data.response,
    });
  } catch (error) {
    console.error('AI Recommendation Error:', error);

    return NextResponse.json(
      {
        success: false,
        recommendation: 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}