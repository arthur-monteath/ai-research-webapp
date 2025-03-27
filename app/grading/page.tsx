// app/task-editor/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Task, Question } from '@/types';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Grading() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sortMethod, setSortMethod] = useState<'question' | 'student'>();

  useEffect(() => {
    const fetchTasksAndAssignments = async () => {
      try {
        // Fetch tasks
        const resTasks = await fetch('/api/tasks');
        const tasksData: Task[] = await resTasks.json();
        setTasks(tasksData);

        // Fetch task assignments
        const resAssignments = await fetch('/api/task-assignments');
        const { taskAssignments } = await resAssignments.json();

        // Compute assignment status
        const assignmentStatusMap: {
          [taskId: string]: 'none' | 'some' | 'all';
        } = {};
        const studentIds = Object.keys(taskAssignments);
        const totalStudents = studentIds.length;

        tasksData.forEach((task) => {
          let studentsWithTask = 0;
          studentIds.forEach((studentId) => {
            if (taskAssignments[studentId].includes(task.id)) {
              studentsWithTask += 1;
            }
          });

          assignmentStatusMap[task.id] =
            studentsWithTask === 0
              ? 'none'
              : studentsWithTask === totalStudents
              ? 'all'
              : 'some';
        });

      } catch (error) {
        console.error('Error fetching tasks or assignments:', error);
      }
    };

    fetchTasksAndAssignments();
  }, []);

  /*const handleCreateTask = async () => {
    if (newTask.title && newTask.description) {
      setIsCreating(true);
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTask),
        });

        const result = await response.json();

        if (response.ok) {
          // Refresh the tasks list
          setTasks([...tasks, { ...newTask, id: result.id } as Task]);
          setNewTask({ title: '', description: '', questions: [] });
        } else {
          console.error('Error creating task:', result.error);
        }
      } catch (error) {
        console.error('Error creating task:', error);
      } finally {
        setIsCreating(false);
      }
    }
  };*/

  const handleUpdateTask = async () => {
    if (editingTask && editingTask.title && editingTask.description) {
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editingTask),
        });

        const result = await response.json();

        if (response.ok) {
          // Update the task in the tasks list
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === editingTask.id ? editingTask : task
            )
          );
          setEditingTask(null);
        } else {
          console.error('Error updating task:', result.error);
        }
      } catch (error) {
        console.error('Error updating task:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const getResponse = async (index: number) => {
    if (index < 0 || index >= tasks.length)
      return;
    
    setCurrentIndex(index);
  }

  const changeSortMethod = (method: 'question' | 'student') => {
    setSortMethod(method);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader className='rounded-t-lg flex flex-row justify-between align-middle'>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className='text-3xl font-black'>{
                        sortMethod === 'question' ? 'Question' :
                        sortMethod === 'student' ? 'Student' : 'Sort by...'
                    }</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => changeSortMethod('question')}>Question</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeSortMethod('student')}>Student</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <div></div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                getResponse(currentIndex-1);
              }}
            >
              <ChevronLeft />
            </Button>
            <div className="flex items-center space-x-2">
              <span
              contentEditable
              suppressContentEditableWarning
              className="text-center outline-none"
              onBlur={(e) => {
                const index = parseInt(e.target.textContent || '', 10);

                if (!isNaN(index)) {
                  if (index > 0 && index <= tasks.length)
                  {
                    getResponse(index-1);
                    e.target.textContent = (index).toString();
                  }
                  else {
                    e.target.textContent = (currentIndex+1).toString();
                  }
                }
                else {
                  e.target.textContent = (currentIndex+1).toString();
                }
              }}
              >
              {currentIndex+1}
              </span>
              <span>/ {tasks.length}</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                getResponse(currentIndex+1);
              }}
            >
              <ChevronRight />
            </Button>
          </div>
          </CardHeader>
          <CardContent>
            <div className="space-x-4 flex flex-row"> 
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <CardTitle>{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2">{task.description}</p>
                    <p className="font-bold">
                      Number of questions: {task.questions.length}
                    </p>
                  </CardContent>
                  <CardFooter>
                    
                  </CardFooter>
                </Card>
              ))}
            </div>
            {/*TO-DO*/}
            <div className="flex justify-between mt-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    variant={tasks[currentIndex]?.grade === value - 1 ? "default" : "outline"}
                    onClick={() => console.log(`Graded with: ${value}`)}
                    className={"font-bold text-lg " + (value == 1 ? 'rounded-none rounded-l-lg' : value == 5 ? 'rounded-none rounded-r-lg' : 'rounded-none')}
                  >
                    {value}
                  </Button>
                ))}
                {
                  <Button onClick={/*update grade on the database*/} className='w-10 ml-2 rounded-full'><RotateCw /></Button>
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
