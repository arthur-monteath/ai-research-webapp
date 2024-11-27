// app/api/tasks/[id]/assignment-status/route.ts

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
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TaskAssignment!A:B',
    });
    const rows = res.data.values || [];

    // Total number of students
    const totalStudents = rows.length - 1; // Exclude header row
    let studentsWithTask = 0;

    // Iterate over each student assignment
    for (let i = 1; i < rows.length; i++) {
      const [studentId, tasksStr] = rows[i];
      const tasks = tasksStr ? tasksStr.split('|').map((t: string) => t.trim()) : [];
      if (tasks.includes(taskId)) {
        studentsWithTask += 1;
      }
    }

    let assignmentStatus: 'none' | 'some' | 'all' = 'none';
    if (studentsWithTask === totalStudents) {
      assignmentStatus = 'all';
    } else if (studentsWithTask > 0) {
      assignmentStatus = 'some';
    }

    return NextResponse.json({ assignmentStatus });
  } catch (error) {
    console.error('Error fetching assignment status:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error fetching assignment status', details: errorMessage },
      { status: 500 }
    );
  }
}
