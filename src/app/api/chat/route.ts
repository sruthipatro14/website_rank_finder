import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const {
  message,
  website,
  rankings,
  changes,
  scans,
  audits,
} = await req.json();

    const response = await fetch(
      'http://localhost:11434/api/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3',
          prompt: `
You are a senior SEO consultant.

Website:
${website}

TITLE:
${audits?.title}

META DESCRIPTION:
${audits?.meta_description}

H1 TAGS:
${JSON.stringify(audits?.h1)}

H2 TAGS:
${JSON.stringify(audits?.h2)}

WORD COUNT:
${audits?.word_count}

RANKINGS:
${JSON.stringify(rankings?.slice(0, 50), null, 2)}

RANKING CHANGES:
${JSON.stringify(changes?.slice(0, 50), null, 2)}

IMPORTANT:
Use the actual website audit data.
Do not give generic SEO advice.
Reference the title, meta description, headings, content structure and ranking data.
Explain exactly what should be changed.

Rules:

- Never give generic SEO advice.
- Always mention exact keywords.
- Always mention exact page URLs.
- Always mention exact title tags.
- Always mention exact H1 tags.
- Always mention exact meta descriptions.
- Suggest exact replacement text.
- Explain WHY the ranking is low.
- Prioritize the highest traffic opportunity first.

USER QUESTION:
${message}
`,
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