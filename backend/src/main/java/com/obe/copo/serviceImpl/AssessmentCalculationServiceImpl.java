package com.obe.copo.serviceImpl;

import com.obe.copo.service.AssessmentCalculationService;

import com.obe.copo.dto.SheetAssessmentDto;
import com.obe.copo.dto.SheetAssessmentDto.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import com.obe.copo.model.*;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.service.ExamService;
import com.obe.copo.repository.StudentMarksRecordRepository;
import com.obe.copo.repository.CourseRepository;
import com.obe.copo.repository.StudentRepository;

@Service
public class AssessmentCalculationServiceImpl implements AssessmentCalculationService {

    @Autowired(required = false)
    private ExamAssessmentRepository examAssessmentRepository;

    @Autowired(required = false)
    private StudentRepository studentRepository;

    @Autowired(required = false)
    StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired(required = false)
    private CourseRepository courseRepository;

    @Autowired(required = false)
    private ExamService examService;

    @Override
    public SheetAssessmentDto calculateAssessmentSheet(SheetAssessmentDto input) {
        if (input == null) {
            input = getDefaultTemplateData();
        }

        double threshold = input.getThreshold() > 0 ? input.getThreshold() : 50.0;// bydefault it is 50
        List<QuestionMeta> midQs = input.getMidtermQuestions();
        List<QuestionMeta> finalQs = input.getFinalQuestions();
        List<StudentRowDto> students = input.getStudents();
        int totalStudents = students != null ? students.size() : 0;
        input.setNoOfStudents(totalStudents);

        // Calculate CO-Question Matrix (Max marks per CO)
        Map<String, Double> coMidMax = new LinkedHashMap<>();
        Map<String, Double> coFinalMax = new LinkedHashMap<>();
        Set<String> allCos = new TreeSet<>();

        for (QuestionMeta q : midQs) {
            allCos.add(q.getCoCode());
            coMidMax.put(q.getCoCode(), coMidMax.getOrDefault(q.getCoCode(), 0.0) + q.getMaxMarks());
        }
        for (QuestionMeta q : finalQs) {
            allCos.add(q.getCoCode());
            coFinalMax.put(q.getCoCode(), coFinalMax.getOrDefault(q.getCoCode(), 0.0) + q.getMaxMarks());
        }

        double grandTotalMarks = 0.0;
        for (QuestionMeta q : midQs)
            grandTotalMarks += q.getMaxMarks();
        for (QuestionMeta q : finalQs)
            grandTotalMarks += q.getMaxMarks();

        List<CoMatrixRow> matrixRows = new ArrayList<>();
        Map<String, Double> coTotalMaxMap = new LinkedHashMap<>();

        for (String co : allCos) {
            double mid = coMidMax.getOrDefault(co, 0.0);
            double fin = coFinalMax.getOrDefault(co, 0.0);
            double total = mid + fin;
            coTotalMaxMap.put(co, total);
            double percent = grandTotalMarks > 0 ? Math.round((total / grandTotalMarks) * 100.0) : 0.0;
            matrixRows.add(new CoMatrixRow(co, mid, fin, total, percent));
        }
        input.setCoQuestionMatrix(matrixRows);

        // Compute Question Threshold Marks (T_Q = M_Q * threshold)
        for (QuestionMeta q : midQs) {
            q.setThresholdMarks(Math.round(q.getMaxMarks() * (threshold / 100.0) * 10.0) / 10.0);
        }
        for (QuestionMeta q : finalQs) {
            q.setThresholdMarks(Math.round(q.getMaxMarks() * (threshold / 100.0) * 10.0) / 10.0);
        }

        // Tracking for question stats
        Map<String, Integer> qMidAttempted = new HashMap<>();
        Map<String, Integer> qMidPassed = new HashMap<>();
        Map<String, Integer> qFinalAttempted = new HashMap<>();
        Map<String, Integer> qFinalPassed = new HashMap<>();

        // Tracking for CO achieved count
        Map<String, Integer> coAchievedCount = new LinkedHashMap<>();
        for (String co : allCos)
            coAchievedCount.put(co, 0);

        com.obe.copo.model.ExamAssessment exam = null;
        if (examAssessmentRepository != null && input.getExamId() != null && !input.getExamId().trim().isEmpty()) {
            exam = examAssessmentRepository.findById(input.getExamId()).orElse(null);
        }

        // Process every student strictly in the backend
        if (students != null) {
            for (StudentRowDto st : students) {
                boolean hasAnyAttempt = false;
                double midTotal = 0.0;
                Map<String, Double> studentCoScores = new HashMap<>();
                Map<String, Double> studentRawScores = new HashMap<>();

                for (QuestionMeta q : midQs) {
                    String raw = st.getMidScores().get(q.getId());
                    Double score = parseScore(raw);
                    if (score != null) {
                        hasAnyAttempt = true;
                        studentRawScores.put(q.getId(), score);
                        qMidAttempted.put(q.getId(), qMidAttempted.getOrDefault(q.getId(), 0) + 1);
                        if (score >= q.getThresholdMarks()) {
                            qMidPassed.put(q.getId(), qMidPassed.getOrDefault(q.getId(), 0) + 1);
                        }
                    }
                }

                if (hasAnyAttempt) {
                    if (exam != null && examService != null && exam.getQuestions() != null
                            && !exam.getQuestions().isEmpty()) {
                        EvaluationResult evalResult = examService.evaluateStudentMarks(exam, studentRawScores);
                        midTotal = evalResult.getTotalScore();
                        Set<String> selectedQIds = new HashSet<>(evalResult.getSelectedQuestionIds());
                        for (com.obe.copo.model.QuestionConfig qc : exam.getQuestions()) {
                            if (selectedQIds.contains(qc.getQuestionId())) {
                                String coCode = qc.getPrimaryCoCode();
                                if (!studentCoScores.containsKey(coCode)) {
                                    studentCoScores.put(coCode, 0.0);
                                }
                                if (qc.getSubQuestions() != null && !qc.getSubQuestions().isEmpty()) {
                                    for (com.obe.copo.model.SubQuestionConfig sq : qc.getSubQuestions()) {
                                        String sqCo = sq.getCoCode() != null && !sq.getCoCode().trim().isEmpty()
                                                ? sq.getCoCode().trim()
                                                : coCode;
                                        if (!studentCoScores.containsKey(sqCo)) {
                                            studentCoScores.put(sqCo, 0.0);
                                        }
                                        Double s = studentRawScores.get(sq.getSubQuestionId());
                                        if (s != null) {
                                            studentCoScores.put(sqCo,
                                                    studentCoScores.getOrDefault(sqCo, 0.0) + s);
                                        }
                                    }
                                } else {
                                    Double s = studentRawScores.get(qc.getQuestionId());
                                    if (s != null) {
                                        studentCoScores.put(coCode,
                                                studentCoScores.getOrDefault(coCode, 0.0) + s);
                                    }
                                }
                            }
                        }
                    } else {
                        for (QuestionMeta q : midQs) {
                            Double score = studentRawScores.get(q.getId());
                            if (score != null) {
                                midTotal += score;
                                studentCoScores.put(q.getCoCode(),
                                        studentCoScores.getOrDefault(q.getCoCode(), 0.0) + score);
                            }
                        }
                    }
                }

                // Final calculations
                double finalTotal = 0.0;
                for (QuestionMeta q : finalQs) {
                    String raw = st.getFinalScores().get(q.getId());
                    Double score = parseScore(raw);
                    if (score != null) {
                        hasAnyAttempt = true;
                        finalTotal += score;
                        studentCoScores.put(q.getCoCode(), studentCoScores.getOrDefault(q.getCoCode(), 0.0) + score);
                        qFinalAttempted.put(q.getId(), qFinalAttempted.getOrDefault(q.getId(), 0) + 1);
                        if (score >= q.getThresholdMarks()) {
                            qFinalPassed.put(q.getId(), qFinalPassed.getOrDefault(q.getId(), 0) + 1);
                        }
                    }
                }

                st.setAttempted(hasAnyAttempt);
                if (hasAnyAttempt) {
                    st.setMidTotal(Math.round(midTotal * 10.0) / 10.0);
                    st.setFinalTotal(Math.round(finalTotal * 10.0) / 10.0);
                    st.setOverallTotal(Math.round((midTotal + finalTotal) * 10.0) / 10.0);
                } else {
                    st.setMidTotal(null);
                    st.setFinalTotal(null);
                    st.setOverallTotal(null);
                }

                // CO Marks % and Met Criteria per student
                Map<String, Double> coPercents = new LinkedHashMap<>();
                Map<String, String> coMets = new LinkedHashMap<>();

                for (String co : allCos) {
                    if (hasAnyAttempt && studentCoScores.containsKey(co)) {
                        double maxCo = coTotalMaxMap.getOrDefault(co, 0.0);
                        double scored = studentCoScores.getOrDefault(co, 0.0);
                        double pct = maxCo > 0 ? Math.round((scored / maxCo) * 100.0) : 0.0;
                        coPercents.put(co, pct);

                        boolean isMet = pct >= threshold;
                        String status = isMet ? "Y" : "N";
                        coMets.put(co, status);

                        if (isMet) {
                            coAchievedCount.put(co, coAchievedCount.get(co) + 1);
                        }
                    } else {
                        coPercents.put(co, null);
                        coMets.put(co, "-");
                    }
                }
                st.setCoMarksPercent(coPercents);
                st.setCoMetStatus(coMets);
            }
        }

        // Finalize Question stats (Method B)
        for (QuestionMeta q : midQs) {
            int att = qMidAttempted.getOrDefault(q.getId(), 0);
            int pas = qMidPassed.getOrDefault(q.getId(), 0);
            q.setAttemptedCount(att);
            q.setPassedCount(pas);
            q.setPassPercentage(att > 0 ? Math.round(((double) pas / att) * 100.0) : 0.0);
        }
        for (QuestionMeta q : finalQs) {
            int att = qFinalAttempted.getOrDefault(q.getId(), 0);
            int pas = qFinalPassed.getOrDefault(q.getId(), 0);
            q.setAttemptedCount(att);
            q.setPassedCount(pas);
            q.setPassPercentage(att > 0 ? Math.round(((double) pas / att) * 100.0) : 0.0);
        }

        // Finalize CO Summary (Method A)
        Map<String, CoSummaryMeta> coSummaryMap = new LinkedHashMap<>();
        Set<String> attainedCos = new HashSet<>();

        for (String co : allCos) {
            int achieved = coAchievedCount.getOrDefault(co, 0);
            double pct = totalStudents > 0 ? Math.round(((double) achieved / totalStudents) * 100.0) : 0.0;
            String res = pct >= threshold ? "Y" : "N";
            if ("Y".equals(res)) {
                attainedCos.add(co);
            }
            coSummaryMap.put(co, new CoSummaryMeta(co, achieved, pct, res));
        }
        input.setCoSummary(coSummaryMap);

        // Calculate PO Attainments (Method PO)
        List<PoAttainmentRow> poRows = input.getPoAttainments();
        if (poRows == null) {
            poRows = new ArrayList<>();
        }

        // Update each row with CO Result and exact CO Attainment Level (3.0, 2.0, 1.0)
        for (PoAttainmentRow pr : poRows) {
            boolean isAttained = attainedCos.contains(pr.getCoCode());
            pr.setCoResult(isAttained ? "Y" : "N");
            CoSummaryMeta meta = coSummaryMap.get(pr.getCoCode());
            double achievedPct = meta != null ? meta.getAchievedPercent() : (isAttained ? 100.0 : 0.0);
            double coLevel = 0.0;
            if (achievedPct >= 70.0)
                coLevel = 3.0;
            else if (achievedPct >= 60.0)
                coLevel = 2.0;
            else if (achievedPct >= 50.0)
                coLevel = 1.0;
            else if (isAttained)
                coLevel = 3.0;
            pr.setCoAttainmentLevel(coLevel);
        }
        input.setPoAttainments(poRows);

        if (input.getAssessmentTitle() != null) {
            input.setAssessmentTitle(cleanTitleString(input.getAssessmentTitle()));
        }
        if (input.getExamTitle() != null) {
            input.setExamTitle(cleanTitleString(input.getExamTitle()));
        }

        return input;
    }

