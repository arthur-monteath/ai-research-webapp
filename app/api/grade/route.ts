// app/api/grade/route.ts
import { NextResponse } from 'next/server';
import { google }       from 'googleapis';

const COLUMN_MAP: Record<string, string> = {
  Grade1: 'H',
  Grade2: 'I',
  Grade3: 'J',
  Grade4: 'K',
  Grade5: 'L',
  GradeFinal: 'M',
  GradeAI: 'N',
};

const ALLOWED_GRADERS = new Set(['Grade1','Grade2','Grade3','Grade4','Grade5']);

export async function POST(request: Request) {
  const {
    studentId,
    taskId,
    questionId,
    gradingId,   // "Grade1" … "Grade6"
    value,       // score to write
  } = await request.json().catch(() => ({}));

  if (!studentId || !taskId || !questionId || value === undefined || value === null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!gradingId || !ALLOWED_GRADERS.has(gradingId)) {
    return NextResponse.json({ error: `Invalid gradingId "${gradingId}"` }, { status: 400 });
  }

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

  try {
    // Find the row (header is row 1)
    const full = await sheets.spreadsheets.values.get({
      spreadsheetId: ss,
      range: 'Responses!A:D',
    });
    const rows = full.data.values || [];
    const idx = rows.findIndex((r, i) =>
      i > 0 &&
      String(r[1]) === String(studentId) &&
      String(r[2]) === String(taskId) &&
      String(r[3]) === String(questionId)
    );
    if (idx < 0) return NextResponse.json({ error: 'Row not found' }, { status: 404 });

    const rowNum = idx + 1; // A1 is 1-based
    const graderCol = COLUMN_MAP[gradingId];
    const finalCol  = COLUMN_MAP['GradeFinal'];

    // Write to the grader’s column AND to GradeFinal
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: ss,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `Responses!${graderCol}${rowNum}`, values: [[value]] },
          { range: `Responses!${finalCol}${rowNum}`,  values: [[value]] },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error writing grade:', e);
    return NextResponse.json({ error: 'Error writing grade', details: e.message || String(e) }, { status: 500 });
  }
}
