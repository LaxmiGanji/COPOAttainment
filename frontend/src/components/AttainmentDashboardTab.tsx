"use client";

import React, { useState, useEffect } from "react";
import {
  ExamAssessment,
  AttainmentReport,
  fetchAttainmentByExam,
  calculateAttainment,
} from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Award,
  RefreshCw,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  FileCheck2,
  Percent,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface Props {
  exam: ExamAssessment | null;
}

export default function AttainmentDashboardTab({ exam }: Props) {
  const [report, setReport] = useState<AttainmentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedPoBreakdown, setSelectedPoBreakdown] = useState<string>("PO1");

  useEffect(() => {
    if (exam?.id) {
      loadReport(exam.id);
    }
  }, [exam]);

  const loadReport = async (examId: string) => {
    setLoading(true);
    try {
      const data = await fetchAttainmentByExam(examId);
      if (data && data.coAttainments) {
        setReport(data);
        if (data.poAttainments && data.poAttainments.length > 0) {
          const firstMapped = data.poAttainments.find((p) => p.totalMappingSum > 0);
          if (firstMapped) setSelectedPoBreakdown(firstMapped.poCode);
        }
      }
    } catch (err) {
      console.log("No existing report found, click Recalculate to generate.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!exam?.id) return;
    setCalculating(true);
    try {
      const res = await calculateAttainment(exam.id);
      setReport(res);
      if (res?.poAttainments && res.poAttainments.length > 0) {
        const firstMapped = res.poAttainments.find((p) => p.totalMappingSum > 0);
        if (firstMapped) setSelectedPoBreakdown(firstMapped.poCode);
      }
    } catch (err: any) {
      alert("Failed to compute attainment: " + err.message);
    } finally {
      setCalculating(false);
    }
  };

  if (!exam) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-75" />
        <p className="text-sm font-semibold">Please select an assessment exam from the top dropdown first.</p>
      </div>
    );
  }

  // Chart data for CO Attainment
  const coChartData =
    report?.coAttainments?.map((co) => ({
      name: co.coCode,
      achieved: co.studentsMetPercent,
      target: co.targetPercent,
      avgMarks: co.averageMarksPercent,
      level: co.directAttainmentLevel,
    })) || [];

  // Chart data for PO Attainment
  const poChartData =
    report?.poAttainments
      ?.filter((po) => po.totalMappingSum > 0)
      ?.map((po) => ({
        name: po.poCode,
        attainment: po.poAttainmentPercent,
        target: po.targetThreshold,
        attainedSum: po.attainedMappingSum,
        totalSum: po.totalMappingSum,
      })) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Recalculate */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2.5">
              <span className="p-2 bg-indigo-950/80 border border-indigo-700/50 rounded-xl text-indigo-400">
                <Award className="w-5 h-5" />
              </span>
              Step 5. NBA Outcome Attainment Dashboard (CO & PO Attainment)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Assessment: <strong className="text-indigo-300">{exam.title}</strong> | Evaluated Students:{" "}
              <strong className="text-emerald-400 font-bold">{report?.totalStudentsEvaluated || 0}</strong>
            </p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={calculating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${calculating ? "animate-spin" : ""}`} />
            {calculating ? "Recalculating..." : "Recalculate Attainment"}
          </button>
        </div>

        {/* Top Metric Cards */}
        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-950/60 border border-indigo-900/40 rounded-xl p-4 shadow-inner">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                Total Evaluated
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {report.totalStudentsEvaluated}{" "}
                <span className="text-xs font-normal text-indigo-400">Students</span>
              </div>
              <span className="text-[10px] text-slate-400">Backend Attainment Service</span>
            </div>

            <div className="bg-slate-950/60 border border-emerald-900/40 rounded-xl p-4 shadow-inner">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                CO Target Threshold
              </span>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {report.courseTargetThreshold}%
              </div>
              <span className="text-[10px] text-slate-400">Course Target Benchmark</span>
            </div>

            <div className="bg-slate-950/60 border border-amber-900/40 rounded-xl p-4 shadow-inner">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Question Threshold
              </span>
              <div className="text-2xl font-black text-amber-300 mt-1">
                {report.questionThresholdPercent}%
              </div>
              <span className="text-[10px] text-slate-400">T_Q = M_Q × {report.questionThresholdPercent}%</span>
            </div>

            <div className="bg-slate-950/60 border border-purple-900/40 rounded-xl p-4 shadow-inner">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                Attained COs
              </span>
              <div className="text-2xl font-black text-purple-300 mt-1">
                {report.coAttainments?.filter((c) => c.finalResult === "Y").length || 0} /{" "}
                {report.coAttainments?.length || 0}
              </div>
              <span className="text-[10px] text-slate-400">Final Result = &apos;Y&apos;</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* METHOD A: STUDENT-CENTRIC CO TARGET ATTAINMENT */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4 mb-10">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
              Method A: Student-Centric CO Target Attainment
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates percentage of students reaching CO threshold:{" "}
              <code className="text-indigo-300 font-mono text-[11px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                % Achieved = (Students with CO Met = &apos;Y&apos; / Total Students) * 100%
              </code>
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-200 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Course Outcome</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-3 text-center font-semibold">Target (T_course)</th>
                  <th className="py-3 px-3 text-center font-semibold">Students Met</th>
                  <th className="py-3 px-3 text-center font-semibold">% Students Achieved</th>
                  <th className="py-3 px-3 text-center font-semibold">Final Result</th>
                  <th className="py-3 px-3 text-center font-semibold">Direct Attainment Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-slate-300">
                {report?.coAttainments && report.coAttainments.length > 0 ? (
                  report.coAttainments.map((co) => (
                    <tr key={co.coCode} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 font-extrabold text-indigo-400 font-mono text-sm">
                        {co.coCode}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs">{co.description || "-"}</td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-300">
                        {co.targetPercent}%
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white">
                        {co.studentsMetCount} / {co.totalStudents}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-white">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{co.studentsMetPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full ${
                            co.finalResult === "Y"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {co.finalResult === "Y" ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Attained (Y)
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" /> Not Met (N)
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-black">
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-extrabold ${
                            co.directAttainmentLevel === 3
                              ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                              : co.directAttainmentLevel === 2
                              ? "bg-blue-500 text-white font-black"
                              : co.directAttainmentLevel === 1
                              ? "bg-amber-500 text-slate-950 font-black"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          Level {co.directAttainmentLevel}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No CO attainments calculated yet. Please enter marks in Step 4 and click &quot;Recalculate Attainment&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Visual CO Bar Chart */}
          {coChartData.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Course Outcome Attainment (%) vs Benchmark Target
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`]}
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#94a3b8" }} />
                    <ReferenceLine
                      y={report?.courseTargetThreshold || 50}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target Threshold (${report?.courseTargetThreshold || 50}%)`,
                        fill: "#ef4444",
                        fontSize: 10,
                        position: "top",
                      }}
                    />
                    <Bar dataKey="achieved" name="% Students Met Target" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgMarks" name="Average Marks %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* METHOD B: QUESTION-LEVEL THRESHOLD AGGREGATE */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4 mb-10">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              Method B: Question-Level Threshold Aggregate Grid
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Checks how many students cleared threshold mark T_Q = M_Q × T_(percent):{" "}
              <code className="text-indigo-300 font-mono text-[11px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                % Pass(Q_j) = (Count with Score &ge; T_Q / Attempted) * 100%
              </code>
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-200 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">Sub-Question</th>
                  <th className="py-3 px-3 font-semibold">Label</th>
                  <th className="py-3 px-3 text-center font-semibold">Mapped CO</th>
                  <th className="py-3 px-3 text-center font-semibold">Max Marks (M_Q)</th>
                  <th className="py-3 px-3 text-center font-semibold">Threshold Mark (T_Q)</th>
                  <th className="py-3 px-3 text-center font-semibold">Attempted</th>
                  <th className="py-3 px-3 text-center font-semibold">Passed (Score &ge; T_Q)</th>
                  <th className="py-3 px-3 text-center font-semibold">% Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-slate-300">
                {report?.questionAttainments && report.questionAttainments.length > 0 ? (
                  report.questionAttainments.map((q) => (
                    <tr key={q.questionOrSubQuestionId} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-white">{q.questionOrSubQuestionId}</td>
                      <td className="py-3 px-3 font-medium text-slate-300">{q.label}</td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-400 bg-indigo-950/30">
                        {q.coCode}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-300">{q.maxMarks}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-300 bg-amber-950/30">
                        {q.thresholdMarks.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-300">{q.totalAttemptedStudents}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-400">{q.passedStudentsCount}</td>
                      <td className="py-3 px-3 text-center font-extrabold text-white">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            q.passPercentage >= (report?.courseTargetThreshold || 50)
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {q.passPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No question-level attainments evaluated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PROGRAM OUTCOME (PO) ATTAINMENT */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Program Outcome (PO) Attainment Calculation
            </h3>
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 mt-2 space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Exact Course Articulation &amp; PO Attainment Formula:
              </span>
              <div className="font-mono text-indigo-300 text-[11px] bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                <div>1. Sum of Weightages = &Sigma; Wt (from Course Articulation Matrix)</div>
                <div>2. Individual CO Contribution = (Weightage &times; CO Attainment Level) / &Sigma; Wt</div>
                <div>3. Total PO Attainment = &Sigma; [ (CO_AT &times; Wt) / &Sigma; Wt ] = &Sigma;(CO_AT &times; Wt) / &Sigma; Wt</div>
              </div>
              <span className="text-[11px] text-slate-400 block">
                Calculated on a standard <strong>1.00 &ndash; 3.00 attainment scale</strong> from mapped CO attainment levels and articulation matrix weightages (1, 2, 3).
              </span>
            </div>
          </div>

          {/* Table 3: Attainment of Program Outcomes (POs) and PSOs */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-200 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">PO / PSO Code</th>
                  <th className="py-3 px-3 text-center font-semibold">Sum of (Wt &times; CO AT)</th>
                  <th className="py-3 px-3 text-center font-semibold">Sum of Weightages (&Sigma; Wt)</th>
                  <th className="py-3 px-3 text-center font-bold text-indigo-300">PO Attainment Level</th>
                  <th className="py-3 px-3 text-center font-semibold">Target Benchmark</th>
                  <th className="py-3 px-3 text-center font-semibold">Status</th>
                  <th className="py-3 px-3 text-center font-semibold">Formula Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-slate-300">
                {report?.poAttainments &&
                report.poAttainments.filter((po) => po.totalMappingSum > 0).length > 0 ? (
                  report.poAttainments
                    .filter((po) => po.totalMappingSum > 0)
                    .map((po) => {
                      const isSelected = (selectedPoBreakdown || "PO1") === po.poCode;
                      return (
                        <tr
                          key={po.poCode}
                          className={`hover:bg-slate-800/50 transition cursor-pointer ${
                            isSelected ? "bg-indigo-950/40" : ""
                          }`}
                          onClick={() => setSelectedPoBreakdown(po.poCode)}
                        >
                          <td className="py-3 px-4 font-bold text-indigo-300 font-mono text-sm">{po.poCode}</td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-400">
                            {po.attainedMappingSum.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-300">
                            {po.totalMappingSum.toFixed(0)}
                          </td>
                          <td className="py-3 px-3 text-center font-extrabold text-white text-sm bg-indigo-950/30">
                            {po.poAttainmentPercent.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-400">
                            {po.targetThreshold.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full ${
                                po.finalStatus === "Y"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : "bg-rose-950 text-rose-300 border border-rose-800"
                              }`}
                            >
                              {po.finalStatus === "Y" ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Attained (Y)
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Not Attained (N)
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPoBreakdown(po.poCode);
                              }}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-500"
                                  : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
                              }`}
                            >
                              View Matrix Breakdown
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No PO correlation mappings found or calculated. Configure Step 2 (CO-PO Matrix) and recalculate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table 2: Detailed PO Breakdown (CO AT x Wt / sum of weights) */}
          {(() => {
            const activePo =
              report?.poAttainments?.find((p) => p.poCode === selectedPoBreakdown) ||
              report?.poAttainments?.find((p) => p.totalMappingSum > 0);

            if (!activePo || activePo.totalMappingSum === 0) return null;

            return (
              <div className="bg-slate-950 border border-indigo-900/50 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-xs font-black">
                        {activePo.poCode}
                      </span>
                      Detailed Articulation Matrix Breakdown (CO AT &times; Wt / &Sigma; Wt)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Individual CO contributions to <strong>{activePo.poCode}</strong> attainment
                    </p>
                  </div>

                  {/* PO Selector Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {report?.poAttainments
                      ?.filter((p) => p.totalMappingSum > 0)
                      .map((p) => (
                        <button
                          key={p.poCode}
                          type="button"
                          onClick={() => setSelectedPoBreakdown(p.poCode)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                            activePo.poCode === p.poCode
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {p.poCode}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Table matching User Reference */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-200 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 border-r border-slate-800 text-left w-36">CO</th>
                        <th className="py-2.5 px-3 border-r border-slate-800">CO AT (Attainment Level)</th>
                        <th className="py-2.5 px-3 border-r border-slate-800">Wt (Articulation Matrix)</th>
                        <th className="py-2.5 px-3 bg-indigo-950/40 text-indigo-300 font-extrabold">
                          PO AT (CO Contribution)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/80">
                      {activePo.contributions && activePo.contributions.length > 0 ? (
                        activePo.contributions.map((c: any) => (
                          <tr key={c.coCode} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3 text-left font-bold text-indigo-400 border-r border-slate-800 font-mono">
                              {c.coCode}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-800 font-semibold text-slate-200">
                              {c.coAttainmentLevel.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-800 font-bold text-amber-400">
                              {c.weight}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-400 bg-emerald-950/20">
                              {c.poContribution.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No contributions recorded for this PO.
                          </td>
                        </tr>
                      )}
                      {/* Total PO AT Row */}
                      <tr className="bg-slate-900/90 font-bold border-t-2 border-indigo-700/60 text-xs">
                        <td colSpan={3} className="py-2.5 px-3 text-left text-white uppercase tracking-wider">
                          Total PO AT (Scale 1-3)
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-indigo-300 text-sm bg-indigo-950/60">
                          {activePo.poAttainmentPercent.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Calculation Audit Notes matching user prompt */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5 font-mono">
                  <div className="text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    Step-by-step Audit for {activePo.poCode}:
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    &bull; Sum of weightages for {activePo.poCode} = <strong>{activePo.totalMappingSum.toFixed(0)}</strong>
                  </div>
                  {activePo.contributions && activePo.contributions.length > 0 && (
                    <div className="text-indigo-300 text-[11px]">
                      &bull; Example for {activePo.contributions[0].coCode} =&gt; {activePo.contributions[0].coAttainmentLevel.toFixed(2)} &times; {activePo.contributions[0].weight} = {(activePo.contributions[0].coAttainmentLevel * activePo.contributions[0].weight).toFixed(2)} =&gt; {(activePo.contributions[0].coAttainmentLevel * activePo.contributions[0].weight).toFixed(2)} / {activePo.totalMappingSum.toFixed(0)} = <strong>{activePo.contributions[0].poContribution.toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="text-emerald-400 font-semibold text-[11px]">
                    &bull; Total {activePo.poCode} Attainment = Sum of all CO contributions = <strong>{activePo.poAttainmentPercent.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Visual PO Bar Chart */}
          {poChartData.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Program Outcome (PO) Attainment Level (Scale 1.00 &ndash; 3.00)
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis domain={[0, 3.5]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toFixed(2)} / 3.00`]}
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#94a3b8" }} />
                    <ReferenceLine
                      y={report?.courseTargetThreshold && report.courseTargetThreshold > 3.0 ? (report.courseTargetThreshold / 100.0) * 3.0 : 1.5}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target Benchmark`,
                        fill: "#ef4444",
                        fontSize: 10,
                        position: "top",
                      }}
                    />
                    <Bar dataKey="attainment" name="PO Attainment Level" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