    private String cleanTitleString(String title) {
        if (title == null)
            return "";
        return title.replaceAll("(?i)\\s*[\\[\\(][^\\]\\)]*(?:case|best|top)[^\\]\\)]*[\\]\\)]", "")
                .replaceAll("(?i)\\s*[\\[\\(]\\s*case\\s*[\\w\\d\\s:]+[\\]\\)]", "")
                .replaceAll("(?i)\\bcase\\s*\\d+[^•\\-]*", "")
                .trim();
    }

    private Double parseScore(String raw) {
        if (raw == null)
            return null;
        raw = raw.trim();
        if (raw.isEmpty() || "N".equalsIgnoreCase(raw) || "-".equals(raw)) {
            return null; // Not attempted / absent
        }
        try {
            return Double.parseDouble(raw);
        } catch (Exception e) {
            return null;
        }
    }

    // Dynamically generates the assessment sheet template for any course:
    // Uses the course's code, name, semester, and department
    // Derives questions and mapped COs from the course's exam question setup
    // Automatically calculates threshold marks for each question: T_Q = M_Q *
    // (threshold / 100)
    // Generates clean student rows with BLANK marks ready for entry

    @Override
    public SheetAssessmentDto generateTemplateForCourse(Course course, List<ExamAssessment> exams) {
        SheetAssessmentDto sheet = new SheetAssessmentDto();
        String dept = (course.getDepartment() != null && !course.getDepartment().trim().isEmpty())
                ? course.getDepartment()
                : "Department of Computer Science & Engineering";
        sheet.setInstitutionName(dept);
        sheet.setAssessmentTitle("Outcome-Based Education (OBE) • CO-PO Attainment Assessment Sheet");
        sheet.setCourseCode(course.getCourseCode() != null ? course.getCourseCode() : "COURSE");
        sheet.setCourseTitle(course.getCourseName() != null ? course.getCourseName() : "Course Title");
        sheet.setSemesterAndYear(course.getAcademicYear() + " (Sem " + course.getSemester() + ")");
        sheet.setLevelAndTerm("Semester " + course.getSemester());
        sheet.setSection("A");
        sheet.setMlInitial("FAC");
        double threshold = course.getTargetThresholdPercent() > 0 ? course.getTargetThresholdPercent() : 50.0;
        sheet.setThreshold(threshold);

        // Build question lists from exams if available
        List<QuestionMeta> midQs = new ArrayList<>();
        List<QuestionMeta> finalQs = new ArrayList<>();

        if (exams != null && !exams.isEmpty()) {
            ExamAssessment primaryEx = exams.get(0);
            sheet.setExamId(primaryEx.getId());
            sheet.setExamType(primaryEx.getExamType());
            String cleanTitle = cleanTitleString(
                    primaryEx.getTitle() != null ? primaryEx.getTitle() : primaryEx.getExamType());
            sheet.setExamTitle(cleanTitle);
            sheet.setAssessmentTitle(cleanTitle + " • CO-PO Attainment Assessment Sheet");

            for (int eIdx = 0; eIdx < exams.size(); eIdx++) {
                ExamAssessment ex = exams.get(eIdx);
                boolean isFinalExam = (eIdx > 0 && exams.size() > 1) ||
                        (ex.getExamType() != null &&
                                (ex.getExamType().toUpperCase().contains("FINAL") ||
                                        ex.getExamType().toUpperCase().contains("EXTERNAL") ||
                                        ex.getExamType().toUpperCase().contains("SEM")));

                List<QuestionMeta> targetList = isFinalExam ? finalQs : midQs;
                if (exams.size() == 1) {
                    targetList = midQs;
                }

                if (ex.getQuestions() != null) {
                    for (QuestionConfig q : ex.getQuestions()) {
                        // If subquestions are defined (e.g. Q1a, Q1b, etc.), include each subquestion
                        if (q.getSubQuestions() != null && !q.getSubQuestions().isEmpty()) {
                            for (SubQuestionConfig sq : q.getSubQuestions()) {
                                double sqMarks = sq.getMaxMarks() > 0 ? sq.getMaxMarks() : 5.0;
                                String sqCo = (sq.getCoCode() != null && !sq.getCoCode().trim().isEmpty())
                                        ? sq.getCoCode().trim()
                                        : (q.getCoCode() != null && !q.getCoCode().trim().isEmpty()
                                                ? q.getCoCode().trim()
                                                : "CO1");
                                String sqId = (sq.getSubQuestionId() != null && !sq.getSubQuestionId().isEmpty())
                                        ? sq.getSubQuestionId()
                                        : q.getQuestionId();
                                QuestionMeta qm = new QuestionMeta(sqId, sqCo, sqMarks);
                                qm.setThresholdMarks(Math.round(sqMarks * (threshold / 100.0) * 10.0) / 10.0);
                                targetList.add(qm);
                            }
                        } else {
                            // Direct question
                            double qMarks = q.getTotalMaxMarks() > 0 ? q.getTotalMaxMarks()
                                    : (q.getDirectMaxMarks() != null ? q.getDirectMaxMarks() : 10.0);
                            String co = (q.getCoCode() != null && !q.getCoCode().trim().isEmpty())
                                    ? q.getCoCode().trim()
                                    : (q.getPrimaryCoCode() != null ? q.getPrimaryCoCode().trim() : "CO1");
                            QuestionMeta qm = new QuestionMeta(q.getQuestionId(), co, qMarks);
                            qm.setThresholdMarks(Math.round(qMarks * (threshold / 100.0) * 10.0) / 10.0);
                            targetList.add(qm);
                        }
                    }
                }
            }
        }

        sheet.setMidtermQuestions(midQs);
        sheet.setFinalQuestions(finalQs);

        // Pre-populate default 8 students from database (or standard 8 students)
        List<StudentRowDto> students = new ArrayList<>();
        List<Student> dbStudents = studentRepository != null ? studentRepository.findAll() : Collections.emptyList();
        if (!dbStudents.isEmpty()) {
            for (Student s : dbStudents) {
                StudentRowDto st = new StudentRowDto();
                st.setStudentId(s.getUsn());
                st.setStudentName(s.getName());
                students.add(st);
            }
        } else {
            for (int i = 1; i <= 8; i++) {
                StudentRowDto st = new StudentRowDto();
                st.setStudentId(String.format("192-15-%04d", i));
                st.setStudentName("Student " + i);
                students.add(st);
            }
        }
        sheet.setStudents(students);
        sheet.setNoOfStudents(students.size());

        // Derive PO Attainment mappings from the course
        List<PoAttainmentRow> poRows = new ArrayList<>();
        List<CourseOutcome> cos = course.getCourseOutcomes();
        if (cos != null && !cos.isEmpty()) {
            for (CourseOutcome co : cos) {
                PoAttainmentRow pr = new PoAttainmentRow();
                pr.setCoCode(co.getCoCode());
                pr.setCoResult("N");
                if (course.getCoPoMappings() != null) {
                    for (CoPoMapping m : course.getCoPoMappings()) {
                        if (m.getCoCode().equalsIgnoreCase(co.getCoCode())) {
                            pr.getPoWeights().put(m.getPoCode(), m.getLevel());
                        }
                    }
                }
                poRows.add(pr);
            }
        }
        sheet.setPoAttainments(poRows);

        return calculateAssessmentSheet(sheet);
    }

