'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RotateCw, Eye, EyeOff, FileText } from 'lucide-react';
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

/* ---------- hardcoded rubrics (taskId-questionId keys) ---------- */
const RUBRICS: Record<string, string> = {
  '2-1': `Independent Variable: Number of churches

Dependent Variable: Crime rate

**Score Criteria**
- **2 points** – Correct identification of independent and dependent variables.
- **1 point** – Partially correct: correctly identifies one of the variables.
- **0 points** – Variables are incorrectly identified, or explanation reflects misunderstanding of correlation vs. causation.`,
  '2-2': `**Score Criteria**
- **2 points** – Finds the common price r = 38/7 or ≈ 5.43 (rounding differences acceptable).
- **1 point** – Clear partial understanding, e.g. any one:
  - Writes the correct equality but makes an algebra/arithmetical slip.
  - Finds the correct w but omits or mis-computes the price.
  - Sets the correct equality 4 + 0.25w = 2 + 0.60w
  - Solves for w = 40/7 ≈ 5.71 weeks
- **0 points** – Equation setup wrong, both numerical answers wrong, or blank.`,
  '2-3': `**Score Criteria**
- **2 points** – Gives **Wednesday** as the answer
- **1 point** – Any one:
  - Finds LCM 24 days but wrong final weekday.
  - Gives the correct weekday with no or faulty work.
  - Arithmetic slip in offset but weekday consistent with that slip.
- **0 points** – Wrong weekday or no answer.`,
  '2-4': `**Score Criteria**
- **2 points** – Writes a plausible interpretation and solves it correctly.
- **1 point** – Any one:
  - Correct (plausible) equation but algebra/arithmetical error.
  - Gives any plausible answer (e.g., x = −2) but with no clear justification.
- **0 points** – Equation and answer both wrong or missing.


**Non-Exhaustive Examples of Plausible Interpretations:**
- 3(5) + 4x = 3(-2x) => -1.5
- 15 + 4x = 3 - 2x   => -2
- 3(5+4x) = 3 - 2x   => -0.857
- 15 + 12x = 3 - 2x  => -0.857
- 15 + 4x = x        => -5
- 15 + 12x = x       => -1.364
- 15 + 4x = 3x - 2   => -17
- 15 + 12x = 3x - 2  => -1.889
- 3(5+4x) = 3(-2x) => -0.8333`,
  '2-5': `**Score Criteria**
- **2 points** – States the student answer is **incorrect**.
- **1 point** – Gives the correct expression but forgets to say the student answer is wrong.
- **0 points** – Claims the student answer is correct or leaves blank.`,
  '2-6': `**Score Criteria**
- **2 points** – answers **2160** units sold.
- **1 point** – Partial reasoning, e.g.:
  - Finds $23760 but division error.
  - Chooses wrong swapped number but divides by 11 correctly.
- **0 points** – Wrong or no answer.`,
  '3-1': `**Score Criteria**
- **2 points** – States a decision and gives a reason that matches the decision (e.g., helps the most people or fairest to everyone).
- **1 point** – Gives a decision but the reason only partly fits / vague / misses key facts **OR** gives a solid reason but decision unclear.
- **0 points** – No decision, decision & reason don’t match, off-topic/blank.`,
  '3-2': `**Score Criteria**
- **2 points** – States which strategy is chosen (**Risk Sacrificing a Player** or **Play it Safe**), gives a reason that logically matches the choice and references at least one key fact/value (player health, odds, future funding, morale, fairness, etc.), with no obvious contradiction.
- **1 point** – Decision given but reason is vague or partly at odds **OR** reasonable argument but no (or changed) decision.
- **0 points** – No decision, off-topic reasoning, or clear mismatch between decision and justification.`,
  '3-3': `**Score Criteria**

**2 – Accurate & well-argued**
- **Grade choice:** Assigns **C (70–79%)** or nearby (B or D) as the overall rating **and**
- **Justification:** Explains at least one key weakness (e.g., omits sexual-assault trauma, mislabels conflict as bullying, shallow analysis) **and** one strength (e.g., art/tree symbolism, clear structure).
- Reasoning is specific, fact-based, and clearly tied to the chosen letter grade.

**1 – Partially accurate / thin reasoning**
- Assigns **C** or nearby (B or D) **and**
- Justification is vague/generic.

**0 – Off target / unsupported**
- Gives an implausible grade (A or F) or none, **or**
- Grade & explanation mismatch (e.g., says “average” but assigns A), **or**
- Major factual errors / irrelevant rationale.`,
  '3-4': `**Score Criteria**

**2 – Accurate & well-argued**
- **Grade choice:** Assigns **B (80–89%)** or nearby (A or C) **and**
- **Justification:** Cites specific strengths (e.g., relevant quotations, accurate symbolism, clear organization) **and** notes at least one limitation (e.g., still avoids explicit mention of assault, limited depth). Reasoning aligns with the grade.

**1 – Partially accurate / thin reasoning**
- Assigns **B** or nearby (A or C) **and**
- Justification is surface-level without specifics.

**0 – Off target / unsupported**
- Gives an unlikely grade (D or F) or omits grade, **or**
- Grade conflicts with rationale, **or**
- Major factual errors / irrelevant rationale.`,
};

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

  // collapsible question statement
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

  // NEW: rubric toggle (starts hidden)
  const [showRubric, setShowRubric] = useState(false);

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

  // Resolve rubric text for current task/question
  const rubricText = useMemo(() => {
    if (!task) return null;
    const q = task.questions[questionIdx];
    if (!q) return null;
    return RUBRICS[`${task.id}-${q.id}`] ?? null;
  }, [task, questionIdx]);

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

    if (questionIdx < task.questions.length - 1) {
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

                {/* toggles */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowQuestion((v) => !v)}
                    aria-pressed={!showQuestion}
                    title={showQuestion ? 'Hide question' : 'Show question'}
                  >
                    {showQuestion ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showQuestion ? 'Hide Question' : 'Show Question'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowRubric((v) => !v)}
                    disabled={!rubricText}
                    title={!rubricText ? 'No rubric for this question' : showRubric ? 'Hide rubric' : 'Show rubric'}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {showRubric ? 'Hide Rubric' : 'Show Rubric'}
                  </Button>
                </div>
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

              {/* statement + response */}
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

              {/* rubric (collapsible, below the statement/response row) */}
              {showRubric && rubricText && (
                <div className="mt-4 border rounded p-4 bg-gray-50">
                  <h3 className="font-semibold mb-2">Rubric</h3>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{rubricText}</ReactMarkdown>
                </div>
              )}
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
