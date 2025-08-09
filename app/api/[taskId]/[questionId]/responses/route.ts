// app/api/[taskId]/[questionId]/responses/route.ts
import { NextResponse } from 'next/server';
import { google }      from 'googleapis';

interface Context { params: { taskId: string; questionId: string } }

export async function GET(
  request: Request,
  { params }: Context
) {
  const { taskId, questionId } = params;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const id  = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!key || !id) {
    return NextResponse.json(
      { error: 'Missing credentials' },
      { status: 500 }
    );
  }

  const creds = JSON.parse(Buffer.from(key, 'base64').toString('utf8'));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // grab Time… through Grade6
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: 'Responses!A:N',
    });
    const rows = resp.data.values || [];

    // skip header, filter by TaskId (col C) & QuestionId (col D)
    const data = rows.slice(1).filter(r =>
      r[2] === taskId && r[3] === questionId
    );

    const responses = data.map(r => ({
      studentId:     r[1]             || '',
      answer:        r[5]             || '',
      grades: {
        Grade1: r[7]  || '',
        Grade2: r[8]  || '',
        Grade3: r[9]  || '',
        Grade4: r[10] || '',
        Grade5: r[11] || '',
        GradeFinal: r[12] || '',
        GradeAI: r[13] || '',
      }
    }));

    return NextResponse.json({ responses });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: 'Error fetching responses', details: e.message },
      { status: 500 }
    );
  }
}
