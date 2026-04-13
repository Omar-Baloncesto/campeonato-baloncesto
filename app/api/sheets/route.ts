import { NextResponse } from 'next/server';
import https from 'https';

const SPREADSHEET_ID = '1JF2vVbrnMYTMC3WrOVVv-vkTICBxh06S0t-40cyPIo0';
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

// Node.js native fetch() does not honour the HTTPS_PROXY / https_proxy
// environment variables.  We therefore build an explicit proxy agent from
// Next.js's own bundled https-proxy-agent so that requests to
// sheets.googleapis.com are routed correctly through the egress proxy.
function getAgent(): https.Agent | undefined {
  const proxyUrl =
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpsProxyAgent } = require('next/dist/compiled/https-proxy-agent') as {
      HttpsProxyAgent: new (url: string) => https.Agent;
    };
    return new HttpsProxyAgent(proxyUrl);
  } catch {
    return undefined;
  }
}

function httpsGet(url: string, agent: https.Agent | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        agent,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk; });
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheet = searchParams.get('sheet') || 'EQUIPOS';
    const range = searchParams.get('range') || 'A:Z';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheet)}!${range}?key=${API_KEY}`;

    const agent = getAgent();
    const body = await httpsGet(url, agent);

    let data: { error?: { message: string }; values?: string[][] };
    try {
      data = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Respuesta inválida de Google Sheets' },
        { status: 500 }
      );
    }

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.values || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al leer Google Sheets' },
      { status: 500 }
    );
  }
}
