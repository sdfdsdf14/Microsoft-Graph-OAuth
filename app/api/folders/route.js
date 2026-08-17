import { NextResponse } from 'next/server';
import { getValidAccessToken, graphFetch, persistRefreshedSession } from '../../../lib/graph';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tokenResult = await getValidAccessToken();
  if (tokenResult.error) {
    return NextResponse.json({ error: tokenResult.error }, { status: 401 });
  }

  try {
    const data = await graphFetch(
      '/me/mailFolders?$top=100&$select=id,displayName,totalItemCount',
      { accessToken: tokenResult.accessToken }
    );

    const response = NextResponse.json({
      folders: data.value.map((f) => ({
        id: f.id,
        name: f.displayName,
        count: f.totalItemCount,
      })),
    });
    return persistRefreshedSession(response, tokenResult);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
