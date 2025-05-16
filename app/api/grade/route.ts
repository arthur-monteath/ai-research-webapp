// app/api/grade/route.ts
import { NextResponse } from 'next/server';
import { google }       from 'googleapis';

const COLUMN_MAP: Record<string, string> = {
  Grade1: 'H',
  Grade2: 'I',
  Grade3: 'J',
  Grade4: 'K',
  Grade5: 'L',
  Grade6: 'M',
};

export async function POST(request: Request) {
  const {
    studentId,
    taskId,
    questionId,
    gradingId,   // "Grade1" … "Grade6"
    value,       // score to write
  } = await request.json();

  /* ---------- auth ---------- */
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const ss  = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!key || !ss) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }
  const creds = JSON.parse(Buffer.from(key, 'base64').toString('utf8'));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  /* ---------- validate gradingId ---------- */
  const colLetter = COLUMN_MAP[gradingId];
  if (!colLetter) {
    return NextResponse.json(
      { error: `Unknown gradingId "${gradingId}"` },
      { status: 400 },
    );
  }

  try {
    /* ---------- locate row ---------- */
    const full = await sheets.spreadsheets.values.get({
      spreadsheetId: ss,
      range: 'Responses!A:M',
    });
    const rows = full.data.values || [];

    const idx = rows.findIndex(
      (r) =>
        r[1] === studentId &&   // col B
        r[2] === taskId    &&   // col C
        r[3] === questionId     // col D
    );

    if (idx < 1) {                   // 0 is header
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }
    const rowNum = idx + 1;          // 1-based for A1 notation

    /* ---------- write value ---------- */
    const range = `Responses!${colLetter}${rowNum}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: ss,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error writing grade:', e);
    return NextResponse.json(
      { error: 'Error writing grade', details: e.message || String(e) },
      { status: 500 },
    );
  }
}
