import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
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
    // read tasks from Tasks!A:D
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A:D',
    });
    const rows = res.data.values || [];

    // map to Task objects
    const tasks = rows.map((row) => {
      const [id, title, description, questionsStr] = row;
      const questions = questionsStr
        ? questionsStr.split('|').map((text:string, i:number) => ({
            id: `${i + 1}`,
            text: text.trim(),
          }))
        : [];
      return { id, title, description, questions };
    });

    return NextResponse.json(tasks);
  } catch (e: any) {
    console.error('Error fetching tasks:', e);
    return NextResponse.json(
      { error: 'Error fetching tasks', details: e.message || String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { title, description, questions } = await request.json();
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
    // determine next Task ID
    const listRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A:A',
    });
    const ids = listRes.data.values || [];
    const lastId = ids.length > 1 ? parseInt(ids[ids.length - 1][0], 10) : 0;
    const taskId = (lastId + 1).toString();

    // build question string
    const questionsStr = questions.map((q: any) => q.text).join(' | ');

    // append new task
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Tasks!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[taskId, title, description, questionsStr]],
      },
    });

    return NextResponse.json({ success: true, id: taskId });
  } catch (e: any) {
    console.error('Error creating task:', e);
    return NextResponse.json(
      { error: 'Error creating task', details: e.message || String(e) },
      { status: 500 }
    );
  }
}
