import { cookies } from 'next/headers';

const SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Mail.Read',
].join(' ');

const COOKIE_NAME = 'ms_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function scopes() {
  return SCOPES;
}

function decodeSession(raw) {
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export function encodeSessionCookieValue(session) {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export function cookieName() {
  return COOKIE_NAME;
}

export async function getSession() {
  const store = cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

async function requestToken(body) {
  const tenant = process.env.MS_TENANT_ID || 'common';
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || 'Token request failed');
    err.data = data;
    throw err;
  }
  return data;
}

export async function exchangeCodeForToken(code) {
  return requestToken({
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.MS_REDIRECT_URI,
    scope: SCOPES,
  });
}

async function refreshToken(refresh_token) {
  return requestToken({
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token,
    scope: SCOPES,
  });
}

// Returns { accessToken, session, refreshed } or { error }
export async function getValidAccessToken() {
  const session = await getSession();
  if (!session) return { error: 'not_authenticated' };

  if (Date.now() < session.expires_at - 60_000) {
    return { accessToken: session.access_token, session, refreshed: false };
  }

  try {
    const tokenData = await refreshToken(session.refresh_token);
    const newSession = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || session.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };
    return { accessToken: newSession.access_token, session: newSession, refreshed: true };
  } catch (e) {
    return { error: 'refresh_failed' };
  }
}

export async function graphFetch(path, { accessToken, textBody = false } = {}) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (textBody) {
    headers['Prefer'] = 'outlook.body-content-type="text"';
  }
  const url = path.startsWith('http') ? path : `https://graph.microsoft.com/v1.0${path}`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Graph API request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Helper for route handlers: attach a refreshed session cookie to a response if needed.
export function persistRefreshedSession(response, tokenResult) {
  if (tokenResult.refreshed) {
    response.cookies.set(COOKIE_NAME, encodeSessionCookieValue(tokenResult.session), sessionCookieOptions());
  }
  return response;
}
