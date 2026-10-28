"use client";

import React, { useState, useEffect } from "react";
import { Course, CourseOutcome, updateCourse, createCourse } from "@/lib/api";
import { BookOpen, CheckCircle, Plus, Trash2, Sliders, Target, ShieldCheck } from "lucide-react";

interface Props {
  course: Course | null;
  allCourses?: Course[];
  onSelectCourse?: (courseId: string) => void;
  onCourseUpdated: (course: Course) => void;
}

export default function CourseSetupTab({
  course,
  allCourses = [],
  onSelectCourse,
  onCourseUpdated,
}: Props) {
  const [formData, setFormData] = useState<Course>({
    courseCode: "",
    courseName: "",
    department: "Computer Science & Engineering",
    academicYear: "2024-2025",
    semester: 5,
    courseType: "THEORETICAL",
    maxInternalMarks: 50,
    maxExternalMarks: 50,
    internalWeightage: 50,
    externalWeightage: 50,
    targetThresholdPercent: 50,
    questionThresholdPercent: 50,
    courseOutcomes: [],
    coPoMappings: [],
  });

  const [isManualCode, setIsManualCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setFormData(course);
      setIsManualCode(false);
    }
  }, [course]);

  const handleCoChange = (index: number, field: keyof CourseOutcome, value: any) => {
    const updated = [...formData.courseOutcomes];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, courseOutcomes: updated });
  };

  const addCo = () => {
    const nextNumber = formData.courseOutcomes.length + 1;
    const newCo: CourseOutcome = {
      coCode: `CO${nextNumber}`,
      description: "",
      targetPercent: formData.targetThresholdPercent || 50,
    };
    setFormData({ ...formData, courseOutcomes: [...formData.courseOutcomes, newCo] });
  };

  const removeCo = (index: number) => {
    const updated = formData.courseOutcomes.filter((_, i) => i !== index);
    setFormData({ ...formData, courseOutcomes: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      let saved: Course;
      if (formData.id) {
        saved = await updateCourse(formData.id, formData);
      } else {
        saved = await createCourse(formData);
      }
      onCourseUpdated(saved);
      setIsManualCode(false);
      setMessage("Course pattern, weightages & COs saved successfully!");
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage("Error saving course: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStartNewCourse = () => {
    setIsManualCode(true);
    setFormData({
      courseCode: "",
      courseName: "",
      department: "Computer Science & Engineering",
      academicYear: "2024-2025",
      semester: 5,
      courseType: "THEORETICAL",
      maxInternalMarks: 50,
      maxExternalMarks: 50,
      internalWeightage: 50,
      externalWeightage: 50,
      targetThresholdPercent: 50,
      questionThresholdPercent: 50,
      courseOutcomes: [
        { coCode: "CO1", description: "", targetPercent: 50 },
        { coCode: "CO2", description: "", targetPercent: 50 },
        { coCode: "CO3", description: "", targetPercent: 50 },
        { coCode: "CO4", description: "", targetPercent: 50 },
        { coCode: "CO5", description: "", targetPercent: 50 },
      ],
      coPoMappings: [],
    });
    setMessage("Ready to add a new course! Fill in details and click Save.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              1. Course Setup, Pattern & Weightages
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure course pattern (Theoretical / Lab), evaluation weightages, and NBA target thresholds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Database Course Dropdown Selector */}
            {allCourses.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950 border border-indigo-700/60 px-3 py-1.5 rounded-lg text-xs shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-400 font-semibold">Course:</span>
                <select
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer pr-1"
                  value={formData.id || course?.id || ""}
                  onChange={(e) => {
                    if (e.target.value === "NEW") {
                      handleStartNewCourse();
                    } else {
                      setIsManualCode(false);
                      onSelectCourse?.(e.target.value);
                    }
                  }}
                  title="Select Course from Database"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                  <option value="NEW" className="bg-slate-900 text-indigo-400 font-bold">
                    + Add New Course
                  </option>
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartNewCourse}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Course</span>
            </button>
            {message && (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-800 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                {message}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Course Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Course Code
                </label>
                {allCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isManualCode) {
                        handleStartNewCourse();
                      } else {
                        setIsManualCode(false);
                        if (course) setFormData(course);
                      }
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    {isManualCode ? "Select from DB" : "+ New Code"}
                  </button>
                )}
              </div>
              {!isManualCode && allCourses.length > 0 ? (
                <select
                  className="w-full px-3.5 py-2 rounded-lg border border-indigo-500 bg-slate-950 text-white font-medium focus:border-indigo-400 focus:outline-none cursor-pointer"
                  value={formData.id || course?.id || ""}
                  onChange={(e) => {
                    if (e.target.value === "NEW") {
                      handleStartNewCourse();
                    } else {
                      const selected = allCourses.find((c) => c.id === e.target.value);
                      if (selected) {
                        setFormData(selected);
                        onCourseUpdated(selected);
                        onSelectCourse?.(selected.id!);
                      }
                    }
                  }}
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                  <option value="NEW" className="bg-slate-900 text-emerald-400 font-bold">
                    + Add New Course...
                  </option>
                </select>
              ) : (
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white font-medium focus:border-indigo-500 focus:outline-none"
                  value={formData.courseCode}
                  onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                  placeholder="e.g. CS501"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Course Name
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white font-medium focus:border-indigo-500 focus:outline-none"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="e.g. Database Management Systems"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Department
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white focus:border-indigo-500 focus:outline-none"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Academic Year
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white focus:border-indigo-500 focus:outline-none"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="2024-2025"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Semester
              </label>
              <input
                type="number"
                min={1}
                max={8}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white focus:border-indigo-500 focus:outline-none"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Course Pattern / Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, courseType: "THEORETICAL" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                    formData.courseType === "THEORETICAL"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  Theoretical Course
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, courseType: "LAB" })}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                    formData.courseType === "LAB"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  Lab Course
                </button>
              </div>
            </div>
          </div>

          {/* Marks & Weightages Grid */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Pattern Max Marks & Weightages
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Internal Marks</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                  value={formData.maxInternalMarks}
                  onChange={(e) => setFormData({ ...formData, maxInternalMarks: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max External Marks</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                  value={formData.maxExternalMarks}
                  onChange={(e) => setFormData({ ...formData, maxExternalMarks: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Internal Weightage (%)</label>
                <input
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                  value={formData.internalWeightage}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, internalWeightage: val, externalWeightage: 100 - val });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">External Weightage (%)</label>
                <input
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                  value={formData.externalWeightage}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, externalWeightage: val, internalWeightage: 100 - val });
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="max-w-md">
                <label className="block text-xs text-slate-300 mb-1 font-medium flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  Course Benchmark Threshold (T_course) %:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="1"
                    min={1}
                    max={100}
                    className="w-28 px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                    value={formData.targetThresholdPercent}
                    onChange={(e) => setFormData({ ...formData, targetThresholdPercent: parseFloat(e.target.value) || 50 })}
                  />
                  <span className="text-xs text-slate-400">
                    Threshold marks for each question are calculated automatically as: 
                    <span className="text-indigo-300 font-mono font-semibold ml-1">T_Q = Max_Marks × ({formData.targetThresholdPercent || 50}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Outcomes (COs) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Course Outcomes (COs)</h3>
                <p className="text-xs text-slate-400">Specify expected competencies for this course.</p>
              </div>
              <button
                type="button"
                onClick={addCo}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Course Outcome
              </button>
            </div>

            <div className="space-y-2.5">
              {formData.courseOutcomes.map((co, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-950 p-3 border border-slate-800 rounded-lg shadow-sm">
                  <div className="w-20">
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-800/80 rounded text-center focus:outline-none"
                      value={co.coCode}
                      onChange={(e) => handleCoChange(idx, "coCode", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded focus:border-indigo-500 focus:outline-none"
                      value={co.description}
                      onChange={(e) => handleCoChange(idx, "description", e.target.value)}
                      placeholder="e.g. Understand relational database design and formulate SQL queries..."
                    />
                  </div>
                  <div className="w-28 flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      className="w-16 px-2 py-1.5 text-xs text-white bg-slate-900 border border-slate-700 rounded text-center focus:border-indigo-500 focus:outline-none"
                      value={co.targetPercent}
                      onChange={(e) => handleCoChange(idx, "targetPercent", parseFloat(e.target.value) || 50)}
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCo(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40 transition"
                    title="Remove CO"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-md shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Course & Weightages"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
