"use client";

import React, { useState, useEffect } from "react";
import { Course, CoPoMapping, updateCoPoMatrix } from "@/lib/api";
import { Grid, Save, CheckCircle, HelpCircle, BookOpen } from "lucide-react";

interface Props {
  course: Course | null;
  allCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  onCourseUpdated: (course: Course) => void;
}

const PO_LIST = [
  { code: "PO1", label: "Engineering Knowledge" },
  { code: "PO2", label: "Problem Analysis" },
  { code: "PO3", label: "Design & Development" },
  { code: "PO4", label: "Conduct Investigations" },
  { code: "PO5", label: "Modern Tool Usage" },
  { code: "PO6", label: "The Engineer & Society" },
  { code: "PO7", label: "Environment & Sustainability" },
  { code: "PO8", label: "Ethics" },
  { code: "PO9", label: "Individual & Team Work" },
  { code: "PO10", label: "Communication" },
  { code: "PO11", label: "Project Mgmt & Finance" },
  { code: "PO12", label: "Life-long Learning" },
  { code: "PSO1", label: "Domain Specific Expertise" },
  { code: "PSO2", label: "Software & System Integration" },
];

export default function CoPoMatrixTab({
  course,
  allCourses = [],
  onSelectCourse,
  onCourseUpdated,
}: Props) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      const initialMap: Record<string, Record<string, number>> = {};
      course.courseOutcomes.forEach((co) => {
        initialMap[co.coCode] = {};
        PO_LIST.forEach((po) => {
          initialMap[co.coCode][po.code] = 0;
        });
      });

      if (course.coPoMappings) {
        course.coPoMappings.forEach((m) => {
          if (!initialMap[m.coCode]) initialMap[m.coCode] = {};
          initialMap[m.coCode][m.poCode] = m.level;
        });
      }

      setMatrix(initialMap);
    }
  }, [course]);

  const cycleLevel = (coCode: string, poCode: string) => {
    const current = matrix[coCode]?.[poCode] || 0;
    const next = (current + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0
    setMatrix({
      ...matrix,
      [coCode]: {
        ...matrix[coCode],
        [poCode]: next,
      },
    });
  };

  const handleSave = async () => {
    if (!course?.id) return;
    setSaving(true);
    setMessage(null);

    const mappingList: CoPoMapping[] = [];
    Object.entries(matrix).forEach(([coCode, poObj]) => {
      Object.entries(poObj).forEach(([poCode, level]) => {
        if (level > 0) {
          mappingList.push({ coCode, poCode, level });
        }
      });
    });

    try {
      const updated = await updateCoPoMatrix(course.id, mappingList);
      onCourseUpdated(updated);
      setMessage("CO-PO Correlation Matrix saved successfully!");
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage("Error saving matrix: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate Average correlation per PO
  const calculatePoAverage = (poCode: string) => {
    if (!course?.courseOutcomes || course.courseOutcomes.length === 0) return "-";
    let sum = 0;
    let count = 0;
    course.courseOutcomes.forEach((co) => {
      const lvl = matrix[co.coCode]?.[poCode] || 0;
      if (lvl > 0) {
        sum += lvl;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : "-";
  };

  if (!course) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Please select or create a course first.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-indigo-400" />
              2. CO-PO & PSO Correlation Matrix
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Click cells to set correlation level:{" "}
              <span className="font-semibold text-amber-300">1 (Low)</span>,{" "}
              <span className="font-semibold text-sky-300">2 (Medium)</span>,{" "}
              <span className="font-semibold text-emerald-300">3 (High)</span>, or leave empty (-) for no correlation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {allCourses.length > 0 && onSelectCourse && (
              <div className="flex items-center gap-2 bg-slate-950 border border-indigo-700/60 px-3 py-1.5 rounded-lg text-xs shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-400 font-semibold">Course:</span>
                <select
                  value={course.id || ""}
                  onChange={(e) => onSelectCourse(e.target.value)}
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer pr-1"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {message && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-800 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                {message}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Matrix..." : "Save Matrix"}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 mb-6">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> Legend:
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-slate-800 text-slate-400 border border-slate-700">
              -
            </span>
            <span className="text-slate-400">No Correlation (0)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              1
            </span>
            <span className="text-amber-300 font-medium">Slight / Low (1)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
              2
            </span>
            <span className="text-sky-300 font-medium">Moderate / Medium (2)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              3
            </span>
            <span className="text-emerald-300 font-medium">Substantial / High (3)</span>
          </span>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <th className="py-3 px-4 font-bold sticky left-0 bg-slate-950 z-10 w-28 border-r border-slate-800 text-slate-200">
                  Course Outcome
                </th>
                {PO_LIST.map((po) => (
                  <th
                    key={po.code}
                    className="py-3 px-2 text-center font-semibold border-r border-slate-800 min-w-[54px] text-slate-300"
                    title={po.label}
                  >
                    {po.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {course.courseOutcomes.map((co) => (
                <tr key={co.coCode} className="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-4 font-bold text-indigo-400 sticky left-0 bg-slate-900 border-r border-slate-800 z-10 shadow-xs">
                    {co.coCode}
                  </td>
                  {PO_LIST.map((po) => {
                    const level = matrix[co.coCode]?.[po.code] || 0;
                    return (
                      <td key={po.code} className="py-2 px-1 text-center border-r border-slate-850">
                        <button
                          type="button"
                          onClick={() => cycleLevel(co.coCode, po.code)}
                          className={`w-9 h-8 rounded text-xs font-bold transition-all active:scale-95 inline-flex items-center justify-center cursor-pointer ${
                            level === 3
                              ? "bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 shadow-xs"
                              : level === 2
                              ? "bg-sky-500/25 hover:bg-sky-500/35 text-sky-300 border border-sky-500/50 shadow-xs"
                              : level === 1
                              ? "bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-500/50 shadow-xs"
                              : "bg-slate-800/60 hover:bg-slate-700/80 text-slate-500 border border-slate-700/50"
                          }`}
                        >
                          {level > 0 ? level : "-"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Average Row */}
              <tr className="bg-indigo-950/60 font-semibold text-slate-200 border-t-2 border-indigo-600">
                <td className="py-3 px-4 sticky left-0 bg-indigo-950 text-indigo-300 font-bold border-r border-indigo-900 z-10">
                  PO Average
                </td>
                {PO_LIST.map((po) => (
                  <td
                    key={po.code}
                    className="py-3 px-2 text-center font-bold text-indigo-200 border-r border-indigo-900/60"
                  >
                    {calculatePoAverage(po.code)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
