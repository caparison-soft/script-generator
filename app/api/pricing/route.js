export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const CAPARISON_BASE_URL = process.env.CAPARISON_BASE_URL;
const CAPARISON_API_KEY = process.env.CAPARISON_API_KEY;

/**
 * GET /api/pricing
 * 
 * Proxy endpoint for the frontend to fetch pricing rules from Caparison Lab.
 * Caches the response for 5 minutes to avoid hammering the platform.
 */
export async function GET() {
  try {
    if (!CAPARISON_API_KEY || CAPARISON_API_KEY === 'PASTE_YOUR_API_KEY_FROM_ADMIN_PANEL_HERE') {
      // Dev mode — return a default pricing table
      return NextResponse.json({
        ok: true,
        defaultCost: 10,
        pricingRules: null,
        pricingLabels: null,
      });
    }

    const res = await fetch(`${CAPARISON_BASE_URL}/api/v1/pricing`, {
      headers: { Authorization: `Bearer ${CAPARISON_API_KEY}` },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch (err) {
    console.error('[/api/pricing] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}
