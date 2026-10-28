"use client";

import React, { useState, useEffect } from "react";
import {
  Course,
  ExamAssessment,
  fetchCourses,
  fetchExamsByCourse,
} from "@/lib/api";
import CourseSetupTab from "@/components/CourseSetupTab";
import CoPoMatrixTab from "@/components/CoPoMatrixTab";
import QuestionMappingRuleTab from "@/components/QuestionMappingRuleTab";
import MarksGridTab from "@/components/MarksGridTab";
import AttainmentDashboardTab from "@/components/AttainmentDashboardTab";
import StudentPortalView from "@/components/StudentPortalView";
import AssessmentSheetTab from "@/components/AssessmentSheetTab";
import { AuthLoginView } from "@/components/AuthLoginView";
import {
  GraduationCap,
  BookOpen,
  Grid,
  Table as TableIcon,
  Award,
  User,
  ShieldCheck,
  Cpu,
  FileSpreadsheet,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface UserSession {
  role: "FACULTY" | "STUDENT";
  name: string;
  id: string;
  email?: string;
}

export default function Home() {
  // Session Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Global Role: "faculty" | "student"
  const [activeRole, setActiveRole] = useState<"faculty" | "student">("faculty");

  // Faculty Tabs: 1 (Course Setup) to 5/6
  const [activeTab, setActiveTab] = useState<number>(1);

  // Courses and Exams State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [exams, setExams] = useState<ExamAssessment[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamAssessment | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("copo_user") : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) {
          setCurrentUser(parsed);
          setActiveRole(parsed.role === "FACULTY" ? "faculty" : "student");
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadInitialData();
    }
  }, [currentUser]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const courseList = await fetchCourses();
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourse(courseList[0]);
        if (courseList[0].id) {
          const examList = await fetchExamsByCourse(courseList[0].id);
          setExams(examList);
          if (examList.length > 0) {
            setSelectedExam(examList[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load initial courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (
    role: "FACULTY" | "STUDENT",
    details: { name: string; id: string; email?: string }
  ) => {
    const user = { role, ...details };
    setCurrentUser(user);
    setActiveRole(role === "FACULTY" ? "faculty" : "student");
    setActiveTab(1);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("copo_user", JSON.stringify(user));
      }
    } catch (e) {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("copo_user");
      }
    } catch (e) {}
  };

  const handleSelectCourse = async (courseId: string) => {
    const found = courses.find((c) => c.id === courseId);
    if (found) {
      setSelectedCourse(found);
      if (found.id) {
        const examList = await fetchExamsByCourse(found.id);
        setExams(examList);
        setSelectedExam(examList.length > 0 ? examList[0] : null);
      }
    }
  };

  const handleCourseUpdated = async (updatedCourse: Course) => {
    setSelectedCourse(updatedCourse);
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === updatedCourse.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedCourse;
        return copy;
      }
      return [...prev, updatedCourse];
    });

    if (updatedCourse.id) {
      try {
        const examList = await fetchExamsByCourse(updatedCourse.id);
        setExams(examList);
        setSelectedExam(examList.length > 0 ? examList[0] : null);
      } catch (e) {
        setExams([]);
        setSelectedExam(null);
      }
    } else {
      setExams([]);
      setSelectedExam(null);
    }
  };

  const handleExamSaved = (savedExam: ExamAssessment) => {
    setSelectedExam(savedExam);
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === savedExam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedExam;
        return copy;
      }
      return [...prev, savedExam];
    });
  };

  const handleAttainmentRecalculated = () => {
    // Refresh handler
  };

  // If not logged in, show dedicated Auth Login Screen
  if (!currentUser) {
    return <AuthLoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and System Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                  CO-PO Attainment System
                </h1>
                <span className="text-[11px] font-semibold text-indigo-400 tracking-wide uppercase">
                  NBA / OBE Rule Engine • Assessment Sheet Standard
                </span>
              </div>
            </div>

            {/* Right Controls: Course Selector, User Pill, Logout */}
            <div className="flex items-center gap-3">
              {/* Course Selector Dropdown (for faculty) */}
              {currentUser.role === "FACULTY" && courses.length > 0 && (
                <div className="hidden md:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400">Course:</span>
                  <select
                    className="font-semibold text-slate-200 bg-transparent focus:outline-none cursor-pointer"
                    value={selectedCourse?.id || ""}
                    onChange={(e) => handleSelectCourse(e.target.value)}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.courseCode} - {c.courseName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* User Profile Capsule */}
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                {currentUser.role === "FACULTY" ? (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="text-left">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentUser.id}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-1.5 ${
                    currentUser.role === "FACULTY"
                      ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>

              {/* Log Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer"
                title="Log out and return to portal login"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-[98%] 2xl:max-w-[1850px] mx-auto px-2 sm:px-4 lg:px-6 py-6">
        {currentUser.role === "FACULTY" ? (
          <div className="space-y-6">
            {/* Faculty Navigation Tabs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-sm overflow-x-auto">
              <nav className="flex space-x-1" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab(1)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 1
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  1. Course Setup & Weightages
                </button>

                <button
                  onClick={() => setActiveTab(2)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 2
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  2. CO-PO Correlation Matrix
                </button>

                <button
                  onClick={() => setActiveTab(3)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 3
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  3. Question-to-CO Mapping & Choices
                </button>

                <button
                  onClick={() => setActiveTab(4)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 4
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-amber-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  ★ 4. Course Assessment Sheet (OBE Dynamic Template)
                </button>

                <button
                  onClick={() => setActiveTab(5)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 5
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Award className="w-4 h-4" />
                  5. Attainment Dashboard (CO & PO)
                </button>

                <button
                  onClick={() => setActiveTab(6)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === 6
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  6. Raw Marks Grid (Alt)
                </button>
              </nav>
            </div>

            {/* Tab Contents */}
            <div>
              {activeTab === 1 && (
                <CourseSetupTab
                  course={selectedCourse}
                  allCourses={courses}
                  onSelectCourse={handleSelectCourse}
                  onCourseUpdated={handleCourseUpdated}
                />
              )}

              {activeTab === 2 && (
                <CoPoMatrixTab
                  course={selectedCourse}
                  allCourses={courses}
                  onSelectCourse={handleSelectCourse}
                  onCourseUpdated={handleCourseUpdated}
                />
              )}

              {activeTab === 3 && (
                <QuestionMappingRuleTab
                  course={selectedCourse}
                  allCourses={courses}
                  onSelectCourse={handleSelectCourse}
                  exams={exams}
                  selectedExam={selectedExam}
                  onSelectExam={setSelectedExam}
                  onExamSaved={handleExamSaved}
                  onProceedToTemplate={async (savedExam) => {
                    if (savedExam) {
                      handleExamSaved(savedExam);
                    }
                    if (selectedCourse?.id) {
                      const updatedExams = await fetchExamsByCourse(selectedCourse.id);
                      setExams(updatedExams);
                    }
                    setActiveTab(4);
                  }}
                />
              )}

              {activeTab === 4 && (
                <AssessmentSheetTab
                  currentCourse={selectedCourse}
                  allCourses={courses}
                  onSelectCourse={handleSelectCourse}
                  exams={exams}
                  selectedExam={selectedExam}
                  onSelectExam={setSelectedExam}
                  refreshTrigger={activeTab}
                />
              )}

              {activeTab === 5 && (
                <AttainmentDashboardTab exam={selectedExam} />
              )}

              {activeTab === 6 && (
                <MarksGridTab
                  exam={selectedExam}
                  onAttainmentCalculated={handleAttainmentRecalculated}
                />
              )}
            </div>
          </div>
        ) : (
          /* Student Portal View */
          <StudentPortalView initialStudentUsn={currentUser.id} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 text-center text-xs text-slate-500">
        NBA & OBE Academic Outcome Attainment Engine • Spring Boot 3 + Next.js + MongoDB • Dynamic Rule Cases 1, 2, 3
      </footer>
    </div>
  );
}
