export const API_BASE_URL = "http://localhost:8080/api";

export interface CourseOutcome {
  coCode: string;
  description: string;
  targetPercent: number;
}

export interface CoPoMapping {
  coCode: string;
  poCode: string;
  level: number; // 0, 1, 2, 3
}

export interface Course {
  id?: string;
  courseCode: string;
  courseName: string;
  department: string;
  academicYear: string;
  semester: number;
  courseType: "THEORETICAL" | "LAB";
  maxInternalMarks: number;
  maxExternalMarks: number;
  internalWeightage: number;
  externalWeightage: number;
  targetThresholdPercent: number;
  questionThresholdPercent: number;
  courseOutcomes: CourseOutcome[];
  coPoMappings: CoPoMapping[];
}

export interface SubQuestionConfig {
  subQuestionId: string;
  parentQuestionId: string;
  label: string;
  maxMarks: number;
  coCode: string;
  bloomsLevel: string;
  description?: string;
}

export interface QuestionConfig {
  questionId: string;
  questionNumber: number;
  label: string;
  isMandatory?: boolean;
  orWithQuestionId?: string;
  coCode?: string;
  directMaxMarks?: number;
  subQuestions: SubQuestionConfig[];
  totalMaxMarks?: number;
}

export interface PairWiseOrGroup {
  groupName: string;
  questionA: string;
  questionB: string;
}

export interface ExamRuleConfig {
  topN: number;
  mandatoryQuestionIds: string[];
  orPairs: PairWiseOrGroup[];
}

export type RuleEngineCase = "CASE_1_TOP_N" | "CASE_2_MANDATORY_PLUS_TOP_N" | "CASE_3_PAIRWISE_OR";

export interface ExamAssessment {
  id?: string;
  courseId: string;
  examType: string;
  title: string;
  maxMarks: number;
  ruleEngineCase: RuleEngineCase;
  ruleConfig: ExamRuleConfig;
  questions: QuestionConfig[];
}

export interface StudentCoPerformance {
  coCode: string;
  scoredMarks: number;
  maxPossibleMarks: number;
  percentage: number;
  met: boolean;
}

export interface Student {
  id?: string;
  usn: string;
  name: string;
  email?: string;
  department?: string;
  semester?: string;
  section?: string;
}

export interface Faculty {
  id?: string;
  facultyId: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
}

/**
 * Stores assessment marks and rule engine evaluation results for a student in an exam.
 * Student profile & credentials are maintained separately in Student and Faculty.
 */
export interface StudentMarksRecord {
  id?: string;
  courseId: string;
  examId: string;
  studentUsn: string;
  studentName: string;
  subQuestionScores: Record<string, number>;
  mainQuestionScores: Record<string, number>;
  selectedQuestionIds: string[];
  ignoredQuestionIds: string[];
  totalScore: number;
  evaluationSteps: string[];
  coPerformances?: Record<string, StudentCoPerformance>;
}

export interface QuestionAttainmentSummary {
  questionOrSubQuestionId: string;
  label: string;
  coCode: string;
  maxMarks: number;
  thresholdMarks: number;
  totalAttemptedStudents: number;
  passedStudentsCount: number;
  passPercentage: number;
}

export interface CoAttainmentSummary {
  coCode: string;
  description: string;
  targetPercent: number;
  totalStudents: number;
  studentsMetCount: number;
  studentsMetPercent: number;
  finalResult: string; // "Y" or "N"
  directAttainmentLevel: number; // 0, 1, 2, 3
  averageMarksPercent: number;
}

export interface CoPoContribution {
  coCode: string;
  coAttainmentLevel: number;
  weight: number;
  poContribution: number;
}

export interface PoAttainmentSummary {
  poCode: string;
  attainedMappingSum: number; // Sum of (Weightage × CO Attainment Level)
  totalMappingSum: number;    // Sum of Weightages
  poAttainmentPercent: number;// PO Attainment value (e.g. 2.50)
  targetThreshold: number;
  finalStatus: string; // "Y" or "N"
  contributions?: CoPoContribution[];
}

export interface AttainmentReport {
  id?: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  examId: string;
  examTitle: string;
  totalStudentsEvaluated: number;
  courseTargetThreshold: number;
  questionThresholdPercent: number;
  questionAttainments: QuestionAttainmentSummary[];
  coAttainments: CoAttainmentSummary[];
  poAttainments: PoAttainmentSummary[];
  calculatedAt: string;
}

export interface CourseCoAttainmentRow {
  coCode: string;
  description?: string;
  ia1Percent?: number | null;
  ia2Percent?: number | null;
  internalPercent?: number | null;
  weightedInternalPercent?: number | null;
  finalPercent?: number | null;
  weightedFinalPercent?: number | null;
  totalCoPercent?: number | null;
  targetPercent?: number | null;
  finalResult?: string | null;
  directAttainmentLevel?: number | null;
  ia1Level?: number | null;
  ia2Level?: number | null;
  ia1Weighted?: number | null;
  ia2Weighted?: number | null;
  internalLevel?: number | null;
  weightedInternal?: number | null;
  finalLevel?: number | null;
  weightedFinal?: number | null;
  totalCoAttainment?: number | null;
}

export interface CourseOverallAttainment {
  id?: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  internalWeightage: number;
  externalWeightage: number;
  courseTargetThreshold: number;
  overallCourseAttainmentPercent?: number | null;
  overallCourseAttainmentLevel?: number | null;
  overallCourseAttained?: string | null;
  ia1Entered: boolean;
  ia2Entered: boolean;
  finalEntered: boolean;
  ia1ExamId?: string;
  ia2ExamId?: string;
  finalExamId?: string;
  coAttainments: CourseCoAttainmentRow[];
  poAttainments?: PoAttainmentSummary[];
}

