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
import { Trash2 } from 'lucide-react';

export default function TaskEditor() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    questions: [],
  });
  const [newQuestion, setNewQuestion] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState<{
    [taskId: string]: 'none' | 'some' | 'all';
  }>({});

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [assigningTaskIds, setAssigningTaskIds] = useState<string[]>([]);
  const [unassigningTaskIds, setUnassigningTaskIds] = useState<string[]>([]);

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

        setAssignmentStatus(assignmentStatusMap);
      } catch (error) {
        console.error('Error fetching tasks or assignments:', error);
      }
    };

    fetchTasksAndAssignments();
  }, []);

  const handleCreateTask = async () => {
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
  };

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

  const handleAddQuestion = (isEditing: boolean) => {
    if (newQuestion.trim()) {
      if (isEditing && editingTask) {
        setEditingTask({
          ...editingTask,
          questions: [
            ...editingTask.questions,
            { id: Date.now().toString(), text: newQuestion },
          ],
        });
      } else {
        setNewTask({
          ...newTask,
          questions: [
            ...(newTask.questions || []),
            { id: Date.now().toString(), text: newQuestion },
          ],
        });
      }
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (questionId: string, isEditing: boolean) => {
    if (isEditing && editingTask) {
      setEditingTask({
        ...editingTask,
        questions: editingTask.questions.filter((q) => q.id !== questionId),
      });
    } else {
      setNewTask({
        ...newTask,
        questions: newTask.questions?.filter((q) => q.id !== questionId) || [],
      });
    }
  };

  const handleAssignTaskToAll = async (taskId: string) => {
    setAssigningTaskIds((prev) => [...prev, taskId]);
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign-to-all`, {
        method: 'POST',
      });
      if (response.ok) {
        setAssignmentStatus((prev) => ({ ...prev, [taskId]: 'all' }));
      } else {
        const result = await response.json();
        console.error('Error assigning task:', result.error);
      }
    } catch (error) {
      console.error('Error assigning task:', error);
    } finally {
      setAssigningTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleUnassignTaskFromAll = async (taskId: string) => {
    setUnassigningTaskIds((prev) => [...prev, taskId]);
    try {
      const response = await fetch(`/api/tasks/${taskId}/unassign-from-all`, {
        method: 'POST',
      });
      if (response.ok) {
        setAssignmentStatus((prev) => ({ ...prev, [taskId]: 'none' }));
      } else {
        const result = await response.json();
        console.error('Error unassigning task:', result.error);
      }
    } catch (error) {
      console.error('Error unassigning task:', error);
    } finally {
      setUnassigningTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

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
                onChange={(e) =>
                  editingTask
                    ? setEditingTask({ ...editingTask, title: e.target.value })
                    : setNewTask({ ...newTask, title: e.target.value })
                }
              />
              <Textarea
                placeholder="Task Description"
                value={editingTask ? editingTask.description : newTask.description}
                onChange={(e) =>
                  editingTask
                    ? setEditingTask({ ...editingTask, description: e.target.value })
                    : setNewTask({ ...newTask, description: e.target.value })
                }
              />
              <div>
                <p className="mb-2">Questions:</p>
                {(editingTask ? editingTask.questions : newTask.questions || []).map(
                  (question: Question) => (
                    <div
                      key={question.id}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <Textarea
                        value={question.text}
                        onChange={(e) => {
                          const updatedQuestions = (
                            editingTask
                              ? editingTask.questions
                              : newTask.questions || []
                          ).map((q) =>
                            q.id === question.id
                              ? { ...q, text: e.target.value }
                              : q
                          );
                          if (editingTask) {
                            setEditingTask({
                              ...editingTask,
                              questions: updatedQuestions,
                            });
                          } else {
                            setNewTask({
                              ...newTask,
                              questions: updatedQuestions,
                            });
                          }
                        }}
                        className="flex-grow"
                      />
                      <Trash2
                        className="h-5 w-5 text-red-500 cursor-pointer"
                        onClick={() =>
                          handleRemoveQuestion(question.id, !!editingTask)
                        }
                      />
                    </div>
                  )
                )}
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="New question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                  <Button onClick={() => handleAddQuestion(!!editingTask)}>
                    Add Question
                  </Button>
                </div>
              </div>
              <Button
                onClick={editingTask ? handleUpdateTask : handleCreateTask}
                disabled={editingTask ? isUpdating : isCreating}
              >
                {editingTask
                  ? isUpdating
                    ? 'Updating...'
                    : 'Update Task'
                  : isCreating
                  ? 'Creating...'
                  : 'Create Task'}
              </Button>
              {editingTask && (
                <Button
                  className="ml-2"
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                  disabled={isUpdating}
                >
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
                    <Button onClick={() => setEditingTask(task)}>Edit Task</Button>
                    {assignmentStatus[task.id] !== 'all' ? (
                      <Button
                        className="ml-2"
                        onClick={() => handleAssignTaskToAll(task.id)}
                        disabled={assigningTaskIds.includes(task.id)}
                      >
                        {assigningTaskIds.includes(task.id)
                          ? 'Assigning...'
                          : 'Assign Task to All Students'}
                      </Button>
                    ) : (
                      <Button
                        className="ml-2"
                        variant="destructive"
                        onClick={() => handleUnassignTaskFromAll(task.id)}
                        disabled={unassigningTaskIds.includes(task.id)}
                      >
                        {unassigningTaskIds.includes(task.id)
                          ? 'Unassigning...'
                          : 'Unassign Task from All Students'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
