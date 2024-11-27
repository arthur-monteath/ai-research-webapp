// app/api/tasks/[id]/assign-to-all/route.ts

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(
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

  try {
    // Fetch current task assignments
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'TaskAssignment!A:B',
    });
    const rows = res.data.values || [];

    // Prepare data for batch update
    const dataToUpdate = [];

    for (let i = 1; i < rows.length; i++) {
      const [studentId, tasksStr] = rows[i];
      const tasks = tasksStr ? tasksStr.split('|').map((t: string) => t.trim()) : [];

      if (!tasks.includes(taskId)) {
        tasks.push(taskId);
        dataToUpdate.push({
          range: `TaskAssignment!B${i + 1}`, // +1 because rows are 1-indexed and first row is header
          values: [[tasks.join(' | ')]],
        });
      }
    }

    if (dataToUpdate.length > 0) {
      // Perform batch update
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          data: dataToUpdate,
          valueInputOption: 'USER_ENTERED',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning task to all students:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: 'Error assigning task', details: errorMessage },
      { status: 500 }
    );
  }
}
