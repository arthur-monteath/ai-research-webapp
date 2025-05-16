'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useParams } from 'next/navigation';

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
  grades: Record<string, string>; // Grade1…Grade6
};

/* ---------- component ---------- */
export default function Grading() {
  const { gradingId } = useParams() as { gradingId: string }; // "Grade3" etc.

  const [tasks, setTasks]               = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [responses, setResponses]       = useState<Response[]>([]);
  const [current, setCurrent]           = useState(0);

  const [savedGrade, setSavedGrade]     = useState<number | null>(null); // sheet value
  const [grade, setGrade]               = useState<number | null>(null); // selected value

  const [isSaving, setIsSaving]         = useState(false);

  /* ---- fetch task list ---- */
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(setTasks)
      .catch(console.error);
  }, []);

  /* ---- select task and load responses ---- */
  const selectTask = async (task: Task) => {
    setSelectedTask(task);
    setResponses([]);
    setCurrent(0);
    setGrade(null);
    setSavedGrade(null);

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

  /* ---- hydrate when index / responses change ---- */
  useEffect(() => {
    const resp = responses[current];
    if (!resp) return;

    const raw = resp.grades[gradingId] ?? '';
    const g   = raw === '' ? null : parseInt(raw, 10);
    const normalized = Number.isNaN(g) ? null : g;

    setSavedGrade(normalized);
    setGrade(normalized);          // start with current sheet value
  }, [current, responses, gradingId]);

  /* ---- nav helpers ---- */
  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(responses.length - 1, i + 1));

  /* ---- save ---- */
  const save = async () => {
    if (!selectedTask) return;
    const resp = responses[current];
    if (!resp || grade == null || grade === savedGrade) return;

    setIsSaving(true);
    try {
      const r = await fetch('/api/grade', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          taskId    : selectedTask.id,
          questionId: selectedTask.questions[0].id,
          studentId : resp.studentId,
          gradingId,
          value     : grade,
        }),
      });
      if (!r.ok) throw new Error(r.statusText);

      // optimistic update
      setResponses(rs =>
        rs.map((x, i) =>
          i === current
            ? { ...x, grades: { ...x.grades, [gradingId]: String(grade) } }
            : x
        )
      );
      setSavedGrade(grade);
    } catch (e) {
      console.error('Error saving grade:', e);
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- UI ---- */
  return (
    <Layout>
      <div className="space-y-6">

        {/* Task chooser */}
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

        {/* Grading panel */}
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

              {/* grade buttons 0 / 1 / 2 */}
              <div className="flex mb-4">
                {[0,1,2].map(v => (
                  <Button
                    key={v}
                    variant={grade === v ? 'default' : 'outline'}
                    onClick={() => setGrade(v)}
                    className={
                      (v === 0 ? 'rounded-l-lg ' : '') +
                      (v === 2 ? 'rounded-r-lg ' : '') +
                      'font-bold'
                    }
                  >
                    {v}
                  </Button>
                ))}
              </div>

              <Button
                onClick={save}
                disabled={
                  isSaving ||
                  grade == null ||        // nothing selected
                  grade === savedGrade    // no change
                }
              >
                {isSaving ? <RotateCw className="animate-spin"/> : 'Save'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No responses */}
        {selectedTask && responses.length === 0 && (
          <p>No responses for this question.</p>
        )}

      </div>
    </Layout>
  );
}
