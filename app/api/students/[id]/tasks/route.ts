// app/api/students/[id]/tasks/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const studentId = params.id;

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
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  try {
    // Fetch task assignments
    const assignmentRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TaskAssignment!A:B',
    });
    const assignmentRows = assignmentRes.data.values || [];

    // Find the student's assigned tasks
    const studentRow = assignmentRows.find((row) => row[0] === studentId);
    if (!studentRow) {
      return NextResponse.json({ tasks: [] }); // Student not found or no tasks assigned
    }

    const tasksStr = studentRow[1];
    const assignedTaskIds = tasksStr
      ? tasksStr.split('|').map((id: string) => id.trim())
      : [];

    if (assignedTaskIds.length === 0) {
      return NextResponse.json({ tasks: [] }); // No tasks assigned
    }

    // Fetch tasks
    const tasksRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Tasks!A:D',
    });
    const tasksRows = tasksRes.data.values || [];

    // Build the tasks assigned to the student
    const tasks = tasksRows
      .filter((row) => assignedTaskIds.includes(row[0]))
      .map((row) => {
        const [id, title, description, questionsStr] = row;
        const questions = questionsStr
          ? questionsStr.split('|').map((text: string, index: number) => ({
              id: `${id}-${index + 1}`,
              text: text.trim(),
            }))
          : [];
        return { id, title, description, questions };
      });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching student tasks:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error fetching student tasks', details: errorMessage },
      { status: 500 }
    );
  }
}
