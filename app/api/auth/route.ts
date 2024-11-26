import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { id } = await request.json()

  // Simulate API call to Google Sheets
  const isTeacher = id === 'teacher123'
  const studentGroups = {
    'student1': 'group1',
    'student2': 'group2',
    'student3': 'group3',
  }

  if (isTeacher) {
    return NextResponse.json({ role: 'teacher' })
  } else if (id in studentGroups) {
    return NextResponse.json({ role: 'student' })
  } else {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 401 })
  }
}

