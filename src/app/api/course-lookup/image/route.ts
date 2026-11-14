/**
 * Scorecard Image Lookup API
 *
 * POST /api/course-lookup/image  (multipart/form-data, field: "image")
 *   Sends the scorecard image to Anthropic Claude Vision and extracts par + stroke index per hole.
 *
 * Requires env var: ANTHROPIC_API_KEY
 *
 * Returns: { course: { name, holes: [{par, strokeIndex}] } } | { error }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { HoleInfo } from '@/lib/types/game';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const SCORECARD_PROMPT = `You are reading a golf scorecard image.
Extract the following data for all 18 holes (front 9 and back 9):
1. Par for each hole (must be 3, 4, or 5)
2. Handicap/Stroke Index for each hole (must be unique integers 1-18, where 1 = hardest)

Also extract the course name if visible.

Return ONLY valid JSON in this exact format, no other text:
{
  "name": "Course Name",
  "holes": [
    {"hole": 1, "par": 4, "strokeIndex": 11},
    {"hole": 2, "par": 3, "strokeIndex": 17},
    ...all 18 holes in order...
  ]
}

If you cannot clearly read the par or stroke index for all 18 holes, return:
{"error": "Could not read all 18 holes clearly"}`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Image lookup is not configured (missing ANTHROPIC_API_KEY)' },
      { status: 503 }
    );
  }

  let imageData: string;
  let mediaType: string;

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 5 MB)' }, { status: 400 });
    }

    const rawType = file.type || 'image/jpeg';
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    mediaType = supportedTypes.includes(rawType) ? rawType : 'image/jpeg';

    const bytes = await file.arrayBuffer();
    imageData = Buffer.from(bytes).toString('base64');
  } catch {
    return NextResponse.json({ error: 'Failed to read image' }, { status: 400 });
  }

  // Call Anthropic Claude with vision
  let responseText: string;
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: SCORECARD_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'Vision API request failed' }, { status: 502 });
    }

    const json = await anthropicRes.json();
    responseText = json.content?.[0]?.text ?? '';
  } catch {
    return NextResponse.json({ error: 'Vision API request failed' }, { status: 502 });
  }

  // Parse the JSON response from Claude
  try {
    // Strip any markdown code fences if present
    const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    if (!parsed.holes || !Array.isArray(parsed.holes) || parsed.holes.length !== 18) {
      return NextResponse.json({ error: 'Could not extract 18 holes from scorecard' }, { status: 422 });
    }

    // Validate and normalize
    const holes: HoleInfo[] = parsed.holes.map((h: { par: number; strokeIndex: number }) => ({
      par: h.par as 3 | 4 | 5,
      strokeIndex: h.strokeIndex,
    }));

    const validPars = holes.every(h => h.par === 3 || h.par === 4 || h.par === 5);
    const siValues = holes.map(h => h.strokeIndex);
    const validSI = new Set(siValues).size === 18 && siValues.every(si => si >= 1 && si <= 18);

    if (!validPars || !validSI) {
      return NextResponse.json(
        { error: 'Extracted scorecard data looks invalid — try entering manually' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      course: {
        name: parsed.name ?? 'Unknown Course',
        holes,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not parse scorecard response' }, { status: 422 });
  }
}
