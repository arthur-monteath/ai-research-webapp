'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm     from 'remark-gfm';

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
  const prevTen = () => setCurrent(i => Math.max(0, i - 10));
  const nextTen = () => setCurrent(i => Math.min(responses.length - 1, i + 10));

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
          <div className="flex flex-wrap gap-4 justify-center">
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
          <Card className='max-w-screen-lg mx-auto min-h-96 flex flex-col justify-between'>
            <CardHeader className=''>
              <div className='flex lg:flex-row justify-between gap-8'>
                <div className="max-w-prose flex-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedTask.questions[0].text}
                  </ReactMarkdown>
                </div>

                <div className="max-w-prose mb-4 p-4 border rounded flex-1">
                    {responses[current].answer || 'No response'}
                </div>
              </div>
            </CardHeader>

            <CardContent className='flex flex-col md:flex-row gap-6 md:gap-0 justify-between mt-6'>
              <div className='flex gap-2'>
                {/* grade buttons 0 / 1 / 2 */}
                <div className="flex">
                  {[0,1,2].map(v => (
                    <Button
                      key={v}
                      variant={grade === v ? 'default' : 'outline'}
                      onClick={() => setGrade(v)}
                      className={ 'rounded-none ' +
                        (v === 0 ? 'rounded-l-lg' : '') +
                        (v === 2 ? 'rounded-r-lg' : '') +
                        ' font-bold text-2xl border p-6'
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
                  className='font-bold text-2xl border p-6'
                >
                  {isSaving ? <RotateCw className="animate-spin"/> : 'Save'}
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 text-2xl font-bold">
                <Button className='p-6' onClick={prevTen} disabled={current === 0}>
                  <ChevronsLeft/>
                </Button>
                <Button className='p-6' onClick={prev} disabled={current === 0}>
                  <ChevronLeft/>
                </Button>
                <span className='px-2'>{current + 1}/{responses.length}</span>
                <Button className='p-6' onClick={next} disabled={current === responses.length - 1}>
                  <ChevronRight/>
                </Button>
                <Button className='p-6' onClick={nextTen} disabled={current === responses.length - 1}>
                  <ChevronsRight/>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No responses */}
        {selectedTask && responses.length === 0 && (
          <div className="flex justify-center"><p>Fetching responses...</p> <RotateCw className='ml-2 animate-spin'/></div>
        )}
        {tasks.length === 0 && (
          <div className="flex justify-center"><p>Fetching tasks...</p> <RotateCw className='ml-2 animate-spin'/></div>
        )}

      </div>
    </Layout>
  );
}
