// app/api/tasks/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
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
    // Fetch tasks from the sheet
    const tasksRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A:D', // Assuming your sheet is named 'Tasks'
    });
    const tasksRows = tasksRes.data.values || [];

    // Map over the rows to create Task objects
    const tasks = tasksRows.map((row) => {
      const [id, title, description, questionsStr] = row;

      // Split the questions string by '|' and map to Question objects
      const questions = questionsStr
        ? questionsStr.split('|').map((text: string, index: number) => ({
            id: `${id}-${index + 1}`, // Create a unique id for each question
            text: text.trim(),
          }))
        : [];

      return {
        id,
        title,
        description,
        questions,
      };
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error fetching tasks', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
    const body = await request.json();
    const { title, description, questions } = body;
  
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
    if (!serviceAccountKey) {
      return NextResponse.json({ error: 'Service account key not provided' }, { status: 500 });
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
  
    try {
      // Fetch existing tasks to determine the next TaskId
      const tasksRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Tasks!A:A',
      });
      const tasksRows = tasksRes.data.values || [];
      const lastTaskId = tasksRows.length > 1 ? parseInt(tasksRows[tasksRows.length - 1][0]) : 0;
      const taskId = (lastTaskId + 1).toString();
  
      // Combine questions into a single string separated by '|'
      const questionsStr = questions.map((q: any) => q.text).join(' | ');
  
      // Append task
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Tasks!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[taskId, title, description, questionsStr]],
        },
      });
  
      return NextResponse.json({ success: true, id: taskId });
    } catch (error) {
      console.error('Error creating task:', error);
  
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
  
      return NextResponse.json(
        { error: 'Error creating task', details: errorMessage },
        { status: 500 }
      );
    }
  }
  