// api/grade/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  const {
    studentId,
    taskId,
    questionId,
    gradingStatus,
    comments,
    correct,
    grade,
  } = await request.json();

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId    = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!serviceAccountKey || !spreadsheetId) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEETS_SPREADSHEET_ID' },
      { status: 500 }
    );
  }

  // decode service account
  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );

  // full spreadsheet scope for updating
  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 1) fetch all responses
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Responses!A:K',
    });
    const rows = resp.data.values || [];

    // 2) find the data row (skip header row at index 0)
    const idx = rows.findIndex((r) =>
      r[1] === studentId &&
      r[2] === String(taskId) &&
      r[3] === String(questionId)
    );
    if (idx <= 0) {
      return NextResponse.json(
        { error: 'Row not found for given student/task/question' },
        { status: 404 }
      );
    }

    // sheet rows are 1-based, so rowNumber = idx + 1
    const rowNumber = idx + 1;

    // 3) update columns H, I, J, K on that row
    const updateRange = `Responses!H${rowNumber}:K${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          gradingStatus,
          comments ?? '',
          // cast boolean or string
          correct != null ? String(correct) : '',
          grade != null   ? String(grade)   : ''
        ]]
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating grading:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error updating grading', details: msg },
      { status: 500 }
    );
  }
}
