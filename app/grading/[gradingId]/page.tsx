'use client';

import { useState, useEffect } from 'react';
import Layout          from '@/components/layout';
import { Button }      from '@/components/ui/button';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useParams }   from 'next/navigation';

/* ---------- data types ---------- */
type Task = {
  id: string;
  title: string;
  description: string;
  questions: { id: string; text: string }[];
};

type Response = {
  studentId: string;
  answer: string;
  grades: Record<string, string>; // Grade1…Grade6 (strings from the sheet)
};

/* ---------- component ---------- */
export default function Grading() {
  const { gradingId } = useParams() as { gradingId: string }; // e.g. "Grade3"

  const [tasks, setTasks]               = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [responses, setResponses]       = useState<Response[]>([]);
  const [current, setCurrent]           = useState(0);
  const [grade, setGrade]               = useState<number | null>(null);
  const [isSaving, setIsSaving]         = useState(false);

  /* ---- fetch task list once ---- */
  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then(setTasks)
      .catch(console.error);
  }, []);

  /* ---- select task & load responses ---- */
  const selectTask = async (task: Task) => {
    setSelectedTask(task);
    setResponses([]);
    setCurrent(0);
    setGrade(null);

    if (!task.questions.length) return;
    const q = task.questions[0];
    try {
      const r = await fetch(`/api/${task.id}/${q.id}/responses`);
      if (!r.ok) throw new Error(r.statusText);
      const { responses } = await r.json();
      setResponses(responses);
    } catch (e) {
      console.error('Failed to load responses:', e);
    }
  };

  /* ---- hydrate grade when index / responses change ---- */
  useEffect(() => {
    const resp = responses[current];
    if (!resp) return;
    const raw = resp.grades[gradingId] ?? '';
    const n   = raw === '' ? null : parseInt(raw, 10);
    setGrade(Number.isNaN(n) ? null : n);
  }, [current, responses, gradingId]);

  /* ---- nav helpers ---- */
  const prev = () => setCurrent((i) => Math.max(0, i - 1));
  const next = () => setCurrent((i) => Math.min(responses.length - 1, i + 1));

  /* ---- save grade ---- */
  const save = async () => {
    if (!selectedTask) return;
    const resp = responses[current];
    if (!resp || grade == null) return;
    setIsSaving(true);
    try {
      const r = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId:     selectedTask.id,
          questionId: selectedTask.questions[0].id,
          studentId:  resp.studentId,
          gradingId,          // "Grade1"… "Grade6"
          value:      grade,   // number 0-2
        }),
      });
      if (!r.ok) throw new Error(r.statusText);

      // optimistic local update
      setResponses(rs => rs.map((x,i) =>
        i === current ? { ...x, grades: { ...x.grades, [gradingId]: String(grade) } } : x
      ));
    } catch (e) {
      console.error('Error saving grade:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">

        {/* ---------- Task chooser ---------- */}
        {!selectedTask && (
          <div className="flex flex-wrap gap-4">
            {tasks.map(t => (
              <Card key={t.id} className="cursor-pointer" onClick={() => selectTask(t)}>
                <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
                <CardFooter>Questions: {t.questions.length}</CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* ---------- Grading panel ---------- */}
        {selectedTask && responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedTask.questions[0].text}</CardTitle>
            </CardHeader>

            <CardContent>

              <div className="mb-4 p-4 border rounded">
                {responses[current].answer || 'No response'}
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Button onClick={prev} disabled={current === 0}><ChevronLeft/></Button>
                <span>{current + 1}/{responses.length}</span>
                <Button onClick={next} disabled={current === responses.length - 1}>
                  <ChevronRight/>
                </Button>
              </div>

              {/* grade buttons 0/1/2 */}
              <div className="flex mb-4">
                {[0,1,2].map(v => (
                  <Button
                    key={v}
                    variant={grade===v ? 'default':'outline'}
                    onClick={() => setGrade(v)}
                    className={
                      (v===0?'rounded-l-lg ':'') +
                      (v===2?'rounded-r-lg ':'') +
                      'font-bold'
                    }
                  >
                    {v}
                  </Button>
                ))}
              </div>

              <Button onClick={save} disabled={isSaving || grade==null}>
                {isSaving ? <RotateCw className="animate-spin"/> : 'Save'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ---------- no responses ---------- */}
        {selectedTask && responses.length === 0 && (
          <p>No responses for this question.</p>
        )}

      </div>
    </Layout>
  );
}
