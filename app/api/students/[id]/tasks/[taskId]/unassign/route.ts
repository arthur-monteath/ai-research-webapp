// app/api/students/[id]/tasks/[taskId]/unassign/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(
  request: Request,
  { params }: { params: { id: string; taskId: string } }
) {
  const { id, taskId } = params;

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

  try {
    // Fetch current task assignments
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TaskAssignment!A:B',
    });
    const rows = res.data.values || [];

    // Find the student's row
    const studentRowIndex = rows.findIndex((row) => row[0] === id);

    if (studentRowIndex === -1) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const [_, tasksStr] = rows[studentRowIndex];
    let tasks = tasksStr ? tasksStr.split('|').map((t: string) => t.trim()) : [];

    // Remove the task from the student's task list
    if (tasks.includes(taskId)) {
      tasks = tasks.filter((t: string) => t !== taskId);

      // Update the tasks in the sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `TaskAssignment!B${studentRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[tasks.join(' | ')]],
        },
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Task not found in student's assignments" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error unassigning task from student:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error unassigning task', details: errorMessage },
      { status: 500 }
    );
  }
}
