// app/api/tasks/[id]/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // Decode the base64-encoded service account key
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    return NextResponse.json({ error: 'Service account key not provided' }, { status: 500 });
  }

  const decodedKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf8')
  );

  // Authenticate with Google Sheets API using the decoded credentials
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

    const [id, title, description, assignedToStr] = taskRow;
    const assignedTo = assignedToStr.split(',').map((group: string) => group.trim());

    // Fetch questions
    const questionsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Questions!A:C',
    });
    const questionsRows = questionsRes.data.values || [];

    const questions = questionsRows
      .filter((row) => row[0] === taskId)
      .map((row) => ({ id: row[1], text: row[2] }));

    const task = {
      id,
      title,
      description,
      assignedTo,
      questions,
    };

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Error fetching task' },
      { status: 500 }
    );
  }
}
