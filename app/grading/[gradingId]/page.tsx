'use client';

import { useState, useEffect } from 'react';
import Layout        from '@/components/layout';
import { Button }    from '@/components/ui/button';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from '@/components/ui/card';
import {
  ChevronLeft, ChevronRight,
  ChevronsUp,  ChevronsDown,
  RotateCw,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm     from 'remark-gfm';

/* ---------- types ---------- */
type Task = {
  id: string;
  title: string;
  questions: { id: string; text: string }[];
};

type Response = {
  studentId: string;
  answer: string;
  grades: Record<string, string>;
};

/* ---------- component ---------- */
export default function GradeByStudent() {
  const { gradingId } = useParams() as { gradingId: string }; // "Grade3"

  /* task & student selection */
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [task,  setTask]          = useState<Task | null>(null);
  const [students, setStudents]   = useState<string[]>([]);
  const [stuIdx,   setStuIdx]     = useState(0); // which student

  /* per-question response for current student */
  const [questionIdx, setQuestionIdx] = useState(0);
  const [resp, setResp] = useState<Response | null>(null);
  const [studentResponses, setStudentResponses] = useState<(Response|null)[]>([]);
  
  /* grading UI */
  const [savedGrade, setSaved] = useState<number | null>(null);
  const [grade,      setGrade] = useState<number | null>(null);
  const [saving,     setSaving]= useState(false);

  /* fetch tasks once */
  useEffect(() => {
    fetch('/api/tasks').then(r=>r.json()).then(setTasks).catch(console.error);
  }, []);

  const toNum = (x: any): number | null => {
    const n = parseInt(String(x ?? ''), 10);
    return Number.isFinite(n) ? n : null;
  };

  const consolidateIfNeeded = async () => {
  if (!task || !resp) return;
  // Only consolidate when nothing saved AND user didn't pick a grade
  if (savedGrade == null && grade == null) {
    const ai = toNum(resp.grades["GradeAI"]);
    if (ai != null) {
      try {
        await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            questionId: task.questions[questionIdx].id,
            studentId: resp.studentId,
            value: ai, // always goes to Grade6 server-side
          }),
        });
        setSaved(ai);
      } catch (e) {
        console.error('Auto-consolidate failed', e);
      }
    }
  }
};


  /* when a task is chosen, pull list of studentIds from Q1 */
  const chooseTask = async (t: Task) => {
    setTask(t);
    setQuestionIdx(0);
    setStuIdx(0);
    setResp(null);
    setSaved(null);
    setGrade(null);

    if (!t.questions.length) return;
    const firstQ = t.questions[0];
    const r = await fetch(`/api/${t.id}/${firstQ.id}/responses`).then(r=>r.json());
    const ids = r.responses.map((x: Response) => x.studentId);
    setStudents(ids);

    if (ids.length) fetchAllForStudent(t, ids[0]);
  };

  useEffect(() => {
    const r = studentResponses[questionIdx] || null;
    setResp(r);
  
    const saved = toNum(r?.grades['FinalGrade']); // <- always Grade6
    setSaved(saved);
    setGrade(saved ?? null); // if there is a saved grade, select it; otherwise keep null
  }, [questionIdx, studentResponses]);

  /* fetch every question’s response for a single student (array aligned to questions) */
