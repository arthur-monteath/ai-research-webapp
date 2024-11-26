'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Task } from '@/types'

export default function TaskPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    // In a real app, you'd fetch the task details from an API
    const mockTask: Task = {
      id: params.id,
      title: 'Sample Task',
      description: 'This is a sample task description.',
      assignedTo: ['Group A'],
      questions: [
        { id: '1', text: 'What is the capital of France?' },
        { id: '2', text: 'Who wrote "Romeo and Juliet"?' }
      ]
    }
    setTask(mockTask)
  }, [params.id])

  const handleSendMessage = async () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { role: 'user', content: chatInput }])
      setChatInput('')
      
      // In a real app, you'd send the message to an AI API and get a response
      const aiResponse = "I'm an AI assistant. How can I help you with this question?"
      setTimeout(() => {
        setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
      }, 1000)
    }
  }

  const handleSubmitAnswer = () => {
    if (answer.trim() && task) {
      // In a real app, you'd save the answer and possibly grade it
      console.log(`Submitted answer for question ${currentQuestionIndex + 1}: ${answer}`)
      if (currentQuestionIndex < task.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setAnswer('')
        setChatMessages([])
      } else {
        // Task completed
        router.push('/student-dashboard')
      }
    }
  }

  if (!task) {
    return <div>Loading...</div>
  }

  return (
    <Layout>
      <div className="grid grid-cols-2 gap-6">
        <Card className="h-[calc(100vh-100px)] flex flex-col">
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto">
            {chatMessages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {message.content}
                </span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <div className="flex w-full">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask the AI assistant..."
                className="flex-grow"
              />
              <Button onClick={handleSendMessage} className="ml-2">Send</Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="h-[calc(100vh-100px)] flex flex-col">
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <h3 className="text-lg font-semibold mb-2">Question {currentQuestionIndex + 1}:</h3>
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
              {currentQuestionIndex < task.questions.length - 1 ? 'Next Question' : 'Finish Task'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  )
}

