// app/api/tasks/[id]/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // Authenticate with Google Sheets API
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    return NextResponse.json({ error: 'Service account key not provided' }, { status: 500 });
  }

  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );

  const auth = new google.auth.GoogleAuth({
    credentials: decodedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  try {
    // Fetch tasks
    const tasksRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A:D',
    });
    const tasksRows = tasksRes.data.values || [];

    // Find the task
    const taskRow = tasksRows.find((row) => row[0] === taskId);
    if (!taskRow) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const [id, title, description, questionsStr] = taskRow;

    // Split the questions string by '|' and map to Question objects
    const questions = questionsStr
      ? questionsStr.split('|').map((text: string, index: number) => ({
          id: `${id}-${index + 1}`,
          text: text.trim(),
        }))
      : [];

    const task = {
      id,
      title,
      description,
      questions,
    };

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error fetching task', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // Authenticate with Google Sheets API
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return NextResponse.json(
      { error: 'Service account key not provided' },
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
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const body = await request.json();
  const { title, description, questions } = body;

  try {
    // Fetch tasks to find the row number of the task to update
    const tasksRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A:D',
    });
    const tasksRows = tasksRes.data.values || [];

    // Find the index of the task
    const rowIndex = tasksRows.findIndex((row) => row[0] === taskId);

    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Combine questions into a single string separated by '|'
    const questionsStr = questions.map((q: any) => q.text).join(' | ');

    // Update the task
    const updateRange = `Tasks!B${rowIndex + 1}:D${rowIndex + 1}`; // +1 because rows are 1-indexed

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[title, description, questionsStr]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error updating task', details: errorMessage },
      { status: 500 }
    );
  }
}