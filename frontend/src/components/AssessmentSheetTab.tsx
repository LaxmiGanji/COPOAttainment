"use client";

import React, { useState, useEffect } from "react";
import {
  Course,
  getAssessmentTemplate,
  getAssessmentTemplateForCourse,
  calculateAssessmentSheet,
  saveAssessmentSheetMarks,
  exportAssessmentExcel,
  exportAssessmentPdf,
  cleanExamTitle,
} from "@/lib/api";
import {
  Download,
  RefreshCw,
  Trash2,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Server,
  Layers,
  BookOpen,
  Eraser,
  Sparkles,
  Save,
} from "lucide-react";

interface Props {
  currentCourse?: Course | null;
  allCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  exams?: any[];
  selectedExam?: any | null;
  onSelectExam?: (exam: any) => void;
  refreshTrigger?: number;
}

export default function AssessmentSheetTab({
  currentCourse,
  allCourses = [],
  onSelectCourse,
  exams = [],
  selectedExam,
  onSelectExam,
  refreshTrigger,
}: Props) {
  const [sheet, setSheet] = useState<any | null>(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>("IA 1"); // "IA 1" | "IA 2" | "SEM final"
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const getExamCategory = (ex: any): "IA 1" | "IA 2" | "SEM final" => {
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

  // Sync selectedAssessmentType only when an exam is selected from outside
  useEffect(() => {
    if (selectedExam) {
      const cat = getExamCategory(selectedExam);
      setSelectedAssessmentType(cat);
    }
  }, [selectedExam?.id]);

  useEffect(() => {
    const courseId = currentCourse?.id || (allCourses && allCourses.length > 0 ? allCourses[0].id : undefined);
    if (courseId) {
      if (!currentCourse?.id && onSelectCourse) {
        onSelectCourse(courseId);
      }
      // Strictly pass selectedExam.id only if it belongs to this course
      const validExamId = selectedExam?.courseId === courseId ? selectedExam.id : undefined;
      loadTemplateForCourse(courseId, selectedAssessmentType, validExamId);
    } else {
      loadDefaultTemplate();
    }
  }, [currentCourse?.id, selectedAssessmentType, refreshTrigger, selectedExam?.id, allCourses?.length]);

  const loadDefaultTemplate = async () => {
    setLoading(true);
    try {
      const data = await getAssessmentTemplate();
      setSheet(data);
    } catch (e: any) {
      console.error(e);
      setStatusMsg("Failed to connect to backend: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateForCourse = async (courseId: string, assessType: string = "IA 1", explicitExamId?: string) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      // Find matching examId from exams list strictly for this courseId and assessType
      let targetId = explicitExamId;
      if (!targetId) {
        const matched = exams?.find((ex: any) => ex.courseId === courseId && getExamCategory(ex) === assessType);
        targetId = matched ? matched.id : undefined;
      }
      const data = await getAssessmentTemplateForCourse(courseId, targetId, assessType);
      setSheet(data);
      if (data && data.examId && onSelectExam) {
        const matched = exams?.find((ex: any) => ex.courseId === courseId && ex.id === data.examId);
        if (matched) onSelectExam(matched);
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg("Failed to generate template for course: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentTypeChange = (newType: string) => {
    setSelectedAssessmentType(newType);
    const matchedExam = exams?.find((ex: any) => (ex.courseId === currentCourse?.id) && getExamCategory(ex) === newType);
    if (matchedExam && onSelectExam) {
      onSelectExam(matchedExam);
    }
    if (currentCourse?.id) {
      loadTemplateForCourse(currentCourse.id, newType, matchedExam?.id);
    }
  };

  /**
   * 100% of the mathematical calculations are done by the Spring Boot backend.
   * The frontend only captures raw marks input and renders the response.
   */
  const handleScoreChange = async (
    sIdx: number,
    examType: "mid" | "final",
    qId: string,
    val: string
  ) => {
    if (!sheet) return;

    // Deep clone state to update the entered mark
    const updated = JSON.parse(JSON.stringify(sheet));
    const st = updated.students[sIdx];
    if (examType === "mid") {
      st.midScores[qId] = val;
    } else {
      st.finalScores[qId] = val;
    }

    setSheet(updated);

    // Debounced or direct call to backend calculation
    try {
      setCalculating(true);
      const computed = await calculateAssessmentSheet(updated);
      setSheet(computed);
    } catch (err: any) {
      console.error("Backend calculation error:", err);
    } finally {
      setCalculating(false);
    }
  };

  const handleStudentMetaChange = (
    sIdx: number,
    field: "studentId" | "studentName",
    val: string
  ) => {
    if (!sheet) return;
    const updated = { ...sheet };
    updated.students[sIdx][field] = val;
    setSheet(updated);
  };

  const handleThresholdChange = async (newVal: number) => {
    if (!sheet) return;
    const updated = JSON.parse(JSON.stringify(sheet));
    updated.threshold = newVal;
    setSheet(updated);

    try {
      setCalculating(true);
      const computed = await calculateAssessmentSheet(updated);
      setSheet(computed);
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };


  const handleRemoveStudent = async (sIdx: number) => {
    if (!sheet) return;
    const updated = JSON.parse(JSON.stringify(sheet));
    updated.students.splice(sIdx, 1);
    setSheet(updated);

    try {
      setCalculating(true);
      const computed = await calculateAssessmentSheet(updated);
      setSheet(computed);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  // Clear all marks so faculty can enter fresh scores
  const handleClearAllMarks = async () => {
    if (!sheet) return;
    const updated = JSON.parse(JSON.stringify(sheet));
    updated.students.forEach((st: any) => {
      Object.keys(st.midScores || {}).forEach((k) => (st.midScores[k] = ""));
      Object.keys(st.finalScores || {}).forEach((k) => (st.finalScores[k] = ""));
    });
    setSheet(updated);

    try {
      setCalculating(true);
      const computed = await calculateAssessmentSheet(updated);
      setSheet(computed);
      setStatusMsg("All marks cleared! Grid is ready for fresh entry.");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  // Auto-fill realistic sample marks for quick testing/demo
  const handleAutoFillSample = async () => {
    if (!sheet) return;
    const updated = JSON.parse(JSON.stringify(sheet));
    updated.students.forEach((st: any, sIdx: number) => {
      updated.midtermQuestions.forEach((q: any, qIdx: number) => {
        const factor = 0.5 + ((sIdx + qIdx) % 5) * 0.1;
        const score = Math.round(q.maxMarks * factor * 10) / 10;
        st.midScores[q.id] = String(score);
      });
      updated.finalQuestions.forEach((q: any, qIdx: number) => {
        const factor = 0.5 + ((sIdx + qIdx + 1) % 5) * 0.1;
        const score = Math.round(q.maxMarks * factor * 10) / 10;
        st.finalScores[q.id] = String(score);
      });
    });
    setSheet(updated);

    try {
      setCalculating(true);
      const computed = await calculateAssessmentSheet(updated);
      setSheet(computed);
      setStatusMsg("Sample marks generated and calculated via Spring Boot backend!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  const handleExportExcel = async () => {
    if (!sheet) return;
    try {
      setStatusMsg("Generating Excel spreadsheet on backend...");
      const blob = await exportAssessmentExcel(sheet);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CO_PO_Attainment_${sheet.courseCode || "Assessment"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatusMsg("Spreadsheet downloaded successfully!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert("Failed to export: " + err.message);
    }
  };

  const handleExportPdf = async () => {
    if (!sheet) return;
    try {
      setStatusMsg("Generating official PDF report via iTextPDF on backend...");
      const blob = await exportAssessmentPdf(sheet);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CO_PO_Attainment_${sheet.courseCode || "Assessment"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatusMsg("PDF report downloaded successfully!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert("Failed to export PDF: " + err.message);
    }
  };

  const [savingMarks, setSavingMarks] = useState(false);

  const handleSaveMarks = async () => {
    if (!sheet) return;
    setSavingMarks(true);
    setStatusMsg(null);
    try {
      const saved = await saveAssessmentSheetMarks(sheet);
      setSheet(saved);
      setStatusMsg("Student marks saved into database successfully!");
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (e: any) {
      alert("Failed to save marks into database: " + e.message);
    } finally {
      setSavingMarks(false);
    }
  };

  const handleForceRecalculate = async () => {
    if (!sheet) return;
    setCalculating(true);
    try {
      const computed = await saveAssessmentSheetMarks(sheet);
      setSheet(computed);
      setStatusMsg("Marks calculated and synced with backend!");
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
        <p className="text-sm font-semibold">Generating Course Assessment Sheet from Backend...</p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-white">
        <p className="text-rose-400 text-sm">Unable to load assessment sheet.</p>
        <button
          onClick={loadDefaultTemplate}
          className="mt-3 px-4 py-2 bg-indigo-600 rounded-lg text-xs font-semibold cursor-pointer"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Find all distinct COs
  const distinctCos: string[] = Array.from(
    new Set([
      ...(sheet.midtermQuestions || []).map((q: any) => q.coCode),
      ...(sheet.finalQuestions || []).map((q: any) => q.coCode),
    ])
  ).sort() as string[];

  const poList = [
    "PO1", "PO2", "PO3", "PO4", "PO5", "PO6",
    "PO7", "PO8", "PO9", "PO10", "PO11", "PO12",
  ];

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      {/* Top Banner & Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-5 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-950 border border-amber-700 text-amber-300">
                Step 4: Course Assessment Template
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-800">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Generated from Course Questions & CO Mappings
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                100% Calculated in Spring Boot Backend
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {sheet.courseCode} - {sheet.courseTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter student marks below. Question thresholds, total aggregations, student CO percentages, and PO attainments are strictly evaluated by the backend.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Course Switcher */}
            {allCourses.length > 0 && onSelectCourse && (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Course:</span>
                <select
                  value={currentCourse?.id || ""}
                  onChange={(e) => onSelectCourse(e.target.value)}
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assessment / Exam Switcher [IA 1, IA 2, SEM final] */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-700 rounded-lg text-xs shadow-sm">
              <button
                type="button"
                onClick={() => handleAssessmentTypeChange("IA 1")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedAssessmentType === "IA 1"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>IA 1</span>
                {selectedAssessmentType === "IA 1" && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
              </button>
              <button
                type="button"
                onClick={() => handleAssessmentTypeChange("IA 2")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedAssessmentType === "IA 2"
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>IA 2</span>
                {selectedAssessmentType === "IA 2" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
              <button
                type="button"
                onClick={() => handleAssessmentTypeChange("SEM final")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedAssessmentType === "SEM final"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>end sem exam</span>
                {selectedAssessmentType === "SEM final" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
            </div>


            <button
              onClick={handleAutoFillSample}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 rounded-lg border border-indigo-800 transition cursor-pointer"
              title="Populate mock marks to test backend calculations"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sample Marks</span>
            </button>

            <button
              onClick={handleClearAllMarks}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-lg border border-rose-800/60 transition cursor-pointer"
              title="Clear all entered marks"
            >
              <Eraser className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear Marks</span>
            </button>

            <button
              onClick={handleSaveMarks}
              disabled={savingMarks}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
              title="Save all entered marks into MongoDB database"
            >
              <Save className={`w-3.5 h-3.5 ${savingMarks ? "animate-spin" : ""}`} />
              <span>{savingMarks ? "Saving to DB..." : "Save Marks to Database"}</span>
            </button>

            <button
              onClick={handleForceRecalculate}
              disabled={calculating}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 rounded-lg border border-cyan-800 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${calculating ? "animate-spin" : ""}`} />
              <span>{calculating ? "Calculating..." : "Recalculate"}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download PDF (.pdf)</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-4 p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-lg font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* ============================================================= */}
        {/* TEMPLATE HEADER (Dynamic Institution / Department Branding)    */}
        {/* ============================================================= */}
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm text-slate-900">
          {/* Main Institution Title Bar */}
          <div className="bg-[#fed7aa] text-center py-2.5 border-b border-slate-300 font-serif font-black text-slate-900 text-base tracking-wide">
            {sheet.institutionName || "Outcome-Based Education (OBE) Attainment Assessment"}
          </div>
          {/* Subtitle Bar */}
          <div className="bg-[#bae6fd] text-center py-1.5 border-b border-slate-300 font-serif font-bold text-slate-800 text-xs tracking-wider uppercase">
            {cleanExamTitle(sheet.assessmentTitle) || "CO-PO ATTAINMENT ASSESSMENT SHEET"}
          </div>

          {/* Top 3-Column Metadata Block */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50 border-b border-slate-300 text-xs">
            {/* Left: Metadata */}
            <div className="md:col-span-4 border border-slate-300 rounded bg-white overflow-hidden">
              <table className="w-full text-[11px] border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 w-32 border-r border-slate-200">
                      Semester & Year:
                    </td>
                    <td className="py-1 px-2.5 text-slate-900 font-medium">
                      {sheet.semesterAndYear}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      Course Code:
                    </td>
                    <td className="py-1 px-2.5 text-indigo-700 font-bold">
                      {sheet.courseCode}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      Course Title:
                    </td>
                    <td className="py-1 px-2.5 text-slate-900 font-medium">
                      {sheet.courseTitle}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      Level & Term:
                    </td>
                    <td className="py-1 px-2.5 text-slate-800">
                      {sheet.levelAndTerm || "5th Sem"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      Section:
                    </td>
                    <td className="py-1 px-2.5 text-slate-800">
                      {sheet.section || "A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      No. of Students:
                    </td>
                    <td className="py-1 px-2.5 text-slate-900 font-bold">
                      {sheet.students?.length || 0}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      Faculty Initial:
                    </td>
                    <td className="py-1 px-2.5 text-slate-800">
                      {sheet.mlInitial || "FAC"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2.5 font-bold bg-slate-100 text-slate-700 border-r border-slate-200">
                      Target Threshold:
                    </td>
                    <td className="py-1 px-2.5 font-bold text-emerald-700">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={10}
                          max={100}
                          value={sheet.threshold}
                          onChange={(e) => handleThresholdChange(parseFloat(e.target.value) || 50)}
                          className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold text-emerald-700"
                        />
                        <span>%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Middle: CO-Question Matrix (Calculated by Backend) */}
            <div className="md:col-span-4 border border-slate-300 rounded bg-white overflow-hidden flex flex-col">
              <div className="bg-[#fef08a] py-1 px-2 text-center font-bold text-slate-800 border-b border-slate-300 text-[11px]">
                CO-Question Matrix (Calculated by Backend)
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-center text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-1 px-1 border-r border-slate-200">CO</th>
                      <th className="py-1 px-1 border-r border-slate-200">{sheet.examType || "Assessment"} Marks</th>
                      {(sheet.finalQuestions || []).length > 0 && (
                        <th className="py-1 px-1 border-r border-slate-200">Final</th>
                      )}
                      <th className="py-1 px-1 border-r border-slate-200">Total</th>
                      <th className="py-1 px-1">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.coQuestionMatrix?.map((row: any) => (
                      <tr key={row.coCode} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-0.5 px-1 font-bold text-indigo-700 border-r border-slate-200">
                          {row.coCode}
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-200 text-slate-700 font-semibold">
                          {row.midMarks}
                        </td>
                        {(sheet.finalQuestions || []).length > 0 && (
                          <td className="py-0.5 px-1 border-r border-slate-200 text-slate-600">
                            {row.finalMarks}
                          </td>
                        )}
                        <td className="py-0.5 px-1 font-semibold text-slate-800 border-r border-slate-200">
                          {row.totalMarks}
                        </td>
                        <td className="py-0.5 px-1 font-bold text-slate-900">
                          {row.percent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: CO Met Criteria */}
            <div className="md:col-span-4 border border-slate-300 rounded bg-white overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-[#fed7aa] py-1 px-2 text-center font-bold text-slate-800 border-b border-slate-300 text-[11px]">
                  CO Met Criteria
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200">
                        If CO Marks (%) &ge; Threshold
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50">
                        Y
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200">
                        If CO Marks (%) &lt; Threshold
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold text-rose-700 bg-rose-50">
                        N
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-2 text-center text-[10px] text-slate-500 bg-slate-50 border-t border-slate-200">
                Benchmark Threshold = <span className="font-bold text-slate-800">{sheet.threshold}%</span>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* MAIN ASSESSMENT TABLE (Dynamic Question Columns & Evaluation)  */}
          {/* ============================================================= */}
          {(() => {
            const hasFinal = (sheet.finalQuestions || []).length > 0;
            const midTotalMax = (sheet.midtermQuestions || []).reduce((acc: number, q: any) => acc + (q.maxMarks || 0), 0);
            const finalTotalMax = (sheet.finalQuestions || []).reduce((acc: number, q: any) => acc + (q.maxMarks || 0), 0);
            const hasAnyAttempts = sheet.students?.some((s: any) => s.attempted);

            return (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-center border-t border-slate-300">
                  <thead>
                    {/* Level 1 Group Header */}
                    <tr className="font-bold text-slate-900 border-b border-slate-300">
                      <th colSpan={2} className="py-3 px-3 bg-slate-100 border-r border-slate-300 text-left text-xs sm:text-sm">
                        Student Details
                      </th>
                      <th
                        colSpan={(sheet.midtermQuestions?.length || 0) + 1}
                        className="py-3 px-3 bg-[#fef08a] border-r border-slate-300 uppercase tracking-wider text-xs sm:text-sm font-black text-slate-900"
                      >
                        {sheet.examTitle
                          ? `${cleanExamTitle(sheet.examTitle).toUpperCase()} (MAX ${midTotalMax})`
                          : (hasFinal ? `Midterm Examination (Max ${midTotalMax})` : `Assessment Questions (Max ${midTotalMax})`)}
                      </th>
                      {hasFinal && (
                        <th
                          colSpan={(sheet.finalQuestions?.length || 0) + 1}
                          className="py-3 px-3 bg-[#bfdbfe] border-r border-slate-300 uppercase tracking-wider text-xs sm:text-sm font-black text-slate-900"
                        >
                          Semester Final (Max ${finalTotalMax})
                        </th>
                      )}
                      <th
                        colSpan={distinctCos.length * 2}
                        className="py-3 px-3 bg-[#fed7aa] uppercase tracking-wider text-xs sm:text-sm font-bold text-slate-900"
                      >
                        CO Attainments ({sheet.threshold}% Benchmark)
                      </th>
                      <th className="py-3 px-2 bg-slate-100 border-l border-slate-300 text-xs">
                        Actions
                      </th>
                    </tr>

                    {/* Level 2 Sub-Headers */}
                    <tr className="border-b border-slate-300 text-xs bg-slate-50 font-semibold text-slate-800">
                      <th className="py-2.5 px-3 text-left border-r border-slate-300 w-36">
                        Student ID
                      </th>
                      <th className="py-2.5 px-3 text-left border-r border-slate-300 w-44">
                        Student Name
                      </th>

                      {/* Primary / Midterm Questions */}
                      {sheet.midtermQuestions?.map((q: any) => (
                        <th key={q.id} className="py-2 px-1 border-r border-slate-200 min-w-[56px]">
                          <div className="font-bold text-xs text-slate-900">{q.id}</div>
                          <div className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded px-1.5 py-0.5 my-0.5 inline-block">{q.coCode}</div>
                          <div className="text-[10px] text-slate-500 font-medium">Max: {q.maxMarks}</div>
                        </th>
                      ))}
                      <th className="py-2 px-2 border-r border-slate-300 bg-amber-50 font-bold text-slate-900 w-24">
                        {sheet.examType ? `${sheet.examType} Total` : (hasFinal ? "Mid Total" : "Total")}
                        <div className="text-[9px] text-slate-500 font-normal">(Backend)</div>
                      </th>

                      {/* Semester Final Questions (if any) */}
                      {hasFinal &&
                        sheet.finalQuestions?.map((q: any) => (
                          <th key={q.id} className="py-2 px-1 border-r border-slate-200 min-w-[56px]">
                            <div className="font-bold text-xs text-slate-900">{q.id}</div>
                            <div className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded px-1.5 py-0.5 my-0.5 inline-block">{q.coCode}</div>
                            <div className="text-[10px] text-slate-500 font-medium">Max: {q.maxMarks}</div>
                          </th>
                        ))}
                      {hasFinal && (
                        <th className="py-2 px-2 border-r border-slate-300 bg-blue-50 font-bold text-slate-900 w-20">
                          Final Total
                          <div className="text-[9px] text-slate-500 font-normal">(Backend)</div>
                        </th>
                      )}

                      {/* CO Attainments Columns */}
                      {distinctCos.map((co) => (
                        <React.Fragment key={co}>
                          <th className="py-2 px-1 border-r border-slate-200 bg-orange-50/70 font-bold text-slate-900 w-16">
                            <div>{co} (%)</div>
                            <div className="text-[9px] text-slate-500 font-normal">Backend</div>
                          </th>
                          <th className="py-2 px-1 border-r border-slate-300 bg-orange-50/70 font-bold text-slate-900 w-12">
                            <div>Met</div>
                            <div className="text-[9px] text-slate-500 font-normal">Y/N</div>
                          </th>
                        </React.Fragment>
                      ))}

                      <th className="py-2 px-1 border-l border-slate-300 w-12"></th>
                    </tr>
                  </thead>

                  {/* Student Rows */}
                  <tbody>
                    {(!sheet.students || sheet.students.length === 0) && (
                      <tr>
                        <td colSpan={50} className="py-12 text-center text-slate-500 bg-slate-50 font-medium">
                          No student data entered yet. Click &quot;Add Student&quot; above to enter marks.
                        </td>
                      </tr>
                    )}
                    {sheet.students?.map((st: any, sIdx: number) => (
                      <tr
                        key={st.studentId || sIdx}
                        className="border-b border-slate-200 hover:bg-slate-50 text-xs"
                      >
                        {/* Student ID */}
                        <td className="py-1 px-2 text-left font-mono font-medium text-slate-900 border-r border-slate-300 bg-white">
                          <input
                            type="text"
                            value={st.studentId}
                            onChange={(e) => handleStudentMetaChange(sIdx, "studentId", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-1 text-slate-900 font-semibold text-xs"
                          />
                        </td>

                        {/* Student Name */}
                        <td className="py-1 px-2 text-left font-medium text-slate-800 border-r border-slate-300 bg-white">
                          <input
                            type="text"
                            value={st.studentName}
                            onChange={(e) => handleStudentMetaChange(sIdx, "studentName", e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-1 text-slate-900 text-xs"
                          />
                        </td>

                        {/* Primary Mark Inputs */}
                        {sheet.midtermQuestions?.map((q: any) => {
                          const val = st.midScores?.[q.id] ?? "";
                          const isNotAttempted = val === "N" || val === "-";
                          return (
                            <td key={q.id} className="p-0 border-r border-slate-200 bg-white">
                              <input
                                type="text"
                                value={val}
                                placeholder="-"
                                onChange={(e) => handleScoreChange(sIdx, "mid", q.id, e.target.value)}
                                className={`w-full h-10 text-center text-sm font-bold focus:outline-none focus:bg-indigo-50/80 border-0 ${
                                  isNotAttempted
                                    ? "text-rose-600 bg-rose-50/50"
                                    : val !== ""
                                    ? "text-slate-900"
                                    : "text-slate-400"
                                }`}
                              />
                            </td>
                          );
                        })}

                        {/* Backend Calculated Mid Total */}
                        <td className="py-2 px-2 border-r border-slate-300 bg-amber-50/40 font-bold text-slate-900 text-center text-xs">
                          {st.attempted && st.midTotal !== null ? st.midTotal : "-"}
                        </td>

                        {/* Final Mark Inputs (if present) */}
                        {hasFinal &&
                          sheet.finalQuestions?.map((q: any) => {
                            const val = st.finalScores?.[q.id] ?? "";
                            const isNotAttempted = val === "N" || val === "-";
                            return (
                              <td key={q.id} className="p-0 border-r border-slate-200 bg-white">
                                <input
                                  type="text"
                                  value={val}
                                  placeholder="-"
                                  onChange={(e) => handleScoreChange(sIdx, "final", q.id, e.target.value)}
                                  className={`w-full h-10 text-center text-sm font-bold focus:outline-none focus:bg-blue-50/80 border-0 ${
                                    isNotAttempted
                                      ? "text-rose-600 bg-rose-50/50"
                                      : val !== ""
                                      ? "text-slate-900"
                                      : "text-slate-400"
                                  }`}
                                />
                              </td>
                            );
                          })}

                        {hasFinal && (
                          <td className="py-2 px-2 border-r border-slate-300 bg-blue-50/40 font-bold text-slate-900 text-center text-xs">
                            {st.attempted && st.finalTotal !== null ? st.finalTotal : "-"}
                          </td>
                        )}

                        {/* Backend Calculated CO Marks % and Y/N Criteria */}
                        {distinctCos.map((co) => {
                          const pct = st.coMarksPercent?.[co];
                          const met = st.coMetStatus?.[co];
                          const isMet = met === "Y";
                          const isUnattempted = !st.attempted || !met || met === "-";

                          return (
                            <React.Fragment key={co}>
                              <td className="py-2 px-1 border-r border-slate-200 font-semibold text-slate-800 text-center text-xs">
                                {!isUnattempted && pct !== null && pct !== undefined ? `${pct}%` : "-"}
                              </td>
                              <td
                                className={`py-2 px-1 border-r border-slate-300 font-bold text-center text-xs ${
                                  isUnattempted
                                    ? "text-slate-400"
                                    : isMet
                                    ? "text-emerald-700 bg-emerald-50/70"
                                    : "text-rose-700 bg-rose-50/70"
                                }`}
                              >
                                {isUnattempted ? "-" : met}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        {/* Delete Student Row */}
                        <td className="py-1 px-1 border-l border-slate-300 text-center">
                          <button
                            onClick={() => handleRemoveStudent(sIdx)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* ========================================================= */}
                    {/* QUESTION-LEVEL SUMMARY ROWS (Calculated strictly by Backend) */}
                    {/* ========================================================= */}
                    {/* Row 1: No. of Students Who Attempted */}
                    <tr className="border-t-2 border-slate-400 bg-slate-100/80 font-semibold text-xs text-slate-800">
                      <td colSpan={2} className="py-2 px-3 text-left border-r border-slate-300 font-bold text-slate-900">
                        No. of Students Who Attempted
                      </td>
                      {sheet.midtermQuestions?.map((q: any) => (
                        <td key={q.id} className="py-2 px-1 border-r border-slate-200 font-bold text-center">
                          {hasAnyAttempts ? (q.attemptedCount ?? 0) : 0}
                        </td>
                      ))}
                      <td className="border-r border-slate-300 bg-slate-200/50"></td>
                      {hasFinal &&
                        sheet.finalQuestions?.map((q: any) => (
                          <td key={q.id} className="py-2 px-1 border-r border-slate-200 font-bold text-center">
                            {hasAnyAttempts ? (q.attemptedCount ?? 0) : 0}
                          </td>
                        ))}
                      {hasFinal && <td className="border-r border-slate-300 bg-slate-200/50"></td>}
                      {/* CO summary: No. students achieved CO */}
                      {distinctCos.map((co) => (
                        <td key={co} colSpan={2} className="py-2 px-1 border-r border-slate-200 font-bold text-slate-800 text-center text-xs">
                          {hasAnyAttempts && sheet.coSummary?.[co] ? sheet.coSummary[co].achievedCount : "-"}
                        </td>
                      ))}
                      <td className="border-l border-slate-300"></td>
                    </tr>

                    {/* Row 2: Threshold Marks for each question */}
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-xs text-slate-800">
                      <td colSpan={2} className="py-2 px-3 text-left border-r border-slate-300 font-bold text-slate-900">
                        Threshold Marks for each question
                      </td>
                      {sheet.midtermQuestions?.map((q: any) => (
                        <td key={q.id} className="py-2 px-1 border-r border-slate-200 text-amber-700 font-bold text-center">
                          {q.thresholdMarks ?? "-"}
                        </td>
                      ))}
                      <td className="border-r border-slate-300 bg-slate-200/50"></td>
                      {hasFinal &&
                        sheet.finalQuestions?.map((q: any) => (
                          <td key={q.id} className="py-2 px-1 border-r border-slate-200 text-amber-700 font-bold text-center">
                            {q.thresholdMarks ?? "-"}
                          </td>
                        ))}
                      {hasFinal && <td className="border-r border-slate-300 bg-slate-200/50"></td>}
                      {/* CO summary: % students achieved CO */}
                      {distinctCos.map((co) => (
                        <td key={co} colSpan={2} className="py-2 px-1 border-r border-slate-200 font-bold text-indigo-700 text-center text-xs">
                          {hasAnyAttempts && sheet.coSummary?.[co] ? `${sheet.coSummary[co].achievedPercent}%` : "-"}
                        </td>
                      ))}
                      <td className="border-l border-slate-300"></td>
                    </tr>

                    {/* Row 3: No. of Students Who got >= Benchmark */}
                    <tr className="border-b border-slate-200 bg-slate-100/70 font-semibold text-xs text-slate-800">
                      <td colSpan={2} className="py-2 px-3 text-left border-r border-slate-300 font-bold text-slate-900">
                        No. of Students Who got &ge; {sheet.threshold}%
                      </td>
                      {sheet.midtermQuestions?.map((q: any) => (
                        <td key={q.id} className="py-2 px-1 border-r border-slate-200 font-bold text-slate-900 text-center">
                          {hasAnyAttempts ? (q.passedCount ?? 0) : 0}
                        </td>
                      ))}
                      <td className="border-r border-slate-300 bg-slate-200/50"></td>
                      {hasFinal &&
                        sheet.finalQuestions?.map((q: any) => (
                          <td key={q.id} className="py-2 px-1 border-r border-slate-200 font-bold text-slate-900 text-center">
                            {hasAnyAttempts ? (q.passedCount ?? 0) : 0}
                          </td>
                        ))}
                      {hasFinal && <td className="border-r border-slate-300 bg-slate-200/50"></td>}
                      {/* CO Results (Y / N) */}
                      {distinctCos.map((co) => {
                        const res = sheet.coSummary?.[co]?.result;
                        const isYes = res === "Y";
                        return (
                          <td
                            key={co}
                            colSpan={2}
                            className={`py-2 px-1 border-r border-slate-200 font-bold text-center text-xs ${
                              !hasAnyAttempts || !res
                                ? "text-slate-400"
                                : isYes
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {hasAnyAttempts && res ? res : "-"}
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-300"></td>
                    </tr>

                    {/* Row 4: Percentage of Students Who got >= Benchmark */}
                    <tr className="border-b-2 border-slate-400 bg-slate-50 font-semibold text-xs text-slate-800">
                      <td colSpan={2} className="py-2 px-3 text-left border-r border-slate-300 font-bold text-slate-900">
                        Percentage of Students Who got &ge; {sheet.threshold}%
                      </td>
                      {sheet.midtermQuestions?.map((q: any) => (
                        <td key={q.id} className="py-2 px-1 border-r border-slate-200 font-bold text-indigo-700 text-center">
                          {hasAnyAttempts && q.attemptedCount > 0 ? `${q.passPercentage}%` : "-"}
                        </td>
                      ))}
                      <td className="border-r border-slate-300 bg-slate-200/50"></td>
                      {hasFinal &&
                        sheet.finalQuestions?.map((q: any) => (
                          <td key={q.id} className="py-2 px-1 border-r border-slate-200 font-bold text-indigo-700 text-center">
                            {hasAnyAttempts && q.attemptedCount > 0 ? `${q.passPercentage}%` : "-"}
                          </td>
                        ))}
                      {hasFinal && <td className="border-r border-slate-300 bg-slate-200/50"></td>}
                      <td colSpan={distinctCos.length * 2} className="border-r border-slate-300 bg-slate-100/50"></td>
                      <td className="border-l border-slate-300"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* ============================================================= */}
          {/* PO ATTAINMENT CALCULATION MATRIX (Bottom Section)             */}
          {/* ============================================================= */}
          <div className="p-4 bg-slate-50 border-t border-slate-300">
            <div className="max-w-4xl mx-auto border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
              <div className="bg-[#bfdbfe] py-1.5 text-center font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-300">
                PO Attainment Calculation (Calculated by Backend)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                      <th className="py-1.5 px-2 border-r border-slate-200">CO&apos;s</th>
                      <th className="py-1.5 px-2 border-r border-slate-300">CO Results</th>
                      {poList.map((po) => (
                        <th key={po} className="py-1 px-1 border-r border-slate-200 w-11">
                          {po}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.poAttainments?.map((row: any) => {
                      const isAttained = row.coResult === "Y";
                      return (
                        <tr key={row.coCode} className="border-b border-slate-200 text-[11px]">
                          <td className="py-1 px-2 font-bold text-indigo-700 border-r border-slate-200 bg-slate-50">
                            {row.coCode}
                          </td>
                          <td
                            className={`py-1 px-2 font-bold border-r border-slate-300 ${
                              isAttained
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {row.coResult}
                          </td>
                          {poList.map((po) => (
                            <td key={po} className="py-1 px-1 border-r border-slate-200 text-slate-700">
                              {row.poWeights?.[po] || ""}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                    {/* PO Attainment Row (Exact NBA Formula: Σ(Weightage × CO Attainment Level) / Σ Weightages) */}
                    <tr className="bg-[#fef08a] font-bold text-slate-900 text-[11px] border-t-2 border-slate-400">
                      <td colSpan={2} className="py-2 px-3 text-left border-r border-slate-300 uppercase tracking-wide">
                        PO Attainment (Scale 1-3)
                      </td>
                      {poList.map((po) => {
                        let weightedCoAttSum = 0;
                        let totalWeight = 0;
                        sheet.poAttainments?.forEach((pr: any) => {
                          const w = pr.poWeights?.[po];
                          if (w && w > 0) {
                            totalWeight += w;
                            const coLvl = pr.coAttainmentLevel ?? (pr.coResult === "Y" ? 3.0 : 1.0);
                            weightedCoAttSum += (coLvl * w);
                          }
                        });
                        const poAttVal =
                          totalWeight > 0
                            ? (weightedCoAttSum / totalWeight).toFixed(2)
                            : null;

                        return (
                          <td key={po} className="py-2 px-1 border-r border-slate-300 bg-cyan-50 font-bold text-indigo-900">
                            {poAttVal !== null ? poAttVal : ""}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
