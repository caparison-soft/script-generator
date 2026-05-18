export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Set max duration to 60s for Vercel Hobby

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../../../lib/supabase';
import { prisma } from '../../../lib/db';

const CAPARISON_BASE_URL = process.env.CAPARISON_BASE_URL;
const CAPARISON_API_KEY = process.env.CAPARISON_API_KEY;

// Duration → approximate word count mapping
const DURATION_CONFIG = {
  1:  { words: 150,  segments: 3  },
  2:  { words: 300,  segments: 5  },
  3:  { words: 450,  segments: 7  },
  5:  { words: 750,  segments: 10 },
  7:  { words: 1050, segments: 13 },
  10: { words: 1500, segments: 16 },
  15: { words: 2200, segments: 22 },
};

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `[${m}:${s}]`;
}

export async function POST(request) {
  let generationId = null;
  let skipCredits = false;

  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const supabase = await createServerSupabaseClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = session.access_token;
    const userEmail = session.user.email;

    const { topic, duration } = await request.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const durationMins = parseInt(duration) || 3;
    const config = DURATION_CONFIG[durationMins] || DURATION_CONFIG[3];

    // 2. Fetch dynamic pricing from Caparison Lab and deduct credits

    if (!CAPARISON_API_KEY || CAPARISON_API_KEY === 'PASTE_YOUR_API_KEY_FROM_ADMIN_PANEL_HERE') {
      // Development mode — skip credit check
      skipCredits = true;
      console.warn('⚠️  CAPARISON_API_KEY not set — running without credit deduction');
    }

    let creditCost = 10; // fallback default

    if (!skipCredits) {
      // Fetch dynamic pricing rules from platform
      try {
        const pricingRes = await fetch(`${CAPARISON_BASE_URL}/api/v1/pricing`, {
          headers: { Authorization: `Bearer ${CAPARISON_API_KEY}` },
        });
        const pricingData = await pricingRes.json();

        if (pricingData.ok && pricingData.pricingRules) {
          creditCost = pricingData.pricingRules[String(durationMins)] || pricingData.defaultCost || 10;
        } else {
          creditCost = pricingData.defaultCost || 10;
        }
      } catch (pricingErr) {
        console.warn('Failed to fetch pricing, using default:', pricingErr.message);
      }

      const creditRes = await fetch(`${CAPARISON_BASE_URL}/api/v1/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: CAPARISON_API_KEY,
          userToken,
          inputData: { topic, duration: durationMins },
          creditCost,
        }),
      });

      const creditData = await creditRes.json();

      if (!creditData.ok) {
        return NextResponse.json({
          error: creditData.error === 'INSUFFICIENT_CREDITS'
            ? `Not enough credits. You need ${creditData.required} credits but have ${creditData.available}.`
            : creditData.message || 'Credit check failed.',
          code: creditData.error,
        }, { status: 402 });
      }

      generationId = creditData.generationId;
    }

    // 3. Generate script with Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a professional video scriptwriter. Create a detailed, engaging video script for a ${durationMins}-minute video about: "${topic}".

Requirements:
- Approximately ${config.words} words total
- Divide into ${config.segments} segments/sections
- Each segment must start with a timestamp in format [MM:SS]
- Timestamps should be evenly distributed across ${durationMins} minute(s)
- First timestamp is always [00:00]
- Include an engaging hook in the first 15 seconds
- Use a conversational, engaging tone
- Add natural transitions between segments
- End with a clear call-to-action

Format EXACTLY like this example:
[00:00] Hook & Introduction
Your opening text here...

[00:45] First Main Point
Content for this section...

[01:30] Second Main Point  
Content for this section...

Do NOT include any markdown formatting, headers, or extra explanation. Just the script with timestamps.`;

    const result = await model.generateContent(prompt);
    const scriptText = result.response.text().trim();

    // 4. Save to Script Generator's own database
    const userId = session.user.id;
    
    let savedScript = null;
    try {
      savedScript = await prisma.script.create({
        data: {
          userId,
          userEmail,
          topic,
          duration: durationMins,
          scriptText,
          generationId,
        },
      });
    } catch (dbErr) {
      console.error('DB save failed (non-critical):', dbErr.message);
    }

    // 5. Mark generation complete in Caparison Lab
    if (generationId) {
      await fetch(`${CAPARISON_BASE_URL}/api/v1/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: CAPARISON_API_KEY,
          generationId,
          status: 'COMPLETED',
          metadata: { topic, duration: durationMins, wordCount: scriptText.split(' ').length },
        }),
      }).catch(console.error);
    }

    return NextResponse.json({
      ok: true,
      script: scriptText,
      scriptId: savedScript?.id,
      topic,
      duration: durationMins,
    });

  } catch (err) {
    console.error('[/api/generate]', err);
    
    // If we have a generationId, mark as failed (refund credits)
    if (generationId) {
      try {
        await fetch(`${CAPARISON_BASE_URL}/api/v1/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: CAPARISON_API_KEY,
            generationId,
            status: 'FAILED',
            error: err.message,
          }),
        });
      } catch (refundErr) {
        console.error('Failed to refund credits:', refundErr);
      }
    }

    return NextResponse.json({ 
      error: 'Script generation failed. Please try again.',
      details: err.message,
    }, { status: 500 });
  }
}
