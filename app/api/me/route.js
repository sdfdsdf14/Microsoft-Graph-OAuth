import { NextResponse } from 'next/server';
import { getValidAccessToken, graphFetch, persistRefreshedSession } from '../../../lib/graph';

export async function GET() {
  const tokenResult = await getValidAccessToken();
  if (tokenResult.error) {
    return NextResponse.json({ connected: false });
  }

  try {
    const me = await graphFetch('/me?$select=mail,userPrincipalName,displayName', {
      accessToken: tokenResult.accessToken,
    });
    const response = NextResponse.json({
      connected: true,
      email: me.mail || me.userPrincipalName,
      name: me.displayName,
    });
    return persistRefreshedSession(response, tokenResult);
  } catch (e) {
    return NextResponse.json({ connected: false });
  }
}
