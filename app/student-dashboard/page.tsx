// app/student-dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Task } from '@/types';

export default function StudentDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Obtain the student ID (replace with actual logic)
  const studentId = 'P001'; // Replace this with the actual student ID

  useEffect(() => {
    const fetchStudentTasks = async () => {
      try {
        const res = await fetch(`/api/students/${studentId}/tasks`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks);
        } else {
          const errorData = await res.json();
          setError(errorData.error || 'Failed to fetch tasks');
        }
      } catch (err) {
        console.error('Error fetching student tasks:', err);
        setError('An error occurred while fetching tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentTasks();
  }, [studentId]);

  const handleStartTask = (taskId: string) => {
    router.push(`/task/${taskId}`);
  };

  if (loading) {
    return (
      <Layout>
        <p>Loading tasks...</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <p>Error: {error}</p>
      </Layout>
    );
  }

  if (tasks.length === 0) {
    return (
      <Layout>
        <p>No tasks assigned to you at this time.</p>
      </Layout>
    );
  }

  // Check if Task 2 is still assigned
  const isTask2Assigned = tasks.some((task) => task.id === '2');

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => {
          // Determine if Task 3 should be locked
          let isLocked = false;

          if (task.id === '3' && isTask2Assigned) {
            isLocked = true;
          }

          return (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{task.description}</CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleStartTask(task.id)}
                  disabled={isLocked}
                  title={isLocked ? 'Complete Task 2 to unlock this task' : ''}
                >
                  {isLocked ? 'Locked' : 'Start Task'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