    // Clean and empty default template

    @Override
    public SheetAssessmentDto getDefaultTemplateData() {
        SheetAssessmentDto sheet = new SheetAssessmentDto();
        sheet.setSemesterAndYear("2025-26 (Sem 5)");
        sheet.setCourseCode("CS501");
        sheet.setCourseTitle("Data Structures & Algorithms");
        sheet.setLevelAndTerm("Semester 5");
        sheet.setSection("A");
        sheet.setMlInitial("FAC");
        sheet.setThreshold(50.0);

        List<QuestionMeta> defaultMid = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            QuestionMeta qm = new QuestionMeta("Q" + i, "CO" + i, 10.0);
            qm.setThresholdMarks(5.0);
            defaultMid.add(qm);
        }
        sheet.setMidtermQuestions(defaultMid);
        sheet.setFinalQuestions(new ArrayList<>());

        List<StudentRowDto> defaultStudents = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            StudentRowDto st = new StudentRowDto();
            st.setStudentId(String.format("192-15-%04d", i));
            st.setStudentName("Student " + i);
            defaultStudents.add(st);
        }
        sheet.setStudents(defaultStudents);
        sheet.setNoOfStudents(8);

        List<PoAttainmentRow> poRows = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            PoAttainmentRow pr = new PoAttainmentRow();
            pr.setCoCode("CO" + i);
            pr.setCoResult("N");
            pr.getPoWeights().put("PO1", 3);
            pr.getPoWeights().put("PO2", 2);
            poRows.add(pr);
        }
        sheet.setPoAttainments(poRows);
        return calculateAssessmentSheet(sheet);
    }

    private List<PoAttainmentRow> getDefaultPoMappingRows() {
        return new ArrayList<>();
    }

    // Generates downloadable Excel matching the exact reference layout and styles.
    @Override
    public byte[] generateAssessmentExcel(SheetAssessmentDto sheet) throws Exception {
        // Run full backend calculation first to ensure 100% accurate values
        sheet = calculateAssessmentSheet(sheet);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet ws = wb.createSheet("CO-PO Attainment");

            // Fonts & Styles
            Font bold14 = wb.createFont();
            bold14.setBold(true);
            bold14.setFontHeightInPoints((short) 14);

            Font bold11 = wb.createFont();
            bold11.setBold(true);
            bold11.setFontHeightInPoints((short) 10);

            CellStyle titleStyle = wb.createCellStyle();
            titleStyle.setFont(bold14);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle subTitleStyle = wb.createCellStyle();
            subTitleStyle.setFont(bold11);
            subTitleStyle.setAlignment(HorizontalAlignment.CENTER);
            subTitleStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            subTitleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle borderBoldCenter = wb.createCellStyle();
            borderBoldCenter.setFont(bold11);
            borderBoldCenter.setAlignment(HorizontalAlignment.CENTER);
            borderBoldCenter.setBorderTop(BorderStyle.THIN);
            borderBoldCenter.setBorderBottom(BorderStyle.THIN);
            borderBoldCenter.setBorderLeft(BorderStyle.THIN);
            borderBoldCenter.setBorderRight(BorderStyle.THIN);

            CellStyle centerCell = wb.createCellStyle();
            centerCell.setAlignment(HorizontalAlignment.CENTER);
            centerCell.setBorderTop(BorderStyle.THIN);
            centerCell.setBorderBottom(BorderStyle.THIN);
            centerCell.setBorderLeft(BorderStyle.THIN);
            centerCell.setBorderRight(BorderStyle.THIN);

            CellStyle headerFillMid = wb.createCellStyle();
            headerFillMid.setFont(bold11);
            headerFillMid.setAlignment(HorizontalAlignment.CENTER);
            headerFillMid.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            headerFillMid.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerFillMid.setBorderTop(BorderStyle.THIN);
            headerFillMid.setBorderBottom(BorderStyle.THIN);
            headerFillMid.setBorderLeft(BorderStyle.THIN);
            headerFillMid.setBorderRight(BorderStyle.THIN);

            CellStyle headerFillFinal = wb.createCellStyle();
            headerFillFinal.setFont(bold11);
            headerFillFinal.setAlignment(HorizontalAlignment.CENTER);
            headerFillFinal.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
            headerFillFinal.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerFillFinal.setBorderTop(BorderStyle.THIN);
            headerFillFinal.setBorderBottom(BorderStyle.THIN);
            headerFillFinal.setBorderLeft(BorderStyle.THIN);
            headerFillFinal.setBorderRight(BorderStyle.THIN);

            CellStyle headerFillCo = wb.createCellStyle();
            headerFillCo.setFont(bold11);
            headerFillCo.setAlignment(HorizontalAlignment.CENTER);
            headerFillCo.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
            headerFillCo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerFillCo.setBorderTop(BorderStyle.THIN);
            headerFillCo.setBorderBottom(BorderStyle.THIN);
            headerFillCo.setBorderLeft(BorderStyle.THIN);
            headerFillCo.setBorderRight(BorderStyle.THIN);

            // Row 1: Institution / Department Title
            Row r1 = ws.createRow(1);
            Cell cTitle = r1.createCell(1);
            String inst = (sheet.getInstitutionName() != null && !sheet.getInstitutionName().trim().isEmpty())
                    ? sheet.getInstitutionName()
                    : "Outcome-Based Education (OBE) Attainment Assessment";
            cTitle.setCellValue(inst);
            cTitle.setCellStyle(titleStyle);

            // Row 2: Subtitle
            Row r2 = ws.createRow(2);
            Cell cSub = r2.createCell(1);
            String subTitle = (sheet.getAssessmentTitle() != null && !sheet.getAssessmentTitle().trim().isEmpty())
                    ? sheet.getAssessmentTitle()
                    : "CO-PO Attainment Assessment Sheet";
            cSub.setCellValue(subTitle);
            cSub.setCellStyle(subTitleStyle);

            // Metadata Rows (Rows 4-11)
            String[][] meta = {
                    { "Semester & Year:", sheet.getSemesterAndYear() },
                    { "Course Code:", sheet.getCourseCode() },
                    { "Course Title:", sheet.getCourseTitle() },
                    { "Level & Term:", sheet.getLevelAndTerm() },
                    { "Section:", sheet.getSection() },
                    { "No. of Students:", String.valueOf(sheet.getNoOfStudents()) },
                    { "ML Initial:", sheet.getMlInitial() },
                    { "Threshold:", (int) sheet.getThreshold() + "%" }
            };

            for (int i = 0; i < meta.length; i++) {
                Row r = ws.getRow(4 + i) != null ? ws.getRow(4 + i) : ws.createRow(4 + i);
                Cell c0 = r.createCell(0);
                c0.setCellValue(meta[i][0]);
                c0.setCellStyle(borderBoldCenter);
                Cell c1 = r.createCell(1);
                c1.setCellValue(meta[i][1]);
                c1.setCellStyle(centerCell);
            }

            // Top-Middle: CO-Question Matrix (Starts at Col 8, Row 4)
            Row rMatrixHeader0 = ws.getRow(4) != null ? ws.getRow(4) : ws.createRow(4);
            Cell cMatTitle = rMatrixHeader0.createCell(8);
            cMatTitle.setCellValue("CO-Question Matrix");
            cMatTitle.setCellStyle(headerFillCo);
            ws.addMergedRegion(new CellRangeAddress(4, 4, 8, 12));

            Row rMatrixHeader1 = ws.getRow(5) != null ? ws.getRow(5) : ws.createRow(5);
            String[] matCols = { "CO", "Mid", "Final", "Total", "%" };
            for (int c = 0; c < matCols.length; c++) {
                Cell cell = rMatrixHeader1.createCell(8 + c);
                cell.setCellValue(matCols[c]);
                cell.setCellStyle(borderBoldCenter);
            }

            int mRow = 6;
            for (CoMatrixRow mr : sheet.getCoQuestionMatrix()) {
                Row r = ws.getRow(mRow) != null ? ws.getRow(mRow) : ws.createRow(mRow);
                r.createCell(8).setCellValue(mr.getCoCode());
                r.createCell(9).setCellValue((int) mr.getMidMarks());
                r.createCell(10).setCellValue((int) mr.getFinalMarks());
                r.createCell(11).setCellValue((int) mr.getTotalMarks());
                r.createCell(12).setCellValue((int) mr.getPercent() + "%");
                for (int c = 8; c <= 12; c++)
                    r.getCell(c).setCellStyle(centerCell);
                mRow++;
            }

            // Top-Right: CO Met Criteria (Starts at Col 15, Row 6)
            Row rCrit0 = ws.getRow(6) != null ? ws.getRow(6) : ws.createRow(6);
            Cell cCritTitle = rCrit0.createCell(15);
            cCritTitle.setCellValue("CO Met Criteria");
            cCritTitle.setCellStyle(headerFillCo);
            ws.addMergedRegion(new CellRangeAddress(6, 6, 15, 18));

            Row rCrit1 = ws.getRow(7) != null ? ws.getRow(7) : ws.createRow(7);
            rCrit1.createCell(15).setCellValue("If CO Marks (%) >= Threshold");
            rCrit1.createCell(18).setCellValue("Y");
            ws.addMergedRegion(new CellRangeAddress(7, 7, 15, 17));
            for (int c = 15; c <= 18; c++) {
                if (rCrit1.getCell(c) != null)
                    rCrit1.getCell(c).setCellStyle(centerCell);
            }

            Row rCrit2 = ws.getRow(8) != null ? ws.getRow(8) : ws.createRow(8);
            rCrit2.createCell(15).setCellValue("If CO Marks (%) < Threshold");
            rCrit2.createCell(18).setCellValue("N");
            ws.addMergedRegion(new CellRangeAddress(8, 8, 15, 17));
            for (int c = 15; c <= 18; c++) {
                if (rCrit2.getCell(c) != null)
                    rCrit2.getCell(c).setCellStyle(centerCell);
            }

            // =========================================================================
            // MAIN ASSESSMENT TABLE
            // Row 13: Top Headers (Student ID, Name, Midterm Exam, Final Exam, CO
            // Attainments)
            // =========================================================================
            List<String> coList = new ArrayList<>(sheet.getCoSummary().keySet());
            int midCount = sheet.getMidtermQuestions().size();
            int finalCount = sheet.getFinalQuestions().size();
            boolean hasFinal = finalCount > 0;

            int midStartCol = 2;
            int midEndCol = midCount > 0 ? (midStartCol + midCount - 1) : midStartCol;
            int midTotalCol = midStartCol + midCount;

            int finalStartCol = hasFinal ? (midTotalCol + 1) : -1;
            int finalEndCol = hasFinal ? (finalStartCol + finalCount - 1) : -1;
            int finalTotalCol = hasFinal ? (finalStartCol + finalCount) : -1;

            int coStartCol = hasFinal ? (finalTotalCol + 1) : (midTotalCol + 1);
            int totalCols = coStartCol + (coList.size() * 2);

            // Row 1 & 2 Title merges
            ws.addMergedRegion(new CellRangeAddress(1, 1, 1, Math.max(15, totalCols - 1)));
            ws.addMergedRegion(new CellRangeAddress(2, 2, 1, Math.max(15, totalCols - 1)));

            // =========================================================================
            // MAIN ASSESSMENT TABLE
            // Row 13: Top Headers (Student ID, Name, Midterm Exam, Final Exam, CO
            // Attainments)
            // =========================================================================
            int startGridRow = 13;

            Row hRow0 = ws.createRow(startGridRow);
            hRow0.createCell(0).setCellValue("Student ID");
            hRow0.createCell(1).setCellValue("Student Name");
            ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow + 3, 0, 0));
            ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow + 3, 1, 1));
            hRow0.getCell(0).setCellStyle(borderBoldCenter);
            hRow0.getCell(1).setCellStyle(borderBoldCenter);

            // Primary Exam Header Block
            String midHeaderTitle = (sheet.getExamTitle() != null && !sheet.getExamTitle().isEmpty())
                    ? sheet.getExamTitle()
                    : (hasFinal ? "Midterm Examination" : "Assessment Questions");
            hRow0.createCell(midStartCol).setCellValue(midHeaderTitle);
            hRow0.getCell(midStartCol).setCellStyle(headerFillMid);
            if (midEndCol > midStartCol) {
                ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow, midStartCol, midEndCol));
            }

            String midTotLabel = (sheet.getExamType() != null && !sheet.getExamType().isEmpty())
                    ? (sheet.getExamType() + " Total")
                    : "Total Marks";
            hRow0.createCell(midTotalCol).setCellValue(midTotLabel);
            hRow0.getCell(midTotalCol).setCellStyle(borderBoldCenter);
            ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow + 2, midTotalCol, midTotalCol));

            // Semester Final Exam Header Block (only if final questions exist)
            if (hasFinal) {
                hRow0.createCell(finalStartCol).setCellValue("Semester Final");
                hRow0.getCell(finalStartCol).setCellStyle(headerFillFinal);
                if (finalEndCol > finalStartCol) {
                    ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow, finalStartCol, finalEndCol));
                }

                hRow0.createCell(finalTotalCol).setCellValue("Total Marks");
                hRow0.getCell(finalTotalCol).setCellStyle(borderBoldCenter);
                ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow + 2, finalTotalCol, finalTotalCol));
            }

            // CO Attainments Header Block
            hRow0.createCell(coStartCol).setCellValue("CO Attainments");
            hRow0.getCell(coStartCol).setCellStyle(headerFillCo);
            if (totalCols - 1 > coStartCol) {
                ws.addMergedRegion(new CellRangeAddress(startGridRow, startGridRow, coStartCol, totalCols - 1));
            }

            // Row 14: Question IDs and CO Headers
            Row hRow1 = ws.createRow(startGridRow + 1);
            for (int i = 0; i < midCount; i++) {
                Cell cell = hRow1.createCell(midStartCol + i);
                cell.setCellValue(sheet.getMidtermQuestions().get(i).getId());
                cell.setCellStyle(borderBoldCenter);
            }
            if (hasFinal) {
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = hRow1.createCell(finalStartCol + i);
                    cell.setCellValue(sheet.getFinalQuestions().get(i).getId());
                    cell.setCellStyle(borderBoldCenter);
                }
            }
            // CO Columns: CO1 Marks (%) | CO1 Met (Y/N) ...
            for (int i = 0; i < coList.size(); i++) {
                String co = coList.get(i);
                int cIdx = coStartCol + (i * 2);
                Cell cMarks = hRow1.createCell(cIdx);
                cMarks.setCellValue(co + " Marks (%)");
                cMarks.setCellStyle(borderBoldCenter);
                ws.addMergedRegion(new CellRangeAddress(startGridRow + 1, startGridRow + 2, cIdx, cIdx));

                Cell cMet = hRow1.createCell(cIdx + 1);
                cMet.setCellValue(co + " Met (Y/N)");
                cMet.setCellStyle(borderBoldCenter);
                ws.addMergedRegion(new CellRangeAddress(startGridRow + 1, startGridRow + 2, cIdx + 1, cIdx + 1));
            }

            // Row 15: Mapped COs
            Row hRow2 = ws.createRow(startGridRow + 2);
            for (int i = 0; i < midCount; i++) {
                Cell cell = hRow2.createCell(midStartCol + i);
                cell.setCellValue(sheet.getMidtermQuestions().get(i).getCoCode());
                cell.setCellStyle(borderBoldCenter);
            }
            if (hasFinal) {
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = hRow2.createCell(finalStartCol + i);
                    cell.setCellValue(sheet.getFinalQuestions().get(i).getCoCode());
                    cell.setCellStyle(borderBoldCenter);
                }
            }

            // Row 16: Max Marks
            Row hRow3 = ws.createRow(startGridRow + 3);
            double midMaxSum = 0;
            for (int i = 0; i < midCount; i++) {
                Cell cell = hRow3.createCell(midStartCol + i);
                double mm = sheet.getMidtermQuestions().get(i).getMaxMarks();
                midMaxSum += mm;
                cell.setCellValue((int) mm);
                cell.setCellStyle(borderBoldCenter);
            }
            // Mid Total Max
            Cell cellMidMax = hRow3.createCell(midTotalCol);
            cellMidMax.setCellValue((int) midMaxSum);
            cellMidMax.setCellStyle(borderBoldCenter);

            if (hasFinal) {
                double finalMaxSum = 0;
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = hRow3.createCell(finalStartCol + i);
                    double mm = sheet.getFinalQuestions().get(i).getMaxMarks();
                    finalMaxSum += mm;
                    cell.setCellValue((int) mm);
                    cell.setCellStyle(borderBoldCenter);
                }
                // Final Total Max
                Cell cellFinalMax = hRow3.createCell(finalTotalCol);
                cellFinalMax.setCellValue((int) finalMaxSum);
                cellFinalMax.setCellStyle(borderBoldCenter);
            }

            // Row 17 onwards: Student Data Rows
            int dataStartRow = startGridRow + 4;
            for (int sIdx = 0; sIdx < sheet.getStudents().size(); sIdx++) {
                StudentRowDto st = sheet.getStudents().get(sIdx);
                Row row = ws.createRow(dataStartRow + sIdx);

                Cell cId = row.createCell(0);
                cId.setCellValue(st.getStudentId());
                cId.setCellStyle(centerCell);

                Cell cName = row.createCell(1);
                cName.setCellValue(st.getStudentName());
                cName.setCellStyle(centerCell);

                // Mid scores
                for (int i = 0; i < midCount; i++) {
                    String qId = sheet.getMidtermQuestions().get(i).getId();
                    String score = st.getMidScores() != null ? st.getMidScores().getOrDefault(qId, "-") : "-";
                    Cell cScore = row.createCell(midStartCol + i);
                    cScore.setCellValue(score != null && !score.isEmpty() ? score : "-");
                    cScore.setCellStyle(centerCell);
                }

                // Mid Total
                Cell cMidTot = row.createCell(midTotalCol);
                if (st.isAttempted() && st.getMidTotal() != null) {
                    cMidTot.setCellValue(String.valueOf(st.getMidTotal().intValue()));
                } else {
                    cMidTot.setCellValue("-");
                }
                cMidTot.setCellStyle(borderBoldCenter);

                // Final scores
                if (hasFinal) {
                    for (int i = 0; i < finalCount; i++) {
                        String qId = sheet.getFinalQuestions().get(i).getId();
                        String score = st.getFinalScores() != null ? st.getFinalScores().getOrDefault(qId, "-") : "-";
                        Cell cScore = row.createCell(finalStartCol + i);
                        cScore.setCellValue(score != null && !score.isEmpty() ? score : "-");
                        cScore.setCellStyle(centerCell);
                    }

                    // Final Total
                    Cell cFinalTot = row.createCell(finalTotalCol);
                    if (st.isAttempted() && st.getFinalTotal() != null) {
                        cFinalTot.setCellValue(String.valueOf(st.getFinalTotal().intValue()));
                    } else {
                        cFinalTot.setCellValue("-");
                    }
                    cFinalTot.setCellStyle(borderBoldCenter);
                }

                // CO Attainments
                for (int i = 0; i < coList.size(); i++) {
                    String co = coList.get(i);
                    Double pct = (st.getCoMarksPercent() != null) ? st.getCoMarksPercent().get(co) : null;
                    String met = (st.getCoMetStatus() != null) ? st.getCoMetStatus().get(co) : "-";

                    int cIdx = coStartCol + (i * 2);
                    Cell cPct = row.createCell(cIdx);
                    if (st.isAttempted() && pct != null) {
                        cPct.setCellValue((int) Math.round(pct) + "%");
                    } else {
                        cPct.setCellValue("-");
                    }
                    cPct.setCellStyle(centerCell);

                    Cell cMet = row.createCell(cIdx + 1);
                    cMet.setCellValue(st.isAttempted() && met != null ? met : "-");
                    cMet.setCellStyle(centerCell);
                }
            }

            // Summary Rows directly under students (Method B Question Level)
            int sumRowIdx = dataStartRow + sheet.getStudents().size();

            // Row 1: No. of Students Who Attempted
            Row rAtt = ws.createRow(sumRowIdx);
            Cell cAttLabel = rAtt.createCell(0);
            cAttLabel.setCellValue("No. of Students Who Attempted");
            cAttLabel.setCellStyle(borderBoldCenter);
            ws.addMergedRegion(new CellRangeAddress(sumRowIdx, sumRowIdx, 0, 1));
            for (int i = 0; i < midCount; i++) {
                Cell cell = rAtt.createCell(midStartCol + i);
                cell.setCellValue(sheet.getMidtermQuestions().get(i).getAttemptedCount());
                cell.setCellStyle(borderBoldCenter);
            }
            if (hasFinal) {
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = rAtt.createCell(finalStartCol + i);
                    cell.setCellValue(sheet.getFinalQuestions().get(i).getAttemptedCount());
                    cell.setCellStyle(borderBoldCenter);
                }
            }

            // CO Achieved Count on same row
            rAtt.createCell(coStartCol).setCellValue("No. students achieved CO");
            rAtt.getCell(coStartCol).setCellStyle(borderBoldCenter);
            for (int i = 0; i < coList.size(); i++) {
                String co = coList.get(i);
                int achieved = sheet.getCoSummary().get(co) != null ? sheet.getCoSummary().get(co).getAchievedCount()
                        : 0;
                Cell c = rAtt.createCell(coStartCol + 1 + (i * 2));
                c.setCellValue(achieved);
                c.setCellStyle(borderBoldCenter);
            }

            // Row 2: Threshold Marks for each question
            sumRowIdx++;
            Row rThresh = ws.createRow(sumRowIdx);
            Cell cThreshLabel = rThresh.createCell(0);
            cThreshLabel.setCellValue("Threshold Marks for each question");
            cThreshLabel.setCellStyle(borderBoldCenter);
            ws.addMergedRegion(new CellRangeAddress(sumRowIdx, sumRowIdx, 0, 1));
            for (int i = 0; i < midCount; i++) {
                Cell cell = rThresh.createCell(midStartCol + i);
                double t = sheet.getMidtermQuestions().get(i).getThresholdMarks();
                cell.setCellValue(t == (int) t ? String.valueOf((int) t) : String.valueOf(t));
                cell.setCellStyle(borderBoldCenter);
            }
            if (hasFinal) {
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = rThresh.createCell(finalStartCol + i);
                    double t = sheet.getFinalQuestions().get(i).getThresholdMarks();
                    cell.setCellValue(t == (int) t ? String.valueOf((int) t) : String.valueOf(t));
                    cell.setCellStyle(borderBoldCenter);
                }
            }

            // % students achieved CO on same row
            rThresh.createCell(coStartCol).setCellValue("% students achieved CO");
            rThresh.getCell(coStartCol).setCellStyle(borderBoldCenter);
            for (int i = 0; i < coList.size(); i++) {
                String co = coList.get(i);
                double pct = sheet.getCoSummary().get(co) != null ? sheet.getCoSummary().get(co).getAchievedPercent()
                        : 0.0;
                Cell c = rThresh.createCell(coStartCol + 1 + (i * 2));
                c.setCellValue((int) Math.round(pct) + "%");
                c.setCellStyle(borderBoldCenter);
            }

            // Row 3: No. of Students Who got >=50%
            sumRowIdx++;
            Row rPassed = ws.createRow(sumRowIdx);
            Cell cPassedLabel = rPassed.createCell(0);
            cPassedLabel.setCellValue("No. of Students Who got >=50%");
            cPassedLabel.setCellStyle(borderBoldCenter);
            ws.addMergedRegion(new CellRangeAddress(sumRowIdx, sumRowIdx, 0, 1));
            for (int i = 0; i < midCount; i++) {
                Cell cell = rPassed.createCell(midStartCol + i);
                cell.setCellValue(sheet.getMidtermQuestions().get(i).getPassedCount());
                cell.setCellStyle(borderBoldCenter);
            }
            if (hasFinal) {
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = rPassed.createCell(finalStartCol + i);
                    cell.setCellValue(sheet.getFinalQuestions().get(i).getPassedCount());
                    cell.setCellStyle(borderBoldCenter);
                }
            }

            // CO Results on same row
            rPassed.createCell(coStartCol).setCellValue("CO Results");
            rPassed.getCell(coStartCol).setCellStyle(borderBoldCenter);
            for (int i = 0; i < coList.size(); i++) {
                String co = coList.get(i);
                String res = sheet.getCoSummary().get(co) != null ? sheet.getCoSummary().get(co).getResult() : "N";
                Cell c = rPassed.createCell(coStartCol + 1 + (i * 2));
                c.setCellValue(res);
                c.setCellStyle(borderBoldCenter);
            }

            // Row 4: Percentage of Students Who got >=50%
            sumRowIdx++;
            Row rPassPct = ws.createRow(sumRowIdx);
            Cell cPassPctLabel = rPassPct.createCell(0);
            cPassPctLabel.setCellValue("Percentage of Students Who got >=50%");
            cPassPctLabel.setCellStyle(borderBoldCenter);
            ws.addMergedRegion(new CellRangeAddress(sumRowIdx, sumRowIdx, 0, 1));
            for (int i = 0; i < midCount; i++) {
                Cell cell = rPassPct.createCell(midStartCol + i);
                cell.setCellValue((int) Math.round(sheet.getMidtermQuestions().get(i).getPassPercentage()) + "%");
                cell.setCellStyle(borderBoldCenter);
            }
            if (hasFinal) {
                for (int i = 0; i < finalCount; i++) {
                    Cell cell = rPassPct.createCell(finalStartCol + i);
                    cell.setCellValue((int) Math.round(sheet.getFinalQuestions().get(i).getPassPercentage()) + "%");
                    cell.setCellStyle(borderBoldCenter);
                }
            }

            // =========================================================================
            // PO ATTAINMENT CALCULATION TABLE (Bottom Section)
            // =========================================================================
            sumRowIdx += 3;
            Row rPoTitle = ws.createRow(sumRowIdx);
            Cell cPoTitle = rPoTitle.createCell(2);
            cPoTitle.setCellValue("PO Attainment Calculation");
            cPoTitle.setCellStyle(subTitleStyle);
            ws.addMergedRegion(new CellRangeAddress(sumRowIdx, sumRowIdx, 2, 16));

            sumRowIdx++;
            Row rPoHeaders = ws.createRow(sumRowIdx);
            rPoHeaders.createCell(2).setCellValue("CO's");
            rPoHeaders.createCell(3).setCellValue("CO Results");
            rPoHeaders.getCell(2).setCellStyle(borderBoldCenter);
            rPoHeaders.getCell(3).setCellStyle(borderBoldCenter);

            String[] poHeaders = { "PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11",
                    "PO12" };
            for (int p = 0; p < poHeaders.length; p++) {
                Cell cell = rPoHeaders.createCell(4 + p);
                cell.setCellValue(poHeaders[p]);
                cell.setCellStyle(borderBoldCenter);
            }

            // Map to calculate PO sums
            Map<String, Double> poAttainedSum = new HashMap<>();
            Map<String, Double> poTotalSum = new HashMap<>();

            for (PoAttainmentRow pr : sheet.getPoAttainments()) {
                sumRowIdx++;
                Row row = ws.createRow(sumRowIdx);
                row.createCell(2).setCellValue(pr.getCoCode());
                row.createCell(3).setCellValue(pr.getCoResult());
                row.getCell(2).setCellStyle(centerCell);
                row.getCell(3).setCellStyle(centerCell);

                boolean isAttained = "Y".equalsIgnoreCase(pr.getCoResult());

                for (int p = 0; p < poHeaders.length; p++) {
                    String po = poHeaders[p];
                    Integer w = pr.getPoWeights().get(po);
                    Cell cell = row.createCell(4 + p);
                    if (w != null && w > 0) {
                        cell.setCellValue(w);
                        poTotalSum.put(po, poTotalSum.getOrDefault(po, 0.0) + w);
                        if (isAttained) {
                            poAttainedSum.put(po, poAttainedSum.getOrDefault(po, 0.0) + w);
                        }
                    } else {
                        cell.setCellValue("");
                    }
                    cell.setCellStyle(centerCell);
                }
            }

            // Bottom PO Attainment Percentage Row
            sumRowIdx++;
            Row rPoFinal = ws.createRow(sumRowIdx);
            Cell cPoFinalLabel = rPoFinal.createCell(2);
            cPoFinalLabel.setCellValue("PO Attainment");
            cPoFinalLabel.setCellStyle(headerFillCo);
            ws.addMergedRegion(new CellRangeAddress(sumRowIdx, sumRowIdx, 2, 3));

            for (int p = 0; p < poHeaders.length; p++) {
                String po = poHeaders[p];
                double tot = poTotalSum.getOrDefault(po, 0.0);
                double att = poAttainedSum.getOrDefault(po, 0.0);
                Cell cell = rPoFinal.createCell(4 + p);
                if (tot > 0) {
                    double pct = Math.round((att / tot) * 100.0);
                    cell.setCellValue((int) pct + "%");
                } else {
                    cell.setCellValue("");
                }
                cell.setCellStyle(headerFillMid);
            }

            // Adjust columns
            for (int c = 0; c <= 26; c++) {
                ws.autoSizeColumn(c);
            }

            wb.write(out);
            return out.toByteArray();
        }
    }
}
