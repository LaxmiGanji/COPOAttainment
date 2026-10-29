"use client";

import React, { useState, useEffect } from "react";
import { fetchStudentPerformance, fetchDistinctStudents, cleanExamTitle } from "@/lib/api";
import {
  User,
  Search,
  Award,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

export default function StudentPortalView({ initialStudentUsn }: { initialStudentUsn?: string }) {
  const [usn, setUsn] = useState(initialStudentUsn || "");
  const [studentDirectory, setStudentDirectory] = useState<{ usn: string; name: string }[]>([]);
  const [studentData, setStudentData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadDirectory();
    if (initialStudentUsn) {
      searchPerformance(initialStudentUsn);
    }
  }, [initialStudentUsn]);

  const loadDirectory = async () => {
    try {
      const list = await fetchDistinctStudents();
      setStudentDirectory(list);
    } catch (e) {
      console.error(e);
    }
  };

  const searchPerformance = async (queryUsn: string) => {
    if (!queryUsn.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await fetchStudentPerformance(queryUsn.trim());
      setStudentData(data);
    } catch (err) {
      console.error(err);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (selectedUsn: string) => {
    setUsn(selectedUsn);
    searchPerformance(selectedUsn);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Student Search & Quick Select */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Student Academic Performance & OBE Attainment Portal
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              View your individual question scores, Rule Engine selection rationale, and Course Outcome attainment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter USN (e.g. 1MS21CS001)"
                className="pl-3.5 pr-8 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg w-56 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPerformance(usn)}
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
            <button
              onClick={() => searchPerformance(usn)}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Quick select directory pill buttons */}
        {studentDirectory.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
            <span className="text-slate-500 font-medium whitespace-nowrap">Quick Select:</span>
            {studentDirectory.map((st) => (
              <button
                key={st.usn}
                onClick={() => handleSelectStudent(st.usn)}
                className={`px-2.5 py-1 rounded-full font-mono text-xs font-semibold transition ${
                  usn === st.usn
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {st.usn} ({st.name.split(" ")[0]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results View */}
      {studentData && studentData.records && studentData.records.length > 0 ? (
        <div className="space-y-6">
          {/* Student Profile Card */}
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Student Profile
              </span>
              <h3 className="text-2xl font-black mt-0.5">{studentData.studentName}</h3>
              <p className="text-sm font-mono text-indigo-200 font-semibold mt-0.5">
                USN: {studentData.usn}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 text-xs">
              <span className="text-indigo-200 block">Evaluated Assessments:</span>
              <span className="text-lg font-bold text-white">
                {studentData.records.length} Exam Records
              </span>
            </div>
          </div>

          {/* Exam Performance Cards */}
          {studentData.records.map((item: any, idx: number) => {
            const rec = item.record;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.courseCode} - {item.courseName}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-1">
                      {cleanExamTitle(item.examTitle)} ({item.examType})
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Evaluated Total Score:</span>
                    <span className="text-2xl font-black text-indigo-700">
                      {rec.totalScore?.toFixed(1)} <span className="text-sm text-slate-400">/ {item.maxMarks}</span>
                    </span>
                  </div>
                </div>

                {/* Rule Engine Audit Trail Box */}
                <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      Rule Engine Evaluation Decision: {
                        item.ruleCase === "CASE_1_TOP_N" ? "Top N Best Selection" :
                        item.ruleCase === "CASE_2_MANDATORY_PLUS_TOP_N" ? "Mandatory + Best Selection" :
                        item.ruleCase === "CASE_3_PAIRWISE_OR" ? "Pairwise Choice Evaluation" :
                        cleanExamTitle(item.ruleCase || "Standard Selection")
                      }
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700 font-semibold">
                        Selected: {rec.selectedQuestionIds?.join(", ")}
                      </span>
                      {rec.ignoredQuestionIds && rec.ignoredQuestionIds.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-300 border border-rose-700 font-semibold">
                          Ignored: {rec.ignoredQuestionIds?.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Audit steps */}
                  <div className="space-y-1 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300">
                    {rec.evaluationSteps?.map((step: string, sIdx: number) => (
                      <div key={sIdx} className="flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-Question Scores Breakdown */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Sub-Question Marks Breakdown
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {Object.entries(rec.subQuestionScores || {}).map(([subQId, score]: [string, any]) => {
                      // Find parent question ID (e.g. Q1 from Q1a)
                      const parentId = subQId.substring(0, 2);
                      const isIgnored = rec.ignoredQuestionIds?.includes(parentId);
                      const isSelected = rec.selectedQuestionIds?.includes(parentId);

                      return (
                        <div
                          key={subQId}
                          className={`p-3 rounded-lg border text-center transition ${
                            isIgnored
                              ? "bg-slate-100 border-slate-200 text-slate-400 opacity-70"
                              : isSelected
                              ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="text-xs font-bold font-mono">{subQId}</div>
                          <div className="text-lg font-black mt-0.5">
                            {score}
                          </div>
                          <div className="text-[10px] font-semibold mt-1">
                            {isIgnored ? (
                              <span className="text-rose-600 line-through">Ignored</span>
                            ) : (
                              <span className="text-emerald-700">Counted</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual CO Attainment Status */}
                {rec.coPerformances && Object.keys(rec.coPerformances).length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      Personal Course Outcome (CO) Attainment Status
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.values(rec.coPerformances).map((perf: any) => (
                        <div
                          key={perf.coCode}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-indigo-700">
                              {perf.coCode}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                perf.met
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {perf.met ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Met (Y)
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-rose-600" /> Not Met (N)
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-xs text-slate-600">
                            <span>Score: {perf.scoredMarks} / {perf.maxPossibleMarks}</span>
                            <span className="font-bold text-slate-900">{perf.percentage}%</span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                perf.met ? "bg-emerald-500" : "bg-rose-400"
                              }`}
                              style={{ width: `${Math.min(100, perf.percentage)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Target Threshold: {item.targetThresholdPercent || 50}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : searched ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-800">No Assessment Records Found</h4>
          <p className="text-xs text-slate-500 mt-1">
            No marks have been entered for USN: <strong className="text-slate-700">{usn}</strong>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
