import { NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  encodeSessionCookieValue,
  sessionCookieOptions,
  cookieName,
} from '../../../../lib/graph';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(errorDescription || error)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const session = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };

    const response = NextResponse.redirect(`${origin}/`);
    response.cookies.set(cookieName(), encodeSessionCookieValue(session), sessionCookieOptions());
    return response;
  } catch (e) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(e.message)}`);
  }
}
