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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // for grading
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sortMethod, setSortMethod] = useState<'question' | 'student'>();
  const [grade, setGrade] = useState<number | null>(null);

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

  // When using question sorting, we use the responses from the first question of the selected task.
  const getResponse = (index: number) => {
    if (sortMethod === 'question' && selectedTask && selectedTask.questions.length > 0) {
      const responses = selectedTask.questions[0].responses;
      if (!responses || index < 0 || index >= responses.length) return;
      setCurrentIndex(index);
    } else {
      // fallback behavior (if needed) using tasks list length
      if (index < 0 || index >= tasks.length) return;
      setCurrentIndex(index);
    }
  };

  // When the sort method changes, you might want to reset your index
  const changeSortMethod = (method: 'question' | 'student') => {
    setSortMethod(method);
    setCurrentIndex(0);
  };

  // When the currentIndex changes (or a new task is selected) update the local grade state.
  useEffect(() => {
    if (sortMethod === 'question' && selectedTask && selectedTask.questions.length > 0) {
      const responses = selectedTask.questions[0].responses;
      if (responses && responses[currentIndex]) {
        setGrade(responses[currentIndex].grade || null);
      }
    }
  }, [currentIndex, selectedTask, sortMethod]);

  // Function to call the API to update the grade on the database.
  const updateGrade = async () => {
    if (!selectedTask || selectedTask.questions.length === 0) return;
    const responseToUpdate = selectedTask.questions[0].responses?.[currentIndex];
    if (!responseToUpdate) return;
    if (grade === null) return;
    try {
      const res = await fetch('/api/grade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          questionId: selectedTask.questions[0].id,
          studentId: responseToUpdate.studentId,
          grade: grade,
        }),
      });
      if (res.ok) {
        // Optionally update the selectedTask state with the new grade locally:
        setSelectedTask(prev => {
          if (!prev) return prev;
          const updatedQuestions = prev.questions.map((q, idx) => {
            if (idx === 0) { // we are grading the first question
              const updatedResponses = (q.responses ?? []).map((r, j) => {
                if (j === currentIndex) return { ...r, grade: grade };
                return r;
              });
              return { ...q, responses: updatedResponses };
            }
            return q;
          });
          return { ...prev, questions: updatedQuestions };
        });
      } else {
        console.error('Failed to update grade');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="rounded-t-lg flex flex-row justify-between items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-3xl font-black">
                  { sortMethod === 'question'
                    ? 'Question'
                    : sortMethod === 'student'
                    ? 'Student'
                    : 'Sort by...'
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => changeSortMethod('question')}>
                  Question
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeSortMethod('student')}>
                  Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => {
                  getResponse(currentIndex - 1);
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
                      if (sortMethod === 'question' && selectedTask && selectedTask.questions.length > 0) {
                        if (index > 0 && index <= (selectedTask.questions[0].responses?.length || 0)) {
                          getResponse(index - 1);
                          e.target.textContent = index.toString();
                        } else {
                          e.target.textContent = (currentIndex + 1).toString();
                        }
                      } else {
                        if (index > 0 && index <= tasks.length) {
                          getResponse(index - 1);
                          e.target.textContent = index.toString();
                        } else {
                          e.target.textContent = (currentIndex + 1).toString();
                        }
                      }
                    } else {
                      e.target.textContent = (currentIndex + 1).toString();
                    }
                  }}
                >
                  {currentIndex + 1}
                </span>
                <span>/ { sortMethod === 'question' && selectedTask && selectedTask.questions.length > 0
                  ? selectedTask.questions[0].responses?.length
                  : tasks.length }</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  getResponse(currentIndex + 1);
                }}
              >
                <ChevronRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-x-4 flex flex-row">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  onClick={() => {
                    // Set the selected task and reset response index to 0
                    setSelectedTask(task);
                    setCurrentIndex(0);
                  }}
                  className={selectedTask?.id === task.id ? "border-2 border-blue-500 cursor-pointer" : "cursor-pointer"}
                >
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
                    {/* Additional footer content if needed */}
                  </CardFooter>
                </Card>
              ))}
            </div>
            {/* Grading Interface for Question Sorting */}
            {sortMethod === 'question' ? (
              selectedTask && selectedTask.questions.length > 0 && selectedTask.questions[0].responses ? (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Grading Response</h2>
                  <div className="mb-4 p-4 border rounded">
                    <p>
                      <strong>Response:</strong>{" "}
                      {selectedTask.questions[0].responses[currentIndex]?.answer || "No response"}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Button
                          key={value}
                          variant={
                            selectedTask.questions[0].responses?.[currentIndex]?.grade === value
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setGrade(value)}
                          className={
                            "font-bold text-lg " +
                            (value === 1 ? "rounded-none rounded-l-lg" : value === 5 ? "rounded-none rounded-r-lg" : "rounded-none")
                          }
                        >
                          {value}
                        </Button>
                      ))}
                      <Button onClick={updateGrade} className="w-10 ml-2 rounded-full">
                        <RotateCw />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4">Please select a task with at least one question and responses to grade.</p>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
