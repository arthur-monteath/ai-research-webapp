'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Task, Question } from '@/types';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import ReactMarkdown and plugins
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function Grading() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sortMethod, setSortMethod] = useState<'question' | 'student'>('question');
  const [grade, setGrade] = useState<number | null>(null);
  const [toggleStatus, setToggleStatus] = useState<'X' | 'D'>('X');
  const [comment, setComment] = useState<string>('');

  // Fetch tasks and assignments on mount.
  useEffect(() => {
    const fetchTasksAndAssignments = async () => {
      try {
        const resTasks = await fetch('/api/tasks');
        if (!resTasks.ok) throw new Error('Failed to fetch tasks');
        const tasksData: Task[] = await resTasks.json();
        setTasks(tasksData);

        const resAssignments = await fetch('/api/task-assignments');
        if (!resAssignments.ok) throw new Error('Failed to fetch task assignments');
        const { taskAssignments } = await resAssignments.json();

        // Optionally process assignments here.
        const assignmentStatusMap: { [taskId: string]: 'none' | 'some' | 'all' } = {};
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

  // Update response index when using question sort.
  const getResponse = (index: number) => {
    if (sortMethod === 'question' && selectedTask && selectedTask.questions.length > 0) {
      const responses = selectedTask.questions[0].responses;
      if (!responses || index < 0 || index >= responses.length) return;
      setCurrentIndex(index);
    } else {
      if (index < 0 || index >= tasks.length) return;
      setCurrentIndex(index);
    }
  };

  // Change sort method and reset index.
  const changeSortMethod = (method: 'question' | 'student') => {
    setSortMethod(method);
    setCurrentIndex(0);
  };

  // Sync grade when current response changes.
  useEffect(() => {
    if (sortMethod === 'question' && selectedTask && selectedTask.questions.length > 0) {
      const responses = selectedTask.questions[0].responses;
      if (responses && responses[currentIndex]) {
        setGrade(responses[currentIndex].grade || null);
      }
    }
  }, [currentIndex, selectedTask, sortMethod]);

  // Handle task selection and fetch responses for the task’s first question.
  const handleSelectTask = async (task: Task) => {
    setSelectedTask(task);
    setCurrentIndex(0);
    // Reset toggle and comment on new selection.
    setToggleStatus('X');
    setComment('');
    if (task.questions.length > 0) {
      try {
        const res = await fetch(`/api/${task.id}/${task.questions[0].id}/responses`);
        if (!res.ok) throw new Error('Failed to fetch responses');
        const data = await res.json();
        const updatedTask: Task = {
          ...task,
          questions: task.questions.map((q, idx) =>
            idx === 0 ? { ...q, responses: data.responses } : q
          ),
        };
        setSelectedTask(updatedTask);
      } catch (error) {
        console.error('Error fetching responses:', error);
      }
    }
  };

  // Update the grade (with status and comment) via API.
  const updateGrade = async () => {
    if (!selectedTask || selectedTask.questions.length === 0) return;
    const responseToUpdate = selectedTask.questions[0].responses?.[currentIndex];
    if (!responseToUpdate || grade === null) return;
    try {
      const res = await fetch('/api/grade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          questionId: selectedTask.questions[0].id,
          studentId: responseToUpdate.studentId,
          grade,
          status: toggleStatus, // "X" or "D"
          comment,
        }),
      });
      if (res.ok) {
        // Update the grade, status, and comment in the local state.
        setSelectedTask((prev) => {
          if (!prev) return prev;
          const updatedQuestions = prev.questions.map((q, idx) => {
            if (idx === 0) {
              const updatedResponses = (q.responses || []).map((r, j) =>
                j === currentIndex ? { ...r, grade, status: toggleStatus, comment } : r
              );
              return { ...q, responses: updatedResponses };
            }
            return q;
          });
          return { ...prev, questions: updatedQuestions };
        });
      } else {
        console.error('Failed to update grade');
      }
    } catch (error) {
      console.error('Error updating grade:', error);
    }
  };

  // Parse chat logs: they might be stored as a JSON string.
  /*const rawChatLogs = selectedTask?.questions[0].responses?.[currentIndex]?.chatLogs;
  let chatMessages: any[] = [];
  if (rawChatLogs) {
    if (typeof rawChatLogs === 'string') {
      try {
        chatMessages = JSON.parse(rawChatLogs);
      } catch (error) {
        console.error('Error parsing chat logs:', error);
        chatMessages = [];
      }
    } else {
      chatMessages = rawChatLogs;
    }
  }*/

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="rounded-t-lg flex flex-row justify-between items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-3xl font-black">
                  {sortMethod === 'question'
                    ? 'Question'
                    : sortMethod === 'student'
                    ? 'Student'
                    : 'Sort by...'}
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
              <Button variant="ghost" onClick={() => getResponse(currentIndex - 1)}>
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
                      if (
                        sortMethod === 'question' &&
                        selectedTask &&
                        selectedTask.questions.length > 0
                      ) {
                        const responsesCount =
                          selectedTask.questions[0].responses?.length || 0;
                        if (index > 0 && index <= responsesCount) {
                          getResponse(index - 1);
                          e.target.textContent = index.toString();
                        } else {
                          e.target.textContent = (currentIndex + 1).toString();
                        }
                      } else if (index > 0 && index <= tasks.length) {
                        getResponse(index - 1);
                        e.target.textContent = index.toString();
                      } else {
                        e.target.textContent = (currentIndex + 1).toString();
                      }
                    } else {
                      e.target.textContent = (currentIndex + 1).toString();
                    }
                  }}
                >
                  {currentIndex + 1}
                </span>
                <span>
                  /{' '}
                  {sortMethod === 'question' &&
                  selectedTask &&
                  selectedTask.questions.length > 0
                    ? selectedTask.questions[0].responses?.length
                    : tasks.length}
                </span>
              </div>
              <Button variant="ghost" onClick={() => getResponse(currentIndex + 1)}>
                <ChevronRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Task Selection */}
            {!selectedTask ? (
              <div className="space-x-4 flex flex-row">
                {tasks.map((task) => (
                  <Card
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className="cursor-pointer"
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
                    <CardFooter>{/* Additional footer content if needed */}</CardFooter>
                  </Card>
                ))}
              </div>
            ) : null}

            {/* Grading Interface for Question Sorting */}
            {sortMethod === 'question' &&
            selectedTask &&
            selectedTask.questions.length > 0 &&
            selectedTask.questions[0].responses ? (
              <div className="">
                <div className='max-w-prose mb-4 p-4'>
                  <strong>Question:</strong> {selectedTask.questions[0].text}
                </div>
                <div className="mb-4 p-4 border rounded space-y-4">
                <strong>Response:</strong>
                  <div>
                    {selectedTask.questions[0].responses[currentIndex]?.answer || 'No response'}
                  </div>
                    {/*<div className="mt-2">
                      {chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`mb-4 ${
                            message.role === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          <span
                            className={`inline-block p-2 rounded-lg break-words whitespace-pre-wrap ${
                              message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a className="text-blue-500 hover:underline" {...props}>
                                    {props.children}
                                  </a>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </span>
                        </div>
                      ))}
                    </div>*/}
                  </div>
                <div className="flex items-center space-x-4">
                  {/* Toggle Button */}
                  <Button
                    onClick={() => setToggleStatus(toggleStatus === 'X' ? 'D' : 'X')}
                    className="w-10 h-10"
                    style={{
                      backgroundColor: toggleStatus === 'X' ? '#f87171' : '#4ade80',
                      color: 'white',
                    }}
                  >
                    {toggleStatus}
                  </Button>
                  {/* Grade Buttons */}
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        variant={
                          selectedTask.questions[0].responses?.[currentIndex]?.grade === value
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => setGrade(value)}
                        className={
                          'font-bold text-lg ' +
                          (value === 1
                            ? 'rounded-none rounded-l-lg'
                            : value === 5
                            ? 'rounded-none rounded-r-lg'
                            : 'rounded-none')
                        }
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                  {/* Comment Box */}
                  <Textarea
                    placeholder="Add comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={updateGrade} className="w-10 rounded-full">
                    <RotateCw />
                  </Button>
                </div>
              </div>
            ) : sortMethod === 'question' ? (
              <p className="mt-4">
                Please select a task with at least one question and responses to grade.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
