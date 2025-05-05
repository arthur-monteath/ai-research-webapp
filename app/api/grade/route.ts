// api/grade/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const {
    studentId,
    taskId,
    questionId,
    grade,
    status,    // X or O
    comment,   // your text
  } = await request.json();

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId     = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!serviceAccountKey || !spreadsheetId) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEETS_SPREADSHEET_ID' },
      { status: 500 }
    );
  }

  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );
  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // fetch all rows
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Responses!A:K',
    });
    const rows = resp.data.values || [];

    // locate the row
    const idx = rows.findIndex(r =>
      r[1] === studentId &&
      r[2] === String(taskId) &&
      r[3] === String(questionId)
    );
    if (idx <= 0) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }
    const rowNumber = idx + 1;

    // write H:K → [Grading Status, Comments, Correct, Grade]
    const updateRange = `Responses!H${rowNumber}:K${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'graded',            // H: Grading Status
          comment  || '',      // I: Comments
          status   || '',      // J: Correct (X/O)
          String(grade)        // K: Grade
        ]]
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: 'Error updating grading', details: e.message },
      { status: 500 }
    );
  }
}