// API functions
export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${API_BASE_URL}/courses`);
  return res.json();
}

export async function fetchCourseById(id: string): Promise<Course> {
  const res = await fetch(`${API_BASE_URL}/courses/${id}`);
  return res.json();
}

export async function createCourse(course: Partial<Course>): Promise<Course> {
  const res = await fetch(`${API_BASE_URL}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  });
  return res.json();
}

export async function updateCourse(id: string, course: Partial<Course>): Promise<Course> {
  const res = await fetch(`${API_BASE_URL}/courses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  });
  return res.json();
}

export async function updateCoPoMatrix(id: string, mappings: CoPoMapping[]): Promise<Course> {
  const res = await fetch(`${API_BASE_URL}/courses/${id}/copo-matrix`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mappings),
  });
  return res.json();
}

export function cleanExamTitle(title?: string): string {
  if (!title) return "";
  return title
    .replace(/\s*[\(\[][^)\]]*(?:case|best|top)[^)\]]*[\)\]]/gi, "")
    .replace(/\s*[\(\[]\s*case\s*[\d\w\s:]+[\)\]]/gi, "")
    .replace(/\s*case\s*\d+[^•\-]*/gi, "")
    .trim();
}

export async function fetchExamsByCourse(courseId: string): Promise<ExamAssessment[]> {
  const res = await fetch(`${API_BASE_URL}/exams/course/${courseId}`);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((e: ExamAssessment) => ({
      ...e,
      title: cleanExamTitle(e.title),
    }));
  }
  return data;
}

export async function createExam(exam: Partial<ExamAssessment>): Promise<ExamAssessment> {
  const res = await fetch(`${API_BASE_URL}/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exam),
  });
  return res.json();
}

export async function updateExam(id: string, exam: Partial<ExamAssessment>): Promise<ExamAssessment> {
  const res = await fetch(`${API_BASE_URL}/exams/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exam),
  });
  return res.json();
}

export async function simulateRuleEngine(data: {
  ruleEngineCase: RuleEngineCase;
  ruleConfig: ExamRuleConfig;
  questions: QuestionConfig[];
  subQuestionScores: Record<string, number>;
}) {
  const res = await fetch(`${API_BASE_URL}/exams/simulate-rule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchMarksByExam(examId: string): Promise<StudentMarksRecord[]> {
  const res = await fetch(`${API_BASE_URL}/marks/exam/${examId}`);
  return res.json();
}

export async function saveBatchMarks(examId: string, records: { studentUsn: string; studentName: string; subQuestionScores: Record<string, number> }[]) {
  const res = await fetch(`${API_BASE_URL}/marks/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ examId, records }),
  });
  return res.json();
}

export async function uploadExcelMarks(examId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/marks/exam/${examId}/import`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export function getExcelTemplateUrl(examId: string) {
  return `${API_BASE_URL}/marks/exam/${examId}/template`;
}

export async function fetchAttainmentByExam(examId: string): Promise<AttainmentReport> {
  const res = await fetch(`${API_BASE_URL}/attainment/exam/${examId}`);
  return res.json();
}

export async function calculateAttainment(examId: string): Promise<AttainmentReport> {
  const res = await fetch(`${API_BASE_URL}/attainment/calculate/${examId}`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchCourseOverallAttainment(courseId: string): Promise<CourseOverallAttainment> {
  const res = await fetch(`${API_BASE_URL}/attainment/course/${courseId}/overall`);
  return res.json();
}

export async function calculateCourseOverallAttainment(courseId: string): Promise<CourseOverallAttainment> {
  const res = await fetch(`${API_BASE_URL}/attainment/calculate/course/${courseId}`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchStudentRecords(usn: string) {
  const res = await fetch(`${API_BASE_URL}/student/${encodeURIComponent(usn)}/records`);
  return res.json();
}

export const fetchStudentPerformance = fetchStudentRecords;

export async function fetchDistinctStudents(): Promise<{ usn: string; name: string }[]> {
  const res = await fetch(`${API_BASE_URL}/student/directory`);
  return res.json();
}

// ==========================================
// COURSE ASSESSMENT SHEET (BACKEND-DRIVEN)
// ==========================================
export async function getAssessmentTemplate(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/assessment-sheet/template`);
  return res.json();
}

export async function getAssessmentTemplateForCourse(courseId: string, examId?: string, examType?: string): Promise<any> {
  const params = new URLSearchParams();
  if (examId) params.append("examId", examId);
  if (examType) params.append("examType", examType);
  const qStr = params.toString();
  const url = qStr
    ? `${API_BASE_URL}/assessment-sheet/course/${courseId}?${qStr}`
    : `${API_BASE_URL}/assessment-sheet/course/${courseId}`;
  const res = await fetch(url);
  return res.json();
}

export async function calculateAssessmentSheet(data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/assessment-sheet/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function saveAssessmentSheetMarks(data: any): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/assessment-sheet/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function exportAssessmentExcel(data: any): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/assessment-sheet/export-excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.blob();
}

export async function exportAssessmentPdf(data: any): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/assessment-sheet/export-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.blob();
}

export async function loginFaculty(credentials: { email: string; password?: string; name?: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/faculty/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  return res.json();
}

export async function loginStudent(credentials: { usn: string; name?: string }) {
  const res = await fetch(`${API_BASE_URL}/auth/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  return res.json();
}



