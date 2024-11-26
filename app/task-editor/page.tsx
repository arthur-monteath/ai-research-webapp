'use client'

import { useState } from 'react'
import Layout from '@/components/layout'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Task, Question } from '@/types'
import { Trash2 } from 'lucide-react'

export default function TaskEditor() {
  const [tasks, setTasks] = useState<Task[]>([
    { 
      id: '1', 
      title: 'Math Quiz', 
      description: 'Complete the algebra quiz', 
      assignedTo: ['Group A'],
      questions: [
        { id: '1', text: 'What is 2 + 2?' },
        { id: '2', text: 'Solve for x: 2x + 3 = 7' }
      ]
    },
    { 
      id: '2', 
      title: 'History Essay', 
      description: 'Write an essay on World War II', 
      assignedTo: ['Group B'],
      questions: [
        { id: '1', text: 'What year did World War II start?' },
        { id: '2', text: 'Name three major Allied powers.' }
      ]
    },
  ])
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState<Partial<Task>>({ 
    title: '', 
    description: '', 
    assignedTo: [], 
    questions: []
  })
  const [newQuestion, setNewQuestion] = useState('')

  const handleCreateTask = () => {
    if (newTask.title && newTask.description && newTask.assignedTo && newTask.assignedTo.length > 0) {
      setTasks([...tasks, { ...newTask, id: Date.now().toString(), questions: [] } as Task])
      setNewTask({ title: '', description: '', assignedTo: [], questions: [] })
    }
  }

  const handleUpdateTask = () => {
    if (editingTask) {
      setTasks(tasks.map(task => task.id === editingTask.id ? editingTask : task))
      setEditingTask(null)
    }
  }

  const handleAddQuestion = (isEditing: boolean) => {
    if (isEditing && editingTask) {
      setEditingTask({
        ...editingTask,
        questions: [...editingTask.questions, { id: Date.now().toString(), text: newQuestion }]
      })
    } else {
      setNewTask({
        ...newTask,
        questions: [...(newTask.questions || []), { id: Date.now().toString(), text: newQuestion }]
      })
    }
    setNewQuestion('')
  }

  const handleRemoveQuestion = (questionId: string, isEditing: boolean) => {
    if (isEditing && editingTask) {
      setEditingTask({
        ...editingTask,
        questions: editingTask.questions.filter(q => q.id !== questionId)
      })
    } else {
      setNewTask({
        ...newTask,
        questions: newTask.questions?.filter(q => q.id !== questionId) || []
      })
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Task Title"
                value={editingTask ? editingTask.title : newTask.title}
                onChange={(e) => editingTask 
                  ? setEditingTask({ ...editingTask, title: e.target.value })
                  : setNewTask({ ...newTask, title: e.target.value })
                }
              />
              <Textarea
                placeholder="Task Description"
                value={editingTask ? editingTask.description : newTask.description}
                onChange={(e) => editingTask
                  ? setEditingTask({ ...editingTask, description: e.target.value })
                  : setNewTask({ ...newTask, description: e.target.value })
                }
              />
              <div>
                <p className="mb-2">Assign to groups:</p>
                {(['Group A', 'Group B', 'Group C'] as const).map((group) => (
                  <div key={group} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={`${editingTask ? 'edit-' : ''}${group}`}
                      checked={editingTask 
                        ? editingTask.assignedTo.includes(group)
                        : newTask.assignedTo?.includes(group)
                      }
                      onCheckedChange={(checked) => {
                        const updatedGroups = checked
                          ? [...(editingTask ? editingTask.assignedTo : newTask.assignedTo || []), group]
                          : (editingTask ? editingTask.assignedTo : newTask.assignedTo || []).filter(g => g !== group);
                        
                        if (editingTask) {
                          setEditingTask({ ...editingTask, assignedTo: updatedGroups });
                        } else {
                          setNewTask({ ...newTask, assignedTo: updatedGroups });
                        }
                      }}
                    />
                    <label htmlFor={`${editingTask ? 'edit-' : ''}${group}`}>
                      {group}
                    </label>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2">Questions:</p>
                {(editingTask ? editingTask.questions : newTask.questions || []).map((question: Question) => (
                  <div key={question.id} className="flex items-center space-x-2 mb-2">
                    <Textarea
                      value={question.text}
                      onChange={(e) => {
                        const updatedQuestions = (editingTask ? editingTask.questions : newTask.questions || []).map(q =>
                          q.id === question.id ? { ...q, text: e.target.value } : q
                        );
                        if (editingTask) {
                          setEditingTask({ ...editingTask, questions: updatedQuestions });
                        } else {
                          setNewTask({ ...newTask, questions: updatedQuestions });
                        }
                      }}
                      className="flex-grow"
                    />
                    <Trash2
                      className="h-5 w-5 text-red-500 cursor-pointer"
                      onClick={() => handleRemoveQuestion(question.id, !!editingTask)}
                    />
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="New question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                  <Button onClick={() => handleAddQuestion(!!editingTask)}>Add Question</Button>
                </div>
              </div>
              <Button onClick={editingTask ? handleUpdateTask : handleCreateTask}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
              {editingTask && (
                <Button className='ml-2' variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel Editing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map(task => (
                <Card key={task.id}>
                  <CardHeader>
                    <CardTitle>{task.title}</CardTitle>
                    <CardDescription>
                      Assigned to: {task.assignedTo.join(', ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2">{task.description}</p>
                    <p className="font-bold">Number of questions: {task.questions.length}</p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => setEditingTask(task)}>Edit Task</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

