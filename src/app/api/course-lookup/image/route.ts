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

Read the card column by column: for each hole number, read straight down that
column to its Par and Handicap cells — the Par row is often far below the hole
numbers, so don't let your eye slip to a neighbouring column. Before answering,
sanity-check each par against that hole's yardages (par 3s are short, par 5s
are the longest holes) and check the front/back par totals against the OUT/IN
columns. Re-read any hole that doesn't fit.

Also extract the course name if visible ("Unknown Course" if not).

List all 18 holes in order and set "error" to null.
If you cannot clearly read the par or stroke index for all 18 holes, return an
empty "holes" list and set "error" to "Could not read all 18 holes clearly".`;

// Structured output: the API guarantees the response text matches this schema.
const SCORECARD_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    holes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hole: { type: 'integer' },
          par: { type: 'integer', enum: [3, 4, 5] },
          strokeIndex: { type: 'integer' },
        },
        required: ['hole', 'par', 'strokeIndex'],
        additionalProperties: false,
      },
    },
    error: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: ['name', 'holes', 'error'],
  additionalProperties: false,
};

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
        // Thinking tokens count toward max_tokens; leave room so the JSON isn't cut off.
        max_tokens: 16000,
        output_config: {
          // low effort misread back-nine pars on a real card; accuracy matters more than latency here
          effort: 'high',
          format: { type: 'json_schema', schema: SCORECARD_SCHEMA },
        },
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
    // Haiku 5.5 thinks by default, so content[0] is usually a thinking block — find the text block.
    const textBlock = json.content?.find((b: { type: string }) => b.type === 'text');
    responseText = textBlock?.text ?? '';
    if (json.stop_reason !== 'end_turn') {
      console.error('Scorecard extraction stopped early:', json.stop_reason, json.stop_details);
    }
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
    console.error('Could not parse scorecard response:', responseText.slice(0, 500));
    return NextResponse.json({ error: 'Could not parse scorecard response' }, { status: 422 });
  }
}
