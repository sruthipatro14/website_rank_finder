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

Analyze the SEO ranking data below and provide:

1. Executive Summary
2. Biggest Ranking Wins
3. Biggest Ranking Losses
4. Quick Wins
5. High Impact Opportunities
6. Content Recommendations
7. Backlink Recommendations
8. Priority Actions

SEO Data:

${JSON.stringify(body, null, 2)}

Provide practical recommendations based on the actual ranking data.
Avoid generic SEO advice.
`,
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