const fetchAllForStudent = async (t: Task, stuId: string) => {
    const list: (Response|null)[] = await Promise.all(
      t.questions.map(async (q) => {
        const { responses } = await fetch(`/api/${t.id}/${q.id}/responses`).then(r=>r.json());
        return responses.find((x:Response)=>x.studentId===stuId) || null;
      })
    );
    setStudentResponses(list);
    setResp(list[0]);
      // initialise grading state
    const saved = toNum(list[0]?.grades['FinalGrade']);
    setSaved(saved);
    setGrade(saved ?? null);
  };

  /* save */
  const save = async () => {
    if (!task || !resp || grade==null || grade===savedGrade) return;
    setSaving(true);
    try {
      await fetch('/api/grade', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          taskId: task.id,
          questionId: task.questions[questionIdx].id,
          studentId: resp.studentId,
          value: grade, // grade goes to Grade6 server-side
        })
      });

      setSaved(grade);
    }catch(e){console.error(e);}finally{setSaving(false);}
  };

  /* UI */

  return (
    <Layout>
      <div className="space-y-6">

        {/* choose task */}
        {!task && (
          <div className="flex flex-wrap gap-4 justify-center">
            {tasks.map(t=>(
              <Card key={t.id} className="cursor-pointer" onClick={()=>chooseTask(t)}>
                <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
                <CardFooter>Questions: {t.questions.length}</CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* choose student */}
        <div className="max-w-screen-lg mx-auto mb-12 flex flex-wrap gap-4 justify-center mt-8">
            {students.map((s,i)=>(
              <Button
                key={s}
                variant={i===stuIdx?'default':'outline'}
                onClick={async ()=>{
                  await consolidateIfNeeded();
                  setResp(null);
                  setStuIdx(i);
                  setQuestionIdx(0);
                  fetchAllForStudent(task!, students[i]);
                }}

              >
                {s}
              </Button>
            ))}
        </div>

        {/* grading panel */}
        {task && resp && (
          <Card className="max-w-screen-lg mx-auto flex flex-col">
            <CardHeader className='gap-4'>
              <h2 className="text-xl font-semibold">
                Student: {resp.studentId}
              </h2>
              {/* question nav */}
              <div className="flex items-center gap-4">
                <Button onClick={async () => {
    await consolidateIfNeeded();
    setQuestionIdx(i => Math.max(0, i - 1));
  }}
  disabled={questionIdx===0}><ChevronLeft/></Button>

                <span>
                  Q {questionIdx+1}/{task.questions.length}
                </span>

                <Button onClick={async () => {
    await consolidateIfNeeded();
    setQuestionIdx(i => Math.min(task!.questions.length - 1, i + 1));
  }}
  disabled={questionIdx===task.questions.length-1}
                ><ChevronRight/></Button>
              </div>

              <div className='flex flex-col md:flex-row justify-between gap-8'>
                <div className='flex-1'>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {task.questions[questionIdx].text}
                </ReactMarkdown>
                </div>

                <div className="flex-1 border p-4 rounded">
                  {resp.answer || 'No response'}
                </div>
              </div>
              
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <div className='flex gap-2'>
                {/* grade buttons 0 / 1 / 2 */}
                <div className="flex">
                  {[0,1,2].map(v => {

                    const ai = toNum(resp?.grades["GradeAI"]);
                    const showAiHighlight = savedGrade == null && grade == null; // only when untouched

                    const isSelected = grade === v;
                    const isAi = ai === v;

                    // show green "highlight" ring when untouched & this is the AI grade
                    const highlightClass =
                      showAiHighlight && isAi ? 'bg-green-300' : '';

                    // if user selected a different grade, give AI grade a green border only
                    const aiBorderOnly =
                      !showAiHighlight && isAi && grade != null && grade !== ai ? 'inset-shadow-green-300' : '';

                    return (
                      <Button
                        key={v}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setGrade(v)}
                        className={
                          'rounded-none ' +
                          (v === 0 ? 'rounded-l-lg' : '') +
                          (v === 2 ? 'rounded-r-lg' : '') +
                          ' font-bold text-2xl border p-6 ' +
                          highlightClass + ' ' + aiBorderOnly
                        }
                      >
                        {v}
                      </Button>
                    );
                  })}

                </div>
                <Button
                  onClick={save}
                  disabled={saving||grade==null||grade===savedGrade}
                  className='p-6 text-2xl font-bold'
                >
                  {saving?<RotateCw className="animate-spin"/>:'Save'}
                </Button>
              </div>

              {/* student nav */}
              {/*<div className="flex items-center gap-4">
                <Button onClick={()=>setStuIdx(i=>Math.max(0,i-1))}
                        disabled={stuIdx===0}><ChevronLeft/></Button>
                <span>
                  Student {stuIdx+1}/{students.length}
                </span>
                <Button onClick={()=>
                  setStuIdx(i=>Math.min(students.length-1,i+1))}
                  disabled={stuIdx===students.length-1}
                ><ChevronRight/></Button>
              </div>*/}
            </CardContent>
          </Card>
        )}

        {tasks.length == 0 ? (
          <div className="flex justify-center items-center gap-2">
            <RotateCw className="animate-spin"/><p>Fetching Tasks...</p>
          </div>
        ) : (task != null && !resp) ? (
          <div className="flex justify-center items-center gap-2">
            <RotateCw className="animate-spin"/><p>{students.length > 0 ? "Loading Responses..." : "Loading Students..."}</p>
          </div>
          ) : null}
      </div>
    </Layout>
  );
}
