'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Task } from '@/types'

export default function StudentDashboard() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([
    { 
      id: '1', 
      title: 'Math Quiz', 
      description: 'Complete the algebra quiz', 
      questions: [
        { id: '1', text: 'What is 2 + 2?' },
        { id: '2', text: 'Solve for x: 2x + 3 = 7' }
      ]
    },
    { 
      id: '2', 
      title: 'History Essay', 
      description: 'Write an essay on World War II', 
      questions: [
        { id: '1', text: 'What year did World War II start?' },
        { id: '2', text: 'Name three major Allied powers.' }
      ]
    },
    { 
      id: '3', 
      title: 'Science Project', 
      description: 'Create a model of the solar system',
      questions: [
        { id: '1', text: 'Name all the planets in our solar system.' },
        { id: '2', text: 'What is the largest planet?' }
      ]
    },
  ])

  const handleStartTask = (taskId: string) => {
    router.push(`/task/${taskId}`)
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(task => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{task.description}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleStartTask(task.id)}>Start Task</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Layout>
  )
}

