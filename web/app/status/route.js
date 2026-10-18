import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Deployment check: GET /status says which mode this build runs in and whether the server (Vercel / cPanel / local) can
 * reach the backend. It exposes only public settings (no secrets).
 */
export async function GET() {
  const started = Date.now();
  const info = { apiMode: config.apiMode, mockFallback: config.mockFallback, apiUrl: config.apiUrl || null, siteUrl: config.siteUrl };
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

  if (config.apiMode !== 'laravel' || !config.apiUrl) {
    return NextResponse.json(
      { ...info, ok: false, problem: 'NEXT_PUBLIC_API_MODE is not "laravel" or NEXT_PUBLIC_API_URL is empty in this build: the site shows demo data. Fix the env vars and redeploy.' },
      { headers },
    );
  }

  try {
    const res = await fetch(`${config.apiUrl.replace(/\/$/, '')}/client/products?per_page=1`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON: a firewall / hosting error page */
    }
    return NextResponse.json(
      {
        ...info,
        ok: res.ok && body?.success !== false,
        httpStatus: res.status,
        products: body?.meta?.total ?? (Array.isArray(body?.data) ? body.data.length : null),
        ms: Date.now() - started,
        message: body?.message ?? (body ? null : `Backend answered with a non-JSON page: ${text.slice(0, 120).replace(/\s+/g, ' ')}`),
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json({ ...info, ok: false, ms: Date.now() - started, problem: `Could not reach the backend from this server: ${error?.cause?.code || error?.name || error?.message}` }, { headers });
  }
}
