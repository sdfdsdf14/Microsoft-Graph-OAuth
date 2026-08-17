import { NextResponse } from 'next/server';
import { scopes } from '../../../../lib/graph';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const clientId = process.env.MS_CLIENT_ID;
  const tenant = process.env.MS_TENANT_ID || 'common';
  const redirectUri = process.env.MS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Server is missing MS_CLIENT_ID or MS_REDIRECT_URI environment variables.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const loginHint = searchParams.get('email');

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_mode', 'query');
  authorizeUrl.searchParams.set('scope', scopes());

  // If the user typed their email on our page, pass it through so Microsoft's
  // own login page pre-fills it — we never see or handle their password.
  if (loginHint) {
    authorizeUrl.searchParams.set('login_hint', loginHint);
  } else {
    authorizeUrl.searchParams.set('prompt', 'select_account');
  }

  return NextResponse.redirect(authorizeUrl.toString());
}
