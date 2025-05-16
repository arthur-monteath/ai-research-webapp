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
import { ChevronLeft, ChevronRight, RotateCw, Check, X } from 'lucide-react';
import { useParams } from 'next/navigation';

type Task = {
  id: string;
  title: string;
  description: string;
  questions: { id: string; text: string }[];
};

type Response = {
  studentId: string;
  answer: string;
  gradingStatus: string;
  comment: string;
  status: 'X' | 'O';
  grade: number | null;
};

export default function Grading() {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [responses, setResponses]       = useState<Response[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grade, setGrade]               = useState<number | null>(null);
  const [status, setStatus]             = useState<'X'|'O'>('X');
  const [comment, setComment]           = useState('');
  const [isUpdating, setIsUpdating]     = useState(false);
  const gradingId = useParams().gradingId;

  // 1) fetch tasks on mount
  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then(setTasks)
      .catch(console.error);
  }, []);

  // 2) when a task is selected, fetch its first question's responses
  const selectTask = async (task: Task) => {
    setSelectedTask(task);
    setCurrentIndex(0);
    setResponses([]);
    setGrade(null);
    setStatus('X');
    setComment('');

    if (!task.questions.length) return;
    const q = task.questions[0];
    try {
      const res = await fetch(`/api/${task.id}/${q.id}/responses`);
      if (!res.ok) throw new Error(res.statusText);
      const { responses } = await res.json();
      setResponses(responses);
    } catch (e) {
      console.error('Failed to load responses:', e);
    }
  };

  // 3) hydrate form fields when currentIndex or responses change
  useEffect(() => {
    const r = responses[currentIndex];
    if (r) {
      setGrade(r.grade);
      setStatus(r.status);
      setComment(r.comment);
    }
  }, [currentIndex, responses]);

  // 4) navigation helpers
  const prev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const next = () => setCurrentIndex((i) => Math.min(responses.length - 1, i + 1));

  // 5) submit grading
  const submit = async () => {
    if (!selectedTask) return;
    const resp = responses[currentIndex];
    if (!resp || grade == null) return;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          taskId:      selectedTask.id,
          questionId:  selectedTask.questions[0].id,
          studentId:   resp.studentId,
          grade,
          status,
          comment,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      // locally update
      setResponses((rs) =>
        rs.map((r,i) => i === currentIndex ? { ...r, grade, status, comment } : r)
      );
    } catch (e) {
      console.error('Error submitting grade:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Task chooser */}
        {!selectedTask && (
          <div className="flex flex-wrap gap-4">
            {tasks.map((t) => (
              <Card key={t.id} className="cursor-pointer" onClick={() => selectTask(t)}>
                <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
                <CardFooter>Questions: {t.questions.length}</CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Grading panel */}
        {selectedTask && responses.length > 0 && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Q: {selectedTask.questions[0].text}
              </h2>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 border rounded">
                {responses[currentIndex].answer || 'No response'}
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <Button onClick={prev} disabled={currentIndex === 0}>
                  <ChevronLeft />
                </Button>
                <span>{currentIndex + 1} / {responses.length}</span>
                <Button onClick={next} disabled={currentIndex === responses.length - 1}>
                  <ChevronRight />
                </Button>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                {/* status toggle */}
                <Button
                disabled={true}
                  onClick={() => setStatus(status === 'X' ? 'O' : 'X')}
                  className="w-10 h-10"
                  style={{ backgroundColor: status==='X' ? '#f87171' : '#4ade80', color:'white' }}
                >
                  {status==='X' ? <X/> : <Check/>}
                </Button>

                {/* grade buttons */}
                <div className="flex">
                  {[0,1,2].map((v) => (
                    <Button
                      key={v}
                      variant={grade===v ? 'default':'outline'}
                      onClick={() => setGrade(v)}
                      className={
                        'font-bold ' +
                        (v===0?'rounded-l-lg ':v===2?'rounded-r-lg ':'')
                      }
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full mb-4"
              />

              <Button onClick={submit} disabled={isUpdating}>
                {isUpdating ? <RotateCw className="animate-spin"/> : 'Submit'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* no responses */}
        {selectedTask && responses.length === 0 && (
          <p>Select a task with at least one question & responses.</p>
        )}
      </div>
    </Layout>
  );
}
