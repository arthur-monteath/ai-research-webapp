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

export default function TaskPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState('');
  const startTimeRef = useRef<number>(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${params.id}`);
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
  }, [params.id]);

  useEffect(() => {
    // Reset start time when the question changes
    startTimeRef.current = Date.now();
  }, [currentQuestionIndex]);

  const handleSendMessage = async () => {
    if (chatInput.trim()) {
      const newUserMessage = { role: 'user' as const, content: chatInput };
      const updatedMessages = [...chatMessages, newUserMessage];
      setChatMessages(updatedMessages);
      setChatInput('');
      setIsLoading(true);

      // AbortController to cancel the request if needed
      const abortController = new AbortController();
      setController(abortController);

      try {
        const response = await fetch('/api/gpt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: updatedMessages }),
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
        let assistantMessage = { role: 'assistant' as const, content: '' };
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
    if (answer.trim() && task) {
      const timeTaken = Date.now() - startTimeRef.current;

      // Prepare data to send
      const data = {
        studentId: 'X', // Replace with actual student ID
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
      } catch (error) {
        if (error instanceof Error) {
          console.error('Network error:', error.message);
        } else {
          console.error('Unexpected network error:', error);
        }
      }

      if (currentQuestionIndex < task.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setAnswer('');
        setChatMessages([]);
      } else {
        // Task completed
        router.push('/student-dashboard');
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

  return (
    <Layout>
      <div className="grid grid-cols-2 gap-6">
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
                  className={`inline-block p-2 rounded-lg ${
                    message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  {message.content}
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
              <Button onClick={handleSendMessage} className="ml-2" disabled={isLoading}>
                Send
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="h-[calc(100vh-140px)] flex flex-col">
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <h3 className="text-lg font-semibold mb-2">
              Question {currentQuestionIndex + 1}:
            </h3>
            <p className="mb-4">{task.questions[currentQuestionIndex].text}</p>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="h-40"
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleSubmitAnswer} className="w-full">
              {currentQuestionIndex < task.questions.length - 1
                ? 'Next Question'
                : 'Finish Task'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
