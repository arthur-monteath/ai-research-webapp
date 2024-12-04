// app/task/[id]/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Task } from '@/types';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function TaskPage({ params }: { params: { task: string } }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const startTimeRef = useRef<number>(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);

  // New state variables
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const systemMessage: Message = {
    role: 'system',
    content:
      'You format all mathematical expressions using `$` for inline math and `$$` for block math, you DO NOT use `\\(`, `\\)`, `\\[`, or `\\]`.',
  };

  const studentId =
    typeof window !== 'undefined' ? sessionStorage.getItem('studentId') : null;
  const studentGroup =
    typeof window !== 'undefined' ? sessionStorage.getItem('studentGroup') : null;

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${params.task}`);
        if (res.ok) {
          const taskData: Task = await res.json();
          setTask(taskData);
        } else {
          console.error('Failed to fetch task');
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching task:', error.message);
        } else {
          console.error('Unexpected error fetching task:', error);
        }
      }
    };

    fetchTask();
  }, [params.task]);

  useEffect(() => {
    // Reset start time when the question changes
    startTimeRef.current = Date.now();
    // Reset confirmation state when moving to the next question
    setIsConfirming(false);
  }, [currentQuestionIndex]);

  // Reset confirmation state when the answer changes
  useEffect(() => {
    setIsConfirming(false);
  }, [answer]);

  const handleSendMessage = async () => {
    // ... [handleSendMessage code remains the same]
    if (chatInput.trim()) {
      const newUserMessage: ChatMessage = { role: 'user', content: chatInput };
      const updatedChatMessages = [...chatMessages, newUserMessage];
      setChatMessages(updatedChatMessages);
      setChatInput('');
      setIsLoading(true);

      // Prepare messages to send, including the system message
      const messagesToSend: Message[] = [systemMessage, ...updatedChatMessages];

      // AbortController to cancel the request if needed
      const abortController = new AbortController();
      setController(abortController);

      try {
        const response = await fetch('/api/gpt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: messagesToSend }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to get response from AI assistant');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to read response body');
        }

        const decoder = new TextDecoder();
        let assistantMessage: ChatMessage = { role: 'assistant', content: '' };
        setChatMessages((prev) => [...prev, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          assistantMessage.content += chunk;
          // Update the last message in chatMessages
          setChatMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = assistantMessage;
            return updatedMessages;
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('Fetch aborted');
          } else {
            console.error('Error:', error.message);
          }
        } else {
          console.error('Unexpected error:', error);
        }
      } finally {
        setIsLoading(false);
        setController(null);
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitting) {
      // Prevent multiple submissions
      return;
    }

    if (!isConfirming) {
      // First click: ask for confirmation
      setIsConfirming(true);
      return;
    }

    if (answer.trim() && task) {
      setIsSubmitting(true); // Start submitting

      const timeTaken = Date.now() - startTimeRef.current;

      // Prepare data to send
      const data = {
        studentId: studentId,
        taskId: task.id,
        questionId: task.questions[currentQuestionIndex].id,
        timeTaken: timeTaken / 1000, // Convert to seconds
        answer,
        chatLogs: chatMessages,
      };

      try {
        const response = await fetch('/api/submit-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          console.log('Data submitted successfully:', result);
        } else {
          console.error('Error submitting data:', result.error);
        }

        // Check if it's the last question
        if (currentQuestionIndex >= task.questions.length - 1) {
          // Task completed, unassign task from student
          const unassignResponse = await fetch(
            `/api/students/${studentId}/tasks/${task.id}/unassign`,
            {
              method: 'POST',
            }
          );

          if (unassignResponse.ok) {
            console.log('Task unassigned from student');
          } else {
            const unassignResult = await unassignResponse.json();
            console.error(
              'Error unassigning task:',
              unassignResult.error || 'Unknown error'
            );
          }

          // Redirect to student dashboard
          router.push('/student-dashboard');
        } else {
          // Move to next question
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setAnswer('');
          setChatMessages([]);
          setIsConfirming(false);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Network error:', error.message);
        } else {
          console.error('Unexpected network error:', error);
        }
      } finally {
        setIsSubmitting(false); // Submission complete
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading) {
        handleSendMessage();
      }
    }
  };

  if (!task) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  // Determine button text and style
  let buttonText = currentQuestionIndex < task.questions.length - 1 ? 'Next Question' : 'Finish Task';
  if (isConfirming) {
    buttonText = 'Click Again to Confirm';
  }
  if (isSubmitting) {
    buttonText = 'Submitting Answer...';
  }

  const buttonClasses = `w-full ${
    isConfirming ? 'bg-yellow-500 hover:bg-yellow-600' : ''
  }`;

  return (
    <Layout>
      <div className={`grid ${studentGroup !== 'A' ? 'grid-cols-2 gap-6' : 'grid-cols-1'}`}>
        {studentGroup !== 'A' && (
          <Card className="h-[calc(100vh-140px)] flex flex-col">
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <span
                    className={`inline-block p-2 rounded-lg text-left break-words whitespace-pre-wrap ${
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
              {isLoading && (
                <div className="mb-4 text-left">
                  <span className="inline-block p-2 rounded-lg bg-gray-100 animate-pulse">
                    AI Assistant is typing...
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="flex w-full">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the AI assistant..."
                  className="flex-grow"
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  className="ml-2"
                  disabled={isLoading}
                >
                  Send
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        <Card className="h-[calc(100vh-140px)] flex flex-col">
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>
              <div className="prose max-w-none">
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
                  {task.description}
                </ReactMarkdown>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto">
            <h3 className="text-lg font-semibold mb-2">
              Question {currentQuestionIndex + 1}:
            </h3>
            <div className="mb-4 prose max-w-none">
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
                {task.questions[currentQuestionIndex].text}
              </ReactMarkdown>
            </div>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="h-40"
            />
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSubmitAnswer}
              className={buttonClasses}
              disabled={isSubmitting}
            >
              {buttonText}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
