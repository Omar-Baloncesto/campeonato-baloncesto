import https from 'https';
import crypto from 'crypto';

const SPREADSHEET_ID = '1JF2vVbrnMYTMC3WrOVVv-vkTICBxh06S0t-40cyPIo0';

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

function httpsRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers,
        agent: getAgent(),
      },
      (res) => {
        let data = '';
        res.on('data', (c: Buffer) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

let tokenCache: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) return null;
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) return tokenCache.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = base64url(crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key));
  const assertion = `${unsigned}.${signature}`;

  const formBody =
    'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer' +
    '&assertion=' + encodeURIComponent(assertion);

  const { status, body } = await httpsRequest(
    'https://oauth2.googleapis.com/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    formBody,
  );

  if (status < 200 || status >= 300) return null;
  try {
    const parsed = JSON.parse(body) as { access_token: string; expires_in: number };
    tokenCache = {
      token: parsed.access_token,
      expires: Date.now() + parsed.expires_in * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

export async function appendVisitRow(values: string[]): Promise<{ ok: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'missing_service_account' };

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
    `/values/${encodeURIComponent('Visitas')}!A:D:append` +
    `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const { status, body } = await httpsRequest(
    url,
    'POST',
    { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    JSON.stringify({ values: [values] }),
  );

  if (status >= 200 && status < 300) return { ok: true };
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return { ok: false, error: parsed.error?.message || `http_${status}` };
  } catch {
    return { ok: false, error: `http_${status}` };
  }
}

export async function readVisitRows(): Promise<string[][]> {
  const token = await getAccessToken();
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  let url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent('Visitas')}!A:D`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  else if (apiKey) url += `?key=${apiKey}`;
  else return [];

  const { status, body } = await httpsRequest(url, 'GET', headers);
  if (status < 200 || status >= 300) return [];
  try {
    const parsed = JSON.parse(body) as { values?: string[][] };
    return parsed.values || [];
  } catch {
    return [];
  }
}
