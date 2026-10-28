"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ExamAssessment,
  StudentMarksRecord,
  fetchMarksByExam,
  saveBatchMarks,
  uploadExcelMarks,
  getExcelTemplateUrl,
  calculateAttainment,
  cleanExamTitle,
} from "@/lib/api";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Download,
  Upload,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Table as TableIcon,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface Props {
  exam: ExamAssessment | null;
  onAttainmentCalculated?: () => void;
}

interface StudentRow {
  studentUsn: string;
  studentName: string;
  subScores: Record<string, number>;
  // Evaluated client-side or retrieved from server
  evaluatedTotal?: number;
  selectedQs?: string[];
  ignoredQs?: string[];
}

export default function MarksGridTab({ exam, onAttainmentCalculated }: Props) {
  const [data, setData] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Flattened sub-questions list
  const subQuestions = useMemo(() => {
    if (!exam?.questions) return [];
    const list: any[] = [];
    exam.questions.forEach((q) => {
      if (q.subQuestions && q.subQuestions.length > 0) {
        q.subQuestions.forEach((sq) => list.push(sq));
      } else {
        list.push({
          subQuestionId: q.questionId,
          parentQuestionId: q.questionId,
          label: q.label,
          maxMarks: q.totalMaxMarks || 10,
          coCode: "CO1",
        });
      }
    });
    return list;
  }, [exam]);

  // Load existing student marks from backend
  useEffect(() => {
    if (exam?.id) {
      loadMarks(exam.id);
    }
  }, [exam]);

  const loadMarks = async (examId: string) => {
    setLoading(true);
    try {
      const records = await fetchMarksByExam(examId);
      if (records && records.length > 0) {
        const rows: StudentRow[] = records.map((r) => ({
          studentUsn: r.studentUsn,
          studentName: r.studentName,
          subScores: r.subQuestionScores || {},
          evaluatedTotal: r.totalScore,
          selectedQs: r.selectedQuestionIds,
          ignoredQs: r.ignoredQuestionIds,
        }));
        setData(rows);
      } else {
        // Pre-populate 5 default student rows if none exist
        const initialRows: StudentRow[] = [
          { studentUsn: "1MS21CS001", studentName: "Aarav Sharma", subScores: {} },
          { studentUsn: "1MS21CS002", studentName: "Ananya Rao", subScores: {} },
          { studentUsn: "1MS21CS003", studentName: "Bhavya Patel", subScores: {} },
          { studentUsn: "1MS21CS004", studentName: "Chetan Kumar", subScores: {} },
          { studentUsn: "1MS21CS005", studentName: "Divya Nair", subScores: {} },
        ];
        setData(initialRows);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Quick Client-Side Rule Engine Simulation for Instant UI Feedback
  const computeClientRowPreview = (row: StudentRow) => {
    if (!exam) return { total: 0, selected: [], ignored: [] };

    // 1. Question aggregation
    const qScores: Record<string, number> = {};
    exam.questions.forEach((q) => {
      let sum = 0;
      if (q.subQuestions && q.subQuestions.length > 0) {
        q.subQuestions.forEach((sq) => {
          sum += row.subScores[sq.subQuestionId] || 0;
        });
      } else {
        sum = row.subScores[q.questionId] || 0;
      }
      qScores[q.questionId] = sum;
    });

    const ruleCase = exam.ruleEngineCase;
    const config = exam.ruleConfig || { topN: 3, mandatoryQuestionIds: [], orPairs: [] };

    let total = 0;
    const selected: string[] = [];
    const ignored: string[] = [];

    if (ruleCase === "CASE_1_TOP_N") {
      const n = Math.max(1, config.topN || 3);
      const entries = Object.entries(qScores).sort((a, b) => b[1] - a[1]);
      entries.forEach(([qId, score], idx) => {
        if (idx < n) {
          selected.push(qId);
          total += score;
        } else {
          ignored.push(qId);
        }
      });
    } else if (ruleCase === "CASE_2_MANDATORY_PLUS_TOP_N") {
      const mandIds = config.mandatoryQuestionIds || [];
      const n = config.topN ?? 2;
      const remaining: [string, number][] = [];

      Object.entries(qScores).forEach(([qId, score]) => {
        if (mandIds.includes(qId)) {
          selected.push(qId);
          total += score;
        } else {
          remaining.push([qId, score]);
        }
      });

      remaining.sort((a, b) => b[1] - a[1]);
      remaining.forEach(([qId, score], idx) => {
        if (idx < n) {
          selected.push(qId);
          total += score;
        } else {
          ignored.push(qId);
        }
      });
    } else if (ruleCase === "CASE_3_PAIRWISE_OR") {
      const pairs = config.orPairs || [];
      const processed = new Set<string>();

      pairs.forEach((pair) => {
        const sA = qScores[pair.questionA] || 0;
        const sB = qScores[pair.questionB] || 0;
        if (sA >= sB) {
          selected.push(pair.questionA);
          ignored.push(pair.questionB);
          total += sA;
        } else {
          selected.push(pair.questionB);
          ignored.push(pair.questionA);
          total += sB;
        }
        processed.add(pair.questionA);
        processed.add(pair.questionB);
      });

      Object.entries(qScores).forEach(([qId, score]) => {
        if (!processed.has(qId)) {
          selected.push(qId);
          total += score;
        }
      });
    }

    return { total, selected, ignored };
  };

  const handleScoreChange = (rowIdx: number, subQId: string, val: number) => {
    const updated = [...data];
    const row = { ...updated[rowIdx] };
    row.subScores = { ...row.subScores, [subQId]: val };
    const preview = computeClientRowPreview(row);
    row.evaluatedTotal = preview.total;
    row.selectedQs = preview.selected;
    row.ignoredQs = preview.ignored;
    updated[rowIdx] = row;
    setData(updated);
  };

  const handleUsnChange = (rowIdx: number, usn: string) => {
    const updated = [...data];
    updated[rowIdx] = { ...updated[rowIdx], studentUsn: usn };
    setData(updated);
  };

  const handleNameChange = (rowIdx: number, name: string) => {
    const updated = [...data];
    updated[rowIdx] = { ...updated[rowIdx], studentName: name };
    setData(updated);
  };

  const addRow = () => {
    const nextIdx = data.length + 1;
    const usnNum = String(nextIdx).padStart(3, "0");
    const newRow: StudentRow = {
      studentUsn: `1MS21CS${usnNum}`,
      studentName: `Student ${nextIdx}`,
      subScores: {},
    };
    setData([...data, newRow]);
  };

  const removeRow = (rowIdx: number) => {
    setData(data.filter((_, idx) => idx !== rowIdx));
  };

  const handleBatchSave = async () => {
    if (!exam?.id) return;
    setSaving(true);
    setStatusMsg(null);
    setIsError(false);
    try {
      const recordsToSave = data.map((d) => ({
        studentUsn: d.studentUsn,
        studentName: d.studentName,
        subQuestionScores: d.subScores,
      }));

      const saved = await saveBatchMarks(exam.id, recordsToSave);
      // Update rows with backend calculated output
      const refreshed: StudentRow[] = (saved as any[]).map((r: any) => ({
        studentUsn: r.studentUsn,
        studentName: r.studentName,
        subScores: r.subQuestionScores || {},
        evaluatedTotal: r.totalScore,
        selectedQs: r.selectedQuestionIds,
        ignoredQs: r.ignoredQuestionIds,
      }));
      setData(refreshed);
      setStatusMsg("Marks successfully evaluated by Rule Engine and NBA Attainment computed!");
      if (onAttainmentCalculated) onAttainmentCalculated();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setIsError(true);
      setStatusMsg("Error saving marks: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!exam?.id || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSaving(true);
    setStatusMsg(null);
    try {
      const records = await uploadExcelMarks(exam.id, file);
      const rows: StudentRow[] = records.map((r: StudentMarksRecord) => ({
        studentUsn: r.studentUsn,
        studentName: r.studentName,
        subScores: r.subQuestionScores || {},
        evaluatedTotal: r.totalScore,
        selectedQs: r.selectedQuestionIds,
        ignoredQs: r.ignoredQuestionIds,
      }));
      setData(rows);
      setStatusMsg(`Successfully imported ${records.length} student records from Excel!`);
      if (onAttainmentCalculated) onAttainmentCalculated();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setIsError(true);
      setStatusMsg("Failed to parse Excel: " + err.message);
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  // Define TanStack Table Columns
  const columns = useMemo<ColumnDef<StudentRow>[]>(() => {
    const cols: ColumnDef<StudentRow>[] = [
      {
        id: "slno",
        header: "#",
        cell: (info) => <span className="font-semibold text-slate-500">{info.row.index + 1}</span>,
        size: 40,
      },
      {
        accessorKey: "studentUsn",
        header: "USN",
        cell: (info) => (
          <input
            type="text"
            className="w-28 px-2 py-1 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
            value={info.row.original.studentUsn}
            onChange={(e) => handleUsnChange(info.row.index, e.target.value)}
          />
        ),
        size: 130,
      },
      {
        accessorKey: "studentName",
        header: "Student Name",
        cell: (info) => (
          <input
            type="text"
            className="w-36 px-2 py-1 text-xs text-slate-800 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
            value={info.row.original.studentName}
            onChange={(e) => handleNameChange(info.row.index, e.target.value)}
          />
        ),
        size: 160,
      },
    ];

    // Dynamic Columns for each Sub-Question with CO mapping tag
    subQuestions.forEach((sq) => {
      cols.push({
        id: sq.subQuestionId,
        header: () => (
          <div className="text-center py-1">
            <div className="font-bold text-slate-900 text-xs">{sq.subQuestionId}</div>
            <div className="text-[10px] text-indigo-700 font-semibold">{sq.coCode}</div>
            <div className="text-[10px] text-slate-400">Max: {sq.maxMarks}</div>
          </div>
        ),
        cell: (info) => {
          const val = info.row.original.subScores[sq.subQuestionId];
          const isSelected = info.row.original.selectedQs?.includes(sq.parentQuestionId);
          const isIgnored = info.row.original.ignoredQs?.includes(sq.parentQuestionId);

          return (
            <input
              type="number"
              step="0.5"
              min={0}
              max={sq.maxMarks}
              className={`w-14 px-1.5 py-1 text-xs text-center font-bold rounded border transition focus:outline-none ${
                isIgnored
                  ? "bg-slate-100 text-slate-400 border-slate-200 line-through"
                  : isSelected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-1 focus:ring-emerald-500"
                  : "bg-white text-slate-800 border-slate-300 focus:ring-1 focus:ring-indigo-500"
              }`}
              value={val !== undefined ? val : ""}
              onChange={(e) =>
                handleScoreChange(info.row.index, sq.subQuestionId, parseFloat(e.target.value) || 0)
              }
            />
          );
        },
        size: 70,
      });
    });

    // Evaluated Total Column
    cols.push({
      id: "evaluatedTotal",
      header: () => (
        <div className="text-center">
          <div className="font-bold text-indigo-700 text-xs">Evaluated Total</div>
          <div className="text-[10px] text-slate-500">After Rule Engine</div>
        </div>
      ),
      cell: (info) => {
        const preview = computeClientRowPreview(info.row.original);
        const total = info.row.original.evaluatedTotal ?? preview.total;
        return (
          <div className="text-center">
            <span className="inline-block px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
              {total.toFixed(1)}
            </span>
          </div>
        );
      },
      size: 110,
    });

    // Selected vs Ignored Badges
    cols.push({
      id: "statusBadge",
      header: "Rule Decision",
      cell: (info) => {
        const preview = computeClientRowPreview(info.row.original);
        const selected = info.row.original.selectedQs ?? preview.selected;
        const ignored = info.row.original.ignoredQs ?? preview.ignored;

        return (
          <div className="flex flex-col gap-1 text-[10px]">
            {selected && selected.length > 0 && (
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                Selected: {selected.join(", ")}
              </span>
            )}
            {ignored && ignored.length > 0 && (
              <span className="text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                Ignored: {ignored.join(", ")}
              </span>
            )}
          </div>
        );
      },
      size: 150,
    });

    // Delete row action
    cols.push({
      id: "actions",
      header: "",
      cell: (info) => (
        <button
          onClick={() => removeRow(info.row.index)}
          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
          title="Delete student"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
      size: 40,
    });

    return cols;
  }, [subQuestions, data, exam]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!exam) {
    return <div className="p-8 text-center text-slate-500">Please select an exam first.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-indigo-600" />
              4. Marks Ingestion & Live Rule Engine Grid
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Active Strategy: <span className="font-bold text-indigo-700">{
                exam.ruleEngineCase === "CASE_1_TOP_N" ? "Top N Best Selection" :
                exam.ruleEngineCase === "CASE_2_MANDATORY_PLUS_TOP_N" ? "Mandatory + Best Selection" :
                exam.ruleEngineCase === "CASE_3_PAIRWISE_OR" ? "Pairwise Choice Evaluation" : "Standard Selection"
              }</span> | Exam: {cleanExamTitle(exam.title)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download Template */}
            <a
              href={getExcelTemplateUrl(exam.id!)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition"
              download
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Download Template (.xlsx)
            </a>

            {/* Upload Excel */}
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Upload Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </label>

            {/* Save Batch Marks */}
            <button
              onClick={handleBatchSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Evaluating & Calculating..." : "Save Marks & Calculate CO-PO"}
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`mb-5 p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              isError
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {isError ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
            {statusMsg}
          </div>
        )}

        {/* TanStack Table Data Grid */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 select-none">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="py-2.5 px-3 font-bold border-r border-slate-200 text-center"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="py-2 px-2.5 border-r border-slate-100 text-center align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Student Row */}
        <div className="flex items-center justify-between pt-4 mt-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Add Student Row
          </button>
          <span className="text-xs text-slate-500">
            Total Students: <strong>{data.length}</strong> | Real-time Rule Engine active
          </span>
        </div>
      </div>
    </div>
  );
}
