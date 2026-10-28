package com.obe.copo.serviceImpl;

import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.dto.SheetAssessmentDto;
import com.obe.copo.model.Course;
import com.obe.copo.model.ExamAssessment;
import com.obe.copo.model.StudentMarksRecord;
import com.obe.copo.repository.CourseRepository;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.repository.StudentMarksRecordRepository;
import com.obe.copo.service.AssessmentCalculationService;
import com.obe.copo.service.AssessmentSheetService;
import com.obe.copo.service.AttainmentCalculationService;
import com.obe.copo.service.ExamService;
import com.obe.copo.service.PdfReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AssessmentSheetServiceImpl implements AssessmentSheetService {

    @Autowired
    private AssessmentCalculationService calculationService;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Autowired
    private StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired
    private ExamService examService;

    @Autowired
    private AttainmentCalculationService attainmentCalculationService;

    @Autowired
    private PdfReportService pdfReportService;

    @Override
    public SheetAssessmentDto getDefaultTemplate() {
        return calculationService.getDefaultTemplateData();
    }

    @Override
    public SheetAssessmentDto getTemplateForCourse(String courseId, String examId, String examType) {
        Course course = null;
        if (courseId != null && !courseId.trim().isEmpty() && !"null".equalsIgnoreCase(courseId) && !"undefined".equalsIgnoreCase(courseId)) {
            course = courseRepository.findById(courseId)
                    .or(() -> courseRepository.findByCourseCode(courseId))
                    .orElse(null);
        }
        if (course == null) {
            List<Course> all = courseRepository.findAll();
            if (!all.isEmpty()) {
                course = all.get(0);
            }
        }
        if (course == null) {
            return calculationService.getDefaultTemplateData();
        }

        ExamAssessment targetExam = null;
        if (examId != null && !examId.trim().isEmpty() && !"ALL".equalsIgnoreCase(examId) && !"undefined".equalsIgnoreCase(examId)) {
            ExamAssessment found = examAssessmentRepository.findById(examId).orElse(null);
            if (found != null && course.getId() != null && course.getId().equals(found.getCourseId())) {
                targetExam = found;
            }
        }

        if (targetExam == null && course.getId() != null) {
            List<ExamAssessment> exams = examAssessmentRepository.findByCourseId(course.getId());
            if (examType != null && !examType.trim().isEmpty()) {
                targetExam = exams.stream()
                        .filter(e -> isCategoryMatch(e, examType))
                        .findFirst()
                        .orElse(null);
            }
            if (targetExam == null && !exams.isEmpty()) {
                targetExam = exams.get(0);
            }
        }

        // If no exam exists yet, auto-provision one with question-to-CO mapping
        if (targetExam == null) {
            targetExam = createDefaultExamForCourse(course, (examType != null && !examType.isBlank()) ? examType : "IA 1");
        }

        SheetAssessmentDto sheet = calculationService.generateTemplateForCourse(course, List.of(targetExam));

        // Populate previous marks from database if they exist for this exam
        if (targetExam != null && targetExam.getId() != null) {
            List<StudentMarksRecord> savedRecords = studentMarksRecordRepository.findByExamId(targetExam.getId());
            if (savedRecords != null && !savedRecords.isEmpty()) {
                Map<String, StudentMarksRecord> recordMap = new HashMap<>();
                for (StudentMarksRecord r : savedRecords) {
                    if (r.getStudentUsn() != null) {
                        recordMap.put(r.getStudentUsn().trim(), r);
                    }
                }

                boolean populateFinal = (sheet.getFinalQuestions() != null && !sheet.getFinalQuestions().isEmpty());

                boolean hasAnyMarks = false;
                if (sheet.getStudents() != null) {
                    for (SheetAssessmentDto.StudentRowDto st : sheet.getStudents()) {
                        if (st.getStudentId() != null) {
                            StudentMarksRecord r = recordMap.get(st.getStudentId().trim());
                            if (r != null && r.getSubQuestionScores() != null && !r.getSubQuestionScores().isEmpty()) {
                                hasAnyMarks = true;
                                Map<String, String> scoreMap = populateFinal ? st.getFinalScores() : st.getMidScores();
                                if (scoreMap == null) {
                                    scoreMap = new LinkedHashMap<>();
                                    if (populateFinal) st.setFinalScores(scoreMap);
                                    else st.setMidScores(scoreMap);
                                }
                                for (Map.Entry<String, Double> entry : r.getSubQuestionScores().entrySet()) {
                                    Double val = entry.getValue();
                                    if (val != null) {
                                        String formatted = (val % 1.0 == 0)
                                                ? String.valueOf(val.intValue())
                                                : String.valueOf(val);
                                        scoreMap.put(entry.getKey(), formatted);
                                    }
                                }
                            }
                        }
                    }
                }

                if (hasAnyMarks) {
                    sheet = calculationService.calculateAssessmentSheet(sheet);
                }
            }
        }

        return sheet;
    }

    private boolean isCategoryMatch(ExamAssessment e, String type) {
        if (e == null || type == null) return false;
        String et = (e.getExamType() != null ? e.getExamType() : "").toUpperCase();
        String t = (e.getTitle() != null ? e.getTitle() : "").toUpperCase();
        String target = type.toUpperCase().trim();

        if (target.contains("2")) {
            return et.contains("2") || t.contains("2") || t.contains("TEST - 2") || t.contains("TEST 2");
        }
        if (target.contains("SEM") || target.contains("FINAL") || target.contains("END")) {
            return et.contains("SEM") || et.contains("FINAL") || et.contains("END") || t.contains("SEM") || t.contains("FINAL");
        }
        return (et.contains("1") || t.contains("1") || t.contains("TEST - 1") || t.contains("TEST 1") || et.contains("IAT-1")) && !et.contains("2") && !t.contains("2");
    }

    private ExamAssessment createDefaultExamForCourse(Course course, String examType) {
        ExamAssessment ex = new ExamAssessment();
        ex.setCourseId(course.getId());
        boolean isIa2 = examType != null && examType.toUpperCase().contains("2");
        boolean isFinal = examType != null && (examType.toUpperCase().contains("SEM") || examType.toUpperCase().contains("FINAL") || examType.toUpperCase().contains("END"));

        if (isIa2) {
            ex.setExamType("IAT-2");
            ex.setTitle("Internal Assessment Test - 2");
            ex.setMaxMarks(30.0);
        } else if (isFinal) {
            ex.setExamType("SEMESTER_END");
            ex.setTitle("Semester Final Examination");
            ex.setMaxMarks(50.0);
        } else {
            ex.setExamType("IAT-1");
            ex.setTitle("Internal Assessment Test - 1");
            ex.setMaxMarks(40.0);
        }

        List<com.obe.copo.model.QuestionConfig> qs = new ArrayList<>();
        int qCount = isIa2 ? 4 : (isFinal ? 6 : 5);
        int coCount = (course.getCourseOutcomes() != null && !course.getCourseOutcomes().isEmpty())
                ? course.getCourseOutcomes().size()
                : 5;

        for (int i = 1; i <= qCount; i++) {
            com.obe.copo.model.QuestionConfig q = new com.obe.copo.model.QuestionConfig();
            q.setQuestionId("Q" + i);
            q.setQuestionNumber(i);
            q.setLabel("Question " + i);
            int coIdx = isIa2 ? ((i + 1) % coCount) : ((i - 1) % coCount);
            String co = (course.getCourseOutcomes() != null && coIdx < course.getCourseOutcomes().size())
                    ? course.getCourseOutcomes().get(coIdx).getCoCode()
                    : "CO" + (coIdx + 1);
            q.setCoCode(co);
            q.setDirectMaxMarks(10.0);

            com.obe.copo.model.SubQuestionConfig sq1 = new com.obe.copo.model.SubQuestionConfig();
            sq1.setSubQuestionId("Q" + i + "a");
            sq1.setParentQuestionId("Q" + i);
            sq1.setLabel(i + ".(a)");
            sq1.setMaxMarks(5.0);
            sq1.setCoCode(co);
            sq1.setBloomsLevel("L2");

            com.obe.copo.model.SubQuestionConfig sq2 = new com.obe.copo.model.SubQuestionConfig();
            sq2.setSubQuestionId("Q" + i + "b");
            sq2.setParentQuestionId("Q" + i);
            sq2.setLabel(i + ".(b)");
            sq2.setMaxMarks(5.0);
            sq2.setCoCode(co);
            sq2.setBloomsLevel("L3");

            q.setSubQuestions(List.of(sq1, sq2));
            qs.add(q);
        }
        ex.setQuestions(qs);
        try {
            return examAssessmentRepository.save(ex);
        } catch (Exception err) {
            return ex;
        }
    }

    @Override
    public SheetAssessmentDto calculateSheet(SheetAssessmentDto input) {
        return saveAssessmentSheetMarks(input);
    }

    @Override
    public SheetAssessmentDto saveAssessmentSheetMarks(SheetAssessmentDto input) {
        // 1. Calculate the sheet
        SheetAssessmentDto calculated = calculationService.calculateAssessmentSheet(input);

        // 2. Resolve target course and exam strictly
        Course course = null;
        if (input.getCourseCode() != null && !input.getCourseCode().trim().isEmpty()) {
            course = courseRepository.findByCourseCode(input.getCourseCode())
                    .or(() -> courseRepository.findById(input.getCourseCode()))
                    .orElse(null);
        }

        ExamAssessment exam = null;
        if (input.getExamId() != null && !input.getExamId().trim().isEmpty()) {
            ExamAssessment found = examAssessmentRepository.findById(input.getExamId()).orElse(null);
            if (found != null && (course == null || course.getId().equals(found.getCourseId()))) {
                exam = found;
            }
        }
        if (exam == null && course != null) {
            List<ExamAssessment> exams = examAssessmentRepository.findByCourseId(course.getId());
            if (input.getExamType() != null && !input.getExamType().trim().isEmpty()) {
                exam = exams.stream()
                        .filter(e -> isCategoryMatch(e, input.getExamType()))
                        .findFirst()
                        .orElse(null);
            }
            if (exam == null && !exams.isEmpty()) {
                exam = exams.get(0);
            }
        }

        // 3. Save student marks records to MongoDB
        if (exam != null && input.getStudents() != null) {
            studentMarksRecordRepository.deleteByExamId(exam.getId());

            List<StudentMarksRecord> records = new ArrayList<>();
            for (SheetAssessmentDto.StudentRowDto st : input.getStudents()) {
                if (st.getStudentId() == null || st.getStudentId().trim().isEmpty()) continue;

                Map<String, Double> subScores = new HashMap<>();
                if (st.getMidScores() != null) {
                    st.getMidScores().forEach((qId, val) -> {
                        if (val != null && !val.trim().isEmpty() && !"-".equals(val.trim())) {
                            try {
                                subScores.put(qId, Double.parseDouble(val.trim()));
                            } catch (NumberFormatException ignored) {}
                        }
                    });
                }
                if (st.getFinalScores() != null) {
                    st.getFinalScores().forEach((qId, val) -> {
                        if (val != null && !val.trim().isEmpty() && !"-".equals(val.trim())) {
                            try {
                                subScores.put(qId, Double.parseDouble(val.trim()));
                            } catch (NumberFormatException ignored) {}
                        }
                    });
                }

                EvaluationResult evalResult = examService.evaluateStudentMarks(exam, subScores);

                StudentMarksRecord rec = StudentMarksRecord.builder()
                        .courseId(exam.getCourseId())
                        .examId(exam.getId())
                        .studentUsn(st.getStudentId().trim())
                        .studentName(st.getStudentName() != null ? st.getStudentName().trim() : "Student")
                        .subQuestionScores(subScores)
                        .mainQuestionScores(evalResult.getMainQuestionScores())
                        .selectedQuestionIds(evalResult.getSelectedQuestionIds())
                        .ignoredQuestionIds(evalResult.getIgnoredQuestionIds())
                        .totalScore(evalResult.getTotalScore())
                        .evaluationSteps(evalResult.getEvaluationSteps())
                        .build();
                records.add(rec);
            }

            if (!records.isEmpty()) {
                studentMarksRecordRepository.saveAll(records);
                try {
                    attainmentCalculationService.calculateExamAttainment(exam.getId());
                } catch (Exception ignored) {}
            }
        }

        return calculated;
    }

    @Override
    public byte[] exportExcel(SheetAssessmentDto input) throws Exception {
        return calculationService.generateAssessmentExcel(input);
    }

    @Override
    public byte[] exportPdf(SheetAssessmentDto input) throws Exception {
        return pdfReportService.generateAssessmentPdf(input);
    }
}
