// app/api/tasks/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

export async function GET(request: Request) {
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

    // Fetch questions
    const questionsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Questions!A:C',
    });
    const questionsRows = questionsRes.data.values || [];

    // Build tasks
    const tasksMap: { [key: string]: any } = {};

    for (const row of tasksRows) {
      const [id, title, description, assignedToStr] = row;
      const assignedTo = assignedToStr.split(',').map((group: string) => group.trim());
      tasksMap[id] = {
        id,
        title,
        description,
        assignedTo,
        questions: [],
      };
    }

    // Add questions to tasks
    for (const row of questionsRows) {
      const [taskId, questionId, text] = row;
      if (tasksMap[taskId]) {
        tasksMap[taskId].questions.push({
          id: questionId,
          text,
        });
      }
    }

    const tasks = Object.values(tasksMap);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Error fetching tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
    const body = await request.json();
    const { title, description, assignedTo, questions } = body;
  
    const taskId = Date.now().toString();
  
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
      // Append task
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Tasks!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[taskId, title, description, assignedTo.join(', ')]],
        },
      });
  
      // Append questions
      if (questions && questions.length > 0) {
        const questionValues = questions.map((q: any) => [
          taskId,
          q.id || Date.now().toString(),
          q.text,
        ]);
  
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Questions!A:C',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: questionValues,
          },
        });
      }
  
      return NextResponse.json({ success: true, id: taskId });
    } catch (error) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { error: 'Error creating task' },
        { status: 500 }
      );
    }
  }
  