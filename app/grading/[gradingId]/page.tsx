'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCw, Eye, EyeOff } from 'lucide-react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ---------- types ---------- */
type Task = {
  id: string;
  title: string;
  questions: { id: string; text: string }[];
};

type Response = {
  studentId: string;
  answer: string;
  grades: Record<string, string>; // expects GradeFinal and GradeAI
};

type ApiResponses = { responses: Response[] };

/* ---------- utils ---------- */
const toNum = (x: unknown): number | null => {
  const n = parseInt(String(x ?? ''), 10);
  return Number.isFinite(n) ? n : null;
};

const getJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
};

const postJson = async (url: string, body: unknown): Promise<void> => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${url} -> ${r.status}`);
};

/* ---------- component ---------- */
export default function GradeByStudent() {
  const { gradingId } = useParams() as { gradingId: string }; // used to write Grade1..Grade5

  /* selection + data */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [task, setTask] = useState<Task | null>(null);

  const [students, setStudents] = useState<string[]>([]);
  const [stuIdx, setStuIdx] = useState(0);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [studentResponses, setStudentResponses] = useState<(Response | null)[]>([]);

  /* grading state */
  const [savedGrade, setSavedGrade] = useState<number | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  /* completion + UI state */
  const [completedByStudent, setCompletedByStudent] = useState<Record<string, boolean>>({});
  const [showAllStudents, setShowAllStudents] = useState(false);

  // NEW: collapsible question statement
  const [showQuestion, setShowQuestion] = useState(true);
  useEffect(() => {
    const v = typeof window !== 'undefined' ? localStorage.getItem('grading.showQuestion') : null;
    if (v !== null) setShowQuestion(v === '1');
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('grading.showQuestion', showQuestion ? '1' : '0');
    }
  }, [showQuestion]);

  /* derived */
  const resp: Response | null = useMemo(
    () => studentResponses[questionIdx] || null,
    [studentResponses, questionIdx],
  );
  const ai = useMemo(() => toNum(resp?.grades['GradeAI']), [resp]);
  const showAiHighlight = savedGrade == null && grade == null;
  const hasSaved = savedGrade != null;
  const canConfirmAI = !hasSaved && grade == null && ai != null;

  const lastQuestionIdx = useMemo(() => (task ? task.questions.length - 1 : 0), [task]);
  const isLastQuestion = questionIdx === lastQuestionIdx;
  const hasNextStudent = stuIdx < students.length - 1;

  /* load tasks on mount */
  useEffect(() => {
    getJson<Task[]>('/api/tasks').then(setTasks).catch(console.error);
  }, []);

  /* helpers */
  const loadStudentIds = useCallback(async (t: Task): Promise<string[]> => {
    if (!t.questions.length) return [];
    const firstQ = t.questions[0];
    const { responses } = await getJson<ApiResponses>(`/api/${t.id}/${firstQ.id}/responses`);
    return responses.map((x) => x.studentId);
  }, []);

  const computeCompletionMap = useCallback(async (t: Task, ids: string[]) => {
    if (!ids.length) {
      setCompletedByStudent({});
      return;
    }
    const perQuestion = await Promise.all(
      t.questions.map((q) => getJson<ApiResponses>(`/api/${t.id}/${q.id}/responses`)),
    );
    const map: Record<string, boolean> = {};
    ids.forEach((sid) => {
      const allGraded = perQuestion.every(({ responses }) => {
        const r = responses.find((x) => x.studentId === sid);
        return !!r && toNum(r.grades['GradeFinal']) != null;
      });
      map[sid] = allGraded;
    });
    setCompletedByStudent(map);
  }, []);

  const recomputeCurrentStudentCompleted = useCallback(
    (sid: string, list: (Response | null)[]) => {
      const all = list.every((r) => r && toNum(r.grades['GradeFinal']) != null);
      setCompletedByStudent((prev) => ({ ...prev, [sid]: all }));
    },
    [],
  );

  const fetchAllForStudent = useCallback(
    async (t: Task, stuId: string) => {
      const list: (Response | null)[] = await Promise.all(
        t.questions.map(async (q) => {
          const { responses } = await getJson<ApiResponses>(`/api/${t.id}/${q.id}/responses`);
          return responses.find((x) => x.studentId === stuId) || null;
        }),
      );
      setStudentResponses(list);
      const firstSaved = toNum(list[0]?.grades['GradeFinal']);
      setSavedGrade(firstSaved);
      setGrade(firstSaved ?? null);
    },
    [],
  );

  const saveGrade = useCallback(
    async (val: number) => {
      if (!task || !resp) return;
      setSaving(true);
      try {
        await postJson('/api/grade', {
          taskId: task.id,
          questionId: task.questions[questionIdx].id,
          studentId: resp.studentId,
          gradingId, // write Grade1..Grade5 + mirror to GradeFinal server-side
          value: val,
        });
        setSavedGrade(val);
        setGrade(val);
        setStudentResponses((prev) => {
          const copy = [...prev];
          const r = copy[questionIdx];
          if (r) r.grades['GradeFinal'] = String(val);
          if (r) recomputeCurrentStudentCompleted(r.studentId, copy);
          return copy;
        });
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    },
    [task, resp, questionIdx, gradingId, recomputeCurrentStudentCompleted],
  );

  /* choose task */
  const chooseTask = useCallback(
    async (t: Task) => {
      setTask(t);
      setQuestionIdx(0);
      setStuIdx(0);
      setStudentResponses([]);
      setSavedGrade(null);
      setGrade(null);
      setShowAllStudents(false);

      const ids = await loadStudentIds(t);
      setStudents(ids);
      await computeCompletionMap(t, ids);
      if (ids.length) fetchAllForStudent(t, ids[0]);
    },
    [loadStudentIds, computeCompletionMap, fetchAllForStudent],
  );

  /* react to question change to sync saved/grade */
  useEffect(() => {
    const saved = toNum(resp?.grades['GradeFinal']);
    setSavedGrade(saved);
    setGrade(saved ?? null);
  }, [resp]);

  /* navigation handlers */
  const gotoPrevQuestion = useCallback(() => {
    if (questionIdx > 0) setQuestionIdx((i) => i - 1);
  }, [questionIdx]);

  const gotoNext = useCallback(async () => {
    // forward-only save
    if (grade != null && grade !== savedGrade) {
      await saveGrade(grade);
    } else if (savedGrade == null && grade == null && ai != null) {
      await saveGrade(ai);
    }

    if (task == null) return;

    if (questionIdx < (task.questions.length - 1)) {
      setQuestionIdx((i) => i + 1);
      return;
    }

    // last question -> next student
    if (stuIdx < students.length - 1) {
      const nextIdx = stuIdx + 1;
      setStuIdx(nextIdx);
      setQuestionIdx(0);
      setStudentResponses([]);
      fetchAllForStudent(task, students[nextIdx]);
    }
  }, [grade, savedGrade, ai, saveGrade, task, questionIdx, stuIdx, students, fetchAllForStudent]);

  const selectStudent = useCallback(
    (i: number) => {
      // No saving on student change
      setStuIdx(i);
      setQuestionIdx(0);
      setStudentResponses([]);
      if (task) fetchAllForStudent(task, students[i]);
    },
    [task, students, fetchAllForStudent],
  );

  /* UI */
  return (
    <Layout>
      <div className="space-y-6">
        {/* choose task */}
        {!task && (
          <div className="flex flex-wrap gap-4 justify-center">
            {tasks.map((t) => (
              <Card key={t.id} className="cursor-pointer" onClick={() => chooseTask(t)}>
                <CardHeader>
                  <CardTitle>{t.title}</CardTitle>
                </CardHeader>
                <CardFooter>Questions: {t.questions.length}</CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* student header + toggle */}
        {task && students.length > 0 && (
          <div className="max-w-screen-lg mx-auto mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 justify-center">
              <span className="text-sm opacity-70">Student:</span>
              <Button variant="default">{students[stuIdx] ?? '-'}</Button>
              <Button variant="outline" onClick={() => setShowAllStudents((s) => !s)}>
                {showAllStudents ? 'Hide list' : 'See all students'}
              </Button>
            </div>

            {showAllStudents && (
              <div className="flex flex-wrap gap-2 justify-center">
                {students.map((s, i) => {
                  const isSelected = i === stuIdx;
                  const isComplete = !!completedByStudent[s];
                  const completeClass = isComplete
                    ? isSelected
                      ? 'bg-green-200 hover:bg-green-200 text-black'
                      : 'bg-green-400 hover:bg-green-400 text-black'
                    : '';
                  return (
                    <Button
                      key={s}
                      variant={isSelected ? 'default' : 'outline'}
                      className={completeClass}
                      onClick={() => selectStudent(i)}
                    >
                      {s}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* grading panel */}
        {task && resp && (
          <Card className="max-w-screen-lg mx-auto flex flex-col">
            <CardHeader className="gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Student: {resp.studentId}</h2>

                {/* NEW: toggle question visibility */}
                <Button
                  variant="outline"
                  onClick={() => setShowQuestion((v) => !v)}
                  aria-pressed={!showQuestion}
                  title={showQuestion ? 'Hide question' : 'Show question'}
                >
                  {showQuestion ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {showQuestion ? 'Hide Question' : 'Show Question'}
                </Button>
              </div>

              {/* question nav */}
              <div className="flex items-center gap-4">
                <Button onClick={gotoPrevQuestion} disabled={questionIdx === 0}>
                  <ChevronLeft />
                </Button>

                <span>
                  Q {questionIdx + 1}/{task.questions.length}
                </span>

                <Button onClick={gotoNext} disabled={isLastQuestion && !(stuIdx < students.length - 1)}>
                  <ChevronRight />
                </Button>
              </div>

              {/* statement + response; statement collapsible */}
              <div className={`flex ${showQuestion ? 'flex-col md:flex-row' : 'flex-col'} justify-between gap-8`}>
                {showQuestion && (
                  <div className="flex-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {task.questions[questionIdx].text}
                    </ReactMarkdown>
                  </div>
                )}

                <div className={`${showQuestion ? 'flex-1' : 'w-full'} border p-4 rounded`}>
                  {resp.answer || 'No response'}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <div className="flex gap-2">
                {/* grade buttons 0 / 1 / 2 */}
                <div className="flex">
                  {[0, 1, 2].map((v) => {
                    const isSelected = grade === v;
                    const isAi = ai === v;

                    const highlightClass = showAiHighlight && isAi ? 'bg-green-300' : '';
                    const aiBorderOnly =
                      !showAiHighlight && isAi && grade != null && grade !== ai
                        ? 'bg-green-200 border-green-300 border'
                        : '';

                    return (
                      <Button
                        key={v}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setGrade(v)}
                        className={[
                          'rounded-none font-bold text-2xl border p-6',
                          v === 0 ? 'rounded-l-lg' : '',
                          v === 2 ? 'rounded-r-lg' : '',
                          highlightClass,
                          aiBorderOnly,
                        ].join(' ')}
                      >
                        {v}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={gotoNext}
                  disabled={saving}
                  className={
                    (canConfirmAI ? false : grade == null || grade === savedGrade) ? 'hidden' : 'p-6 text-2xl font-bold'
                  }
                >
                  {saving ? <RotateCw className="animate-spin" /> : canConfirmAI ? 'Confirm' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* loaders */}
        {tasks.length === 0 ? (
          <div className="flex justify-center items-center gap-2">
            <RotateCw className="animate-spin" />
            <p>Fetching Tasks...</p>
          </div>
        ) : task != null && !resp ? (
          <div className="flex justify-center items-center gap-2">
            <RotateCw className="animate-spin" />
            <p>{students.length > 0 ? 'Loading Responses...' : 'Loading Students...'}</p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
