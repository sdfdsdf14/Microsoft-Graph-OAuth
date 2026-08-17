import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getValidAccessToken, graphFetch, persistRefreshedSession } from '../../../lib/graph';

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80) || 'untitled';
}

export async function POST(request) {
  const tokenResult = await getValidAccessToken();
  if (tokenResult.error) {
    return NextResponse.json({ error: tokenResult.error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const folderId = body.folderId;
  const startFrom = Math.max(1, parseInt(body.startFrom, 10) || 1);
  const limit = Math.max(1, Math.min(500, parseInt(body.limit, 10) || 50));

  if (!folderId) {
    return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
  }

  const skip = startFrom - 1;
  const pageSize = Math.min(limit, 50);
  const zip = new JSZip();
  let fetched = 0;
  let nextUrl =
    `/me/mailFolders/${folderId}/messages` +
    `?$top=${pageSize}&$skip=${skip}` +
    `&$select=subject,from,receivedDateTime,body` +
    `&$orderby=receivedDateTime desc`;

  try {
    while (fetched < limit && nextUrl) {
      const data = await graphFetch(nextUrl, {
        accessToken: tokenResult.accessToken,
        textBody: true, // asks Graph to return body.content as plain text, not HTML
      });

      for (const msg of data.value) {
        if (fetched >= limit) break;
        fetched += 1;

        const date = msg.receivedDateTime ? msg.receivedDateTime.slice(0, 10) : 'unknown-date';
        const from = msg.from?.emailAddress?.address || 'unknown-sender';
        const subject = msg.subject || '(no subject)';
        const text = msg.body?.content || '';

        const filename = `${String(fetched).padStart(4, '0')}_${date}_${sanitizeFilename(subject)}.txt`;
        const fileContent = `From: ${from}\nDate: ${date}\nSubject: ${subject}\n\n${text}`;
        zip.file(filename, fileContent);
      }

      nextUrl = data['@odata.nextLink'] || null;
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const response = new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="email_extraction.zip"',
        'X-Extracted-Count': String(fetched),
      },
    });
    return persistRefreshedSession(response, tokenResult);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
