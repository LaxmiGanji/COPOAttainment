"use client";

import React, { useState, useEffect } from "react";
import {
  Course,
  ExamAssessment,
  QuestionConfig,
  SubQuestionConfig,
  RuleEngineCase,
  createExam,
  updateExam,
  cleanExamTitle,
} from "@/lib/api";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  GitFork,
  Star,
  Layers,
  BookOpen,
} from "lucide-react";

interface Props {
  course: Course | null;
  allCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  exams: ExamAssessment[];
  selectedExam: ExamAssessment | null;
  onSelectExam: (exam: ExamAssessment) => void;
  onExamSaved: (exam: ExamAssessment) => void;
  onProceedToTemplate?: (savedExam?: ExamAssessment) => void;
}

const BLOOMS_LEVELS = [
  { code: "L1", label: "L1 - Remember" },
  { code: "L2", label: "L2 - Understand" },
  { code: "L3", label: "L3 - Apply" },
  { code: "L4", label: "L4 - Analyze" },
  { code: "L5", label: "L5 - Evaluate" },
  { code: "L6", label: "L6 - Create" },
];

export default function QuestionMappingRuleTab({
  course,
  allCourses = [],
  onSelectCourse,
  exams,
  selectedExam,
  onSelectExam,
  onExamSaved,
  onProceedToTemplate,
}: Props) {
  const [examForm, setExamForm] = useState<ExamAssessment>({
    courseId: course?.id || "",
    examType: "IAT-1",
    title: "Internal Assessment Test - 1",
    maxMarks: 50,
    ruleEngineCase: "CASE_1_TOP_N",
    ruleConfig: {
      topN: 3,
      mandatoryQuestionIds: [],
      orPairs: [],
    },
    questions: [],
  });

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedExam) {
      setExamForm({
        ...selectedExam,
        title: cleanExamTitle(selectedExam.title),
      });
    } else if (course?.id) {
      setExamForm({
        courseId: course.id,
        examType: "IAT-1",
        title: "Internal Assessment Test - 1",
        maxMarks: 50,
        ruleEngineCase: "CASE_1_TOP_N",
        ruleConfig: {
          topN: 3,
          mandatoryQuestionIds: [],
          orPairs: [],
        },
        questions: [],
      });
    }
  }, [selectedExam, course?.id]);

  // Helper to categorize exams consistently
  const getExamCategory = (ex: ExamAssessment | null): "IA 1" | "IA 2" | "SEM final" => {
    if (!ex) return "IA 1";
    const et = (ex.examType || "").toUpperCase();
    const t = (ex.title || "").toUpperCase();
    if (
      et.includes("2") ||
      et.includes("IAT-2") ||
      t.includes("TEST - 2") ||
      t.includes("TEST 2") ||
      t.includes("IA 2") ||
      t.includes("IA-2") ||
      (t.includes("2") && !t.includes("1"))
    ) {
      return "IA 2";
    }
    if (
      et.includes("SEM") ||
      et.includes("FINAL") ||
      et.includes("MODEL") ||
      et.includes("END") ||
      t.includes("FINAL") ||
      t.includes("SEMESTER") ||
      t.includes("MODEL") ||
      t.includes("END")
    ) {
      return "SEM final";
    }
    return "IA 1";
  };

  const activeCategory = getExamCategory(selectedExam || examForm);

  const switchToCategory = async (cat: "IA 1" | "IA 2" | "SEM final") => {
    // 1. Check if exam exists in current course exams
    const existing = exams.find((e) => getExamCategory(e) === cat);
    if (existing) {
      onSelectExam(existing);
      return;
    }

    // 2. If not found in database, initialize template exam for that category
    if (!course?.id) return;
    const cos = course.courseOutcomes || [];
    const coCount = cos.length > 0 ? cos.length : 5;

    let newEx: ExamAssessment;
    if (cat === "IA 2") {
      newEx = {
        courseId: course.id,
        examType: "IAT-2",
        title: "Internal Assessment Test - 2",
        maxMarks: 30,
        ruleEngineCase: "CASE_1_TOP_N",
        ruleConfig: { topN: 3, mandatoryQuestionIds: [], orPairs: [] },
        questions: [1, 2, 3, 4].map((i) => {
          const co = cos[(i + 1) % coCount]?.coCode || `CO${Math.min(5, Math.max(3, i + 1))}`;
          return {
            questionId: `Q${i}`,
            questionNumber: i,
            label: `Question ${i}`,
            isMandatory: i === 1,
            orWithQuestionId: "",
            coCode: co,
            directMaxMarks: 10,
            subQuestions: [
              { subQuestionId: `Q${i}a`, parentQuestionId: `Q${i}`, label: `${i}.(a)`, maxMarks: 5, coCode: co, bloomsLevel: "L3" },
              { subQuestionId: `Q${i}b`, parentQuestionId: `Q${i}`, label: `${i}.(b)`, maxMarks: 5, coCode: co, bloomsLevel: "L4" },
            ],
          };
        }),
      };
    } else if (cat === "SEM final") {
      newEx = {
        courseId: course.id,
        examType: "SEMESTER_END",
        title: "Semester Final Examination",
        maxMarks: 50,
        ruleEngineCase: "CASE_1_TOP_N",
        ruleConfig: { topN: 5, mandatoryQuestionIds: [], orPairs: [] },
        questions: [1, 2, 3, 4, 5, 6].map((i) => {
          const co = cos[(i - 1) % coCount]?.coCode || `CO${((i - 1) % 5) + 1}`;
          return {
            questionId: `Q${i}`,
            questionNumber: i,
            label: `Question ${i}`,
            isMandatory: false,
            orWithQuestionId: "",
            coCode: co,
            directMaxMarks: 10,
            subQuestions: [
              { subQuestionId: `Q${i}a`, parentQuestionId: `Q${i}`, label: `${i}.(a)`, maxMarks: 5, coCode: co, bloomsLevel: "L3" },
              { subQuestionId: `Q${i}b`, parentQuestionId: `Q${i}`, label: `${i}.(b)`, maxMarks: 5, coCode: co, bloomsLevel: "L4" },
            ],
          };
        }),
      };
    } else {
      newEx = {
        courseId: course.id,
        examType: "IAT-1",
        title: "Internal Assessment Test - 1",
        maxMarks: 40,
        ruleEngineCase: "CASE_1_TOP_N",
        ruleConfig: { topN: 4, mandatoryQuestionIds: [], orPairs: [] },
        questions: [1, 2, 3, 4, 5].map((i) => {
          const co = cos[(i - 1) % coCount]?.coCode || `CO${Math.min(3, ((i - 1) % 3) + 1)}`;
          return {
            questionId: `Q${i}`,
            questionNumber: i,
            label: `Question ${i}`,
            isMandatory: false,
            orWithQuestionId: "",
            coCode: co,
            directMaxMarks: 10,
            subQuestions: [
              { subQuestionId: `Q${i}a`, parentQuestionId: `Q${i}`, label: `${i}.(a)`, maxMarks: 5, coCode: co, bloomsLevel: "L2" },
              { subQuestionId: `Q${i}b`, parentQuestionId: `Q${i}`, label: `${i}.(b)`, maxMarks: 5, coCode: co, bloomsLevel: "L3" },
            ],
          };
        }),
      };
    }

    try {
      setSaving(true);
      const saved = await createExam(newEx);
      onExamSaved(saved);
      onSelectExam(saved);
    } catch (err: any) {
      console.error("Auto-create exam error:", err);
      setExamForm(newEx);
    } finally {
      setSaving(false);
    }
  };

  // Add a new question directly
  const addMainQuestion = () => {
    const qNum = examForm.questions.length + 1;
    const qId = `Q${qNum}`;
    const defaultCo = course?.courseOutcomes?.[(qNum - 1) % (course?.courseOutcomes?.length || 1)]?.coCode || "CO1";

    const newQ: QuestionConfig = {
      questionId: qId,
      questionNumber: qNum,
      label: `Question ${qNum}`,
      isMandatory: false,
      orWithQuestionId: "",
      coCode: defaultCo,
      directMaxMarks: 10,
      subQuestions: [
        {
          subQuestionId: `${qId}a`,
          parentQuestionId: qId,
          label: `${qNum}.(a)`,
          maxMarks: 5,
          coCode: defaultCo,
          bloomsLevel: "L2",
        },
        {
          subQuestionId: `${qId}b`,
          parentQuestionId: qId,
          label: `${qNum}.(b)`,
          maxMarks: 5,
          coCode: defaultCo,
          bloomsLevel: "L3",
        },
      ],
    };

    setExamForm({
      ...examForm,
      questions: [...examForm.questions, newQ],
    });
  };

  const removeMainQuestion = (idx: number) => {
    const updated = examForm.questions.filter((_, i) => i !== idx);
    setExamForm({ ...examForm, questions: updated });
  };

  const updateQuestion = (idx: number, updates: Partial<QuestionConfig>) => {
    const updated = [...examForm.questions];
    const targetQ = { ...updated[idx], ...updates };
    // Automatically cascade Target CO down to all its sub-questions so template columns stay in sync
    if (updates.coCode && targetQ.subQuestions && targetQ.subQuestions.length > 0) {
      targetQ.subQuestions = targetQ.subQuestions.map((sq) => ({
        ...sq,
        coCode: updates.coCode!,
      }));
    }
    updated[idx] = targetQ;
    setExamForm({ ...examForm, questions: updated });
  };

  const addSubQuestion = (qIdx: number) => {
    const updatedQuestions = [...examForm.questions];
    const q = { ...updatedQuestions[qIdx] };
    const nextSubChar = String.fromCharCode(97 + q.subQuestions.length); // a, b, c, ...
    const subId = `${q.questionId}${nextSubChar}`;
    const defaultCo = q.coCode || course?.courseOutcomes?.[0]?.coCode || "CO1";

    const newSub: SubQuestionConfig = {
      subQuestionId: subId,
      parentQuestionId: q.questionId,
      label: `${q.questionNumber}.(${nextSubChar})`,
      maxMarks: 5,
      coCode: defaultCo,
      bloomsLevel: "L2",
    };

    q.subQuestions = [...q.subQuestions, newSub];
    updatedQuestions[qIdx] = q;
    setExamForm({ ...examForm, questions: updatedQuestions });
  };

  const removeSubQuestion = (qIdx: number, subIdx: number) => {
    const updatedQuestions = [...examForm.questions];
    const q = { ...updatedQuestions[qIdx] };
    q.subQuestions = q.subQuestions.filter((_, i) => i !== subIdx);
    updatedQuestions[qIdx] = q;
    setExamForm({ ...examForm, questions: updatedQuestions });
  };

  const handleSubChange = (qIdx: number, subIdx: number, field: keyof SubQuestionConfig, value: any) => {
    const updatedQuestions = [...examForm.questions];
    const q = { ...updatedQuestions[qIdx] };
    const subs = [...q.subQuestions];
    subs[subIdx] = { ...subs[subIdx], [field]: value };
    q.subQuestions = subs;
    // If coCode changed on subquestion and parent only has 1 subquestion, sync parent coCode too
    if (field === "coCode" && subIdx === 0 && (q.subQuestions.length === 1 || !q.coCode)) {
      q.coCode = value;
    }
    updatedQuestions[qIdx] = q;
    setExamForm({ ...examForm, questions: updatedQuestions });
  };

  // Compile rules automatically without confusing the user
  const compileRulesAndSave = async () => {
    const targetCourse = course?.id ? course : (allCourses && allCourses.length > 0 ? allCourses[0] : null);
    if (!targetCourse?.id) {
      setStatusMsg("Please select or save a course in Step 1 first.");
      return null;
    }
    if ((!course || !course.id) && onSelectCourse) {
      onSelectCourse(targetCourse.id);
    }

    setSaving(true);
    setStatusMsg(null);

    // 1. Gather all mandatory questions
    const mandatoryIds = examForm.questions
      .filter((q) => q.isMandatory)
      .map((q) => q.questionId);

    // 2. Gather OR pairs (questions that have orWithQuestionId set)
    const orPairs: any[] = [];
    const pairedSet = new Set<string>();

    examForm.questions.forEach((q) => {
      if (q.orWithQuestionId && q.orWithQuestionId.trim() !== "" && !pairedSet.has(q.questionId)) {
        pairedSet.add(q.questionId);
        pairedSet.add(q.orWithQuestionId);
        orPairs.push({
          groupName: `Choice Group (${q.questionId} OR ${q.orWithQuestionId})`,
          questionA: q.questionId,
          questionB: q.orWithQuestionId,
        });
      }
    });

    // 3. Determine backend case automatically
    let derivedCase: RuleEngineCase = "CASE_1_TOP_N";
    if (orPairs.length > 0) {
      derivedCase = "CASE_3_PAIRWISE_OR";
    } else if (mandatoryIds.length > 0) {
      derivedCase = "CASE_2_MANDATORY_PLUS_TOP_N";
    } else {
      derivedCase = "CASE_1_TOP_N";
    }

    const payload: ExamAssessment = {
      ...examForm,
      courseId: targetCourse.id,
      ruleEngineCase: derivedCase,
      ruleConfig: {
        topN: examForm.ruleConfig.topN || 3,
        mandatoryQuestionIds: mandatoryIds,
        orPairs: orPairs,
      },
    };

    try {
      let saved: ExamAssessment;
      if (examForm.id) {
        saved = await updateExam(examForm.id, payload);
      } else {
        saved = await createExam(payload);
      }
      onExamSaved(saved);
      setStatusMsg(`✓ Question-to-CO mapping saved for ${saved.title || saved.examType}! Directly reflected in template.`);
      setTimeout(() => setStatusMsg(null), 4000);
      return saved;
    } catch (err: any) {
      setStatusMsg("Error saving: " + err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const allAvailableQIds = examForm.questions.map((q) => q.questionId);

  if (!course) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-white space-y-4">
        <BookOpen className="w-12 h-12 text-indigo-400 mx-auto" />
        <h3 className="text-lg font-bold">No Course Selected</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Please select a course to configure its questions, sub-questions, and Course Outcome (CO) mapping.
        </p>
        {allCourses && allCourses.length > 0 && (
          <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-slate-400 font-semibold">Select Course:</span>
            <select
              className="bg-transparent font-bold text-white text-sm focus:outline-none cursor-pointer"
              onChange={(e) => onSelectCourse && onSelectCourse(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Choose a course...
              </option>
              {allCourses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                  {c.courseCode} - {c.courseName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Exam Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Question-to-CO Mapping & Evaluation Setup
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure each question's marks, mapped Course Outcomes (COs), and simply choose right near each question if it is <strong>Mandatory</strong> or a <strong>Choice</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Course Filter Dropdown */}
            {allCourses && allCourses.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950 border border-indigo-700/60 px-3 py-1.5 rounded-lg text-xs shadow-xs">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-slate-400 font-semibold">Course:</span>
                <select
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer pr-1"
                  value={course?.id || ""}
                  onChange={(e) => onSelectCourse && onSelectCourse(e.target.value)}
                  title="Filter / Select Course"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direct Switcher: IA 1, IA 2, end sem exam */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => switchToCategory("IA 1")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === "IA 1"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>IA 1</span>
                {activeCategory === "IA 1" && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
              </button>
              <button
                type="button"
                onClick={() => switchToCategory("IA 2")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === "IA 2"
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>IA 2</span>
                {activeCategory === "IA 2" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
              <button
                type="button"
                onClick={() => switchToCategory("SEM final")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === "SEM final"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>end sem exam</span>
                {activeCategory === "SEM final" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
            </div>

            {exams.length > 0 && (
              <select
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-700 bg-slate-950 text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={selectedExam?.id || ""}
                onChange={(e) => {
                  const found = exams.find((x) => x.id === e.target.value);
                  if (found) onSelectExam(found);
                }}
                title="Select Exam"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-slate-900 text-white font-medium">
                    {cleanExamTitle(ex.title) || ex.examType}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Active Course & Configured CO Badges */}
        <div className="mb-6 p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800/80">
              {course.courseCode}
            </span>
            <span className="font-semibold text-slate-200 text-sm">
              {course.courseName}
            </span>
            <span className="text-slate-400">
              ({course.department || "Dept"} • Sem {course.semester})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Mapped Course Outcomes:</span>
            {course.courseOutcomes && course.courseOutcomes.length > 0 ? (
              course.courseOutcomes.map((co) => (
                <span
                  key={co.coCode}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono font-bold text-[11px]"
                  title={co.description || co.coCode}
                >
                  {co.coCode}
                </span>
              ))
            ) : (
              <span className="text-amber-400 text-[11px] italic">
                No COs configured in Step 1 (Defaulting to CO1-CO5)
              </span>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Basic Exam Meta */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Exam Title</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-sm text-white font-medium"
              value={cleanExamTitle(examForm.title)}
              onChange={(e) => setExamForm({ ...examForm, title: cleanExamTitle(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Exam Type</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-sm text-white"
              value={examForm.examType}
              onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
              placeholder="e.g. Midterm, IAT-1, Final"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Total Exam Max Marks</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-sm text-white font-medium"
              value={examForm.maxMarks}
              onChange={(e) => setExamForm({ ...examForm, maxMarks: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Total Questions to Evaluate (N)</label>
            <input
              type="number"
              min={1}
              max={examForm.questions.length || 10}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-950 rounded-lg text-sm text-indigo-400 font-bold"
              value={examForm.ruleConfig.topN || 3}
              onChange={(e) =>
                setExamForm({
                  ...examForm,
                  ruleConfig: {
                    ...examForm.ruleConfig,
                    topN: parseInt(e.target.value) || 1,
                  },
                })
              }
              title="Total questions to evaluate (e.g. 4 out of 6: mandatory questions are always counted whether attempted or not, plus best remaining optional questions)"
            />
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Intuitive Rule Detection:</strong> Mark questions as <strong>Mandatory</strong>, or link them as an <strong>OR Choice</strong> directly on each question card. The system automatically configures the evaluation rules without complicated dropboxes!
            </span>
          </div>
          <button
            type="button"
            onClick={addMainQuestion}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* QUESTIONS LIST WITH INLINE CHOICE & MANDATORY CONTROLS */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-6">
        {examForm.questions.map((q, qIdx) => {
          const totalQMarks = q.subQuestions?.length
            ? q.subQuestions.reduce((sum, sq) => sum + (sq.maxMarks || 0), 0)
            : q.directMaxMarks || 10;

          return (
            <div
              key={q.questionId}
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 text-white space-y-4 transition hover:border-slate-700"
            >
              {/* Question Header & Inline Rule Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 font-bold flex items-center justify-center text-sm">
                    {q.questionId}
                  </span>
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) => updateQuestion(qIdx, { label: e.target.value })}
                    className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded text-sm font-bold text-white w-48"
                  />
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 font-mono">
                    Total: {totalQMarks} marks
                  </span>
                </div>

                {/* INLINE QUESTION OPTION: Mandatory vs Choice OR vs Optional */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Option 1: Mandatory Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(qIdx, {
                        isMandatory: !q.isMandatory,
                        orWithQuestionId: q.isMandatory ? q.orWithQuestionId : "",
                      })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      q.isMandatory
                        ? "bg-emerald-950 border-emerald-500 text-emerald-300 shadow-xs"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${q.isMandatory ? "fill-emerald-400 text-emerald-400" : ""}`} />
                    <span>{q.isMandatory ? "Mandatory (Compulsory)" : "Mark Mandatory"}</span>
                  </button>

                  {/* Option 2: Internal Choice OR with another question */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
                    <GitFork className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-slate-400 font-medium">OR Choice with:</span>
                    <select
                      className="bg-slate-900 border border-slate-700 text-purple-300 font-bold px-2 py-0.5 rounded text-xs focus:outline-none"
                      value={q.orWithQuestionId || ""}
                      onChange={(e) =>
                        updateQuestion(qIdx, {
                          orWithQuestionId: e.target.value,
                          isMandatory: e.target.value ? false : q.isMandatory,
                        })
                      }
                    >
                      <option value="">None (Standalone)</option>
                      {allAvailableQIds
                        .filter((otherId) => otherId !== q.questionId)
                        .map((otherId) => (
                          <option key={otherId} value={otherId}>
                            {otherId} (e.g. {q.questionId} OR {otherId})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Target CO direct mapping */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
                    <span className="text-slate-400 font-medium">Target CO:</span>
                    <select
                      className="bg-slate-900 border border-slate-700 text-indigo-300 font-bold px-2 py-0.5 rounded text-xs focus:outline-none"
                      value={q.coCode || "CO1"}
                      onChange={(e) => updateQuestion(qIdx, { coCode: e.target.value })}
                    >
                      {course?.courseOutcomes?.map((co) => (
                        <option key={co.coCode} value={co.coCode}>
                          {co.coCode}
                        </option>
                      )) || (
                        <>
                          <option value="CO1">CO1</option>
                          <option value="CO2">CO2</option>
                          <option value="CO3">CO3</option>
                          <option value="CO4">CO4</option>
                          <option value="CO5">CO5</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Delete Question */}
                  <button
                    type="button"
                    onClick={() => removeMainQuestion(qIdx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Visual Badge showing current rule status */}
              <div className="flex items-center gap-2 text-xs">
                {q.isMandatory && (
                  <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Compulsory Question (Evaluated for all students)
                  </span>
                )}
                {q.orWithQuestionId && (
                  <span className="bg-purple-950/80 border border-purple-800 text-purple-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <GitFork className="w-3 h-3 text-purple-400" /> Internal Choice: Best of {q.questionId} OR {q.orWithQuestionId}
                  </span>
                )}
                {!q.isMandatory && !q.orWithQuestionId && (
                  <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full font-semibold">
                    General Optional Pool (Eligible for Top N best selection)
                  </span>
                )}
              </div>

              {/* Sub-questions section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Sub-Questions Breakdown ({q.subQuestions?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => addSubQuestion(qIdx)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Sub-Part (a/b/c)
                  </button>
                </div>

                <div className="space-y-2">
                  {q.subQuestions?.map((sub, subIdx) => (
                    <div
                      key={sub.subQuestionId}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs"
                    >
                      <div className="sm:col-span-2 flex items-center gap-1.5 font-mono font-bold text-slate-300">
                        <span>{sub.subQuestionId}</span>
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={sub.label}
                          onChange={(e) => handleSubChange(qIdx, subIdx, "label", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                          placeholder="Label (e.g. 1.(a))"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={sub.maxMarks}
                            onChange={(e) => handleSubChange(qIdx, subIdx, "maxMarks", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-amber-400"
                          />
                          <span className="text-[10px] text-slate-500">marks</span>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={sub.coCode}
                          onChange={(e) => handleSubChange(qIdx, subIdx, "coCode", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-indigo-300 font-bold"
                        >
                          {course?.courseOutcomes?.map((co) => (
                            <option key={co.coCode} value={co.coCode}>
                              {co.coCode}
                            </option>
                          )) || <option value="CO1">CO1</option>}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={sub.bloomsLevel}
                          onChange={(e) => handleSubChange(qIdx, subIdx, "bloomsLevel", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                        >
                          {BLOOMS_LEVELS.map((b) => (
                            <option key={b.code} value={b.code}>
                              {b.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeSubQuestion(qIdx, subIdx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save & Generate Template Buttons */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={compileRulesAndSave}
          disabled={saving}
          className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition text-xs"
        >
          {saving ? "Saving Configuration..." : "Save Question Mapping Only"}
        </button>

        {onProceedToTemplate && (
          <button
            type="button"
            onClick={async () => {
              const saved = await compileRulesAndSave();
              onProceedToTemplate(saved || undefined);
            }}
            disabled={saving}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition text-xs"
          >
            <span>Save & Generate Assessment Template</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
