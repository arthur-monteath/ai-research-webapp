// app/api/[taskId]/[questionId]/responses/route.ts
import { NextResponse } from 'next/server';
import { google }      from 'googleapis';

interface Params {
  params: {
    taskId: string;
    questionId: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  const { taskId, questionId } = params;

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId     = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!serviceAccountKey || !spreadsheetId) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEETS_SPREADSHEET_ID' },
      { status: 500 }
    );
  }

  // decode and authenticate
  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );
  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 1) pull down all rows from Responses!A:K
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Responses!A:K',
    });
    const allRows = resp.data.values || [];

    // 2) skip header row, then filter by taskId (col C) & questionId (col D)
    const dataRows = allRows.slice(1).filter(row =>
      row[2] === taskId && row[3] === questionId
    );

    // 3) map into the shape your UI expects
    const responses = dataRows.map(row => ({
      studentId: row[1] ?? '',             // column B
      answer:    row[4] ?? '',             // column E
      // row[5] might be chatLogs if you need them
      gradingStatus: row[7] ?? '',         // column H
      comment:       row[8] ?? '',         // column I
      status:        row[9] ?? '',         // column J (X/O)
      grade:         row[10] != null
                       ? parseInt(row[10], 10)
                       : null,            // column K
    }));

    return NextResponse.json({ responses });
  } catch (e: any) {
    console.error('Error fetching responses:', e);
    return NextResponse.json(
      { error: 'Error fetching responses', details: e.message || e.toString() },
      { status: 500 }
    );
  }
}
