package com.obe.copo.serviceImpl;

import com.obe.copo.service.AttainmentCalculationService;

import com.obe.copo.model.*;
import com.obe.copo.repository.AttainmentReportRepository;
import com.obe.copo.repository.CourseRepository;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.repository.StudentMarksRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AttainmentCalculationServiceImpl implements AttainmentCalculationService {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Autowired
    private StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired
    private AttainmentReportRepository attainmentReportRepository;

    /**
     * Calculates the complete NBA CO-PO Attainment Report for an Exam
     */
    @Override
    public AttainmentReport calculateExamAttainment(String examId) {
        ExamAssessment exam = examAssessmentRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found with id: " + examId));

        Course course = courseRepository.findById(exam.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + exam.getCourseId()));

        List<StudentMarksRecord> records = studentMarksRecordRepository.findByExamId(examId);
        int totalStudents = records.size();

        double courseTargetThreshold = course.getTargetThresholdPercent(); // e.g. 50.0%
        double questionThresholdPercent = course.getQuestionThresholdPercent() > 0 ?
                course.getQuestionThresholdPercent() : 50.0; // default 50%

        // Collect all sub-questions from exam
        List<SubQuestionConfig> allSubQuestions = new ArrayList<>();
        Map<String, Double> subQMaxMarks = new HashMap<>();
        Map<String, String> subQToCo = new HashMap<>();

        for (QuestionConfig qc : exam.getQuestions()) {
            if (qc.getSubQuestions() != null && !qc.getSubQuestions().isEmpty()) {
                for (SubQuestionConfig sqc : qc.getSubQuestions()) {
                    allSubQuestions.add(sqc);
                    subQMaxMarks.put(sqc.getSubQuestionId(), sqc.getMaxMarks());
                    subQToCo.put(sqc.getSubQuestionId(), sqc.getCoCode());
                }
            } else {
                // Main question acts as sub-question
                SubQuestionConfig dummy = new SubQuestionConfig(
                        qc.getQuestionId(), qc.getQuestionId(), qc.getLabel(),
                        qc.getTotalMaxMarks() > 0 ? qc.getTotalMaxMarks() : 10.0,
                        "CO1", "L2"
                );
                allSubQuestions.add(dummy);
                subQMaxMarks.put(dummy.getSubQuestionId(), dummy.getMaxMarks());
                subQToCo.put(dummy.getSubQuestionId(), dummy.getCoCode());
            }
        }

        // ====================================================================
        // METHOD B: Question-Level Threshold Aggregate
        // % Pass(Q_j) = (Count(Score >= T_Q) / Total Attempted) * 100%
        // ====================================================================
        List<QuestionAttainmentSummary> questionAttainments = new ArrayList<>();

        for (SubQuestionConfig sqc : allSubQuestions) {
            String qId = sqc.getSubQuestionId();
            double maxMarks = sqc.getMaxMarks();
            double thresholdMarks = maxMarks * (questionThresholdPercent / 100.0);

            int attemptedCount = 0;
            int passedCount = 0;

            for (StudentMarksRecord record : records) {
                Double score = record.getSubQuestionScores().get(qId);
                if (score != null) {
                    attemptedCount++;
                    if (score >= thresholdMarks) {
                        passedCount++;
                    }
                }
            }

            double passPercent = attemptedCount > 0 ? ((double) passedCount / attemptedCount) * 100.0 : 0.0;

            QuestionAttainmentSummary qSum = new QuestionAttainmentSummary(
                    qId,
                    sqc.getLabel() != null ? sqc.getLabel() : qId,
                    sqc.getCoCode(),
                    maxMarks,
                    thresholdMarks,
                    attemptedCount,
                    passedCount,
                    Math.round(passPercent * 100.0) / 100.0
            );
            questionAttainments.add(qSum);
        }

        // ====================================================================
        // 2. Compute Individual Student CO Performance
        // CO_k Marks % (S_i) = (Sum Score(S_i, Q) / Sum MaxMarks(Q)) * 100%
        // Met(S_i) = "Y" if % >= T_course, else "N"
        // ====================================================================
        Map<String, Double> coTotalPossibleMarks = new HashMap<>();
        for (SubQuestionConfig sqc : allSubQuestions) {
            String co = sqc.getCoCode();
            coTotalPossibleMarks.put(co, coTotalPossibleMarks.getOrDefault(co, 0.0) + sqc.getMaxMarks());
        }

        // Map to track count of students who met each CO
        Map<String, Integer> coStudentsMetCount = new HashMap<>();
        Map<String, Double> coTotalScoreAccumulator = new HashMap<>();
        Map<String, Integer> coStudentEvaluatedCount = new HashMap<>();

        for (StudentMarksRecord record : records) {
            Map<String, Double> studentCoScores = new HashMap<>();
            for (Map.Entry<String, Double> entry : record.getSubQuestionScores().entrySet()) {
                String qId = entry.getKey();
                Double score = entry.getValue();
                if (score != null) {
                    String co = subQToCo.get(qId);
                    if (co != null) {
                        studentCoScores.put(co, studentCoScores.getOrDefault(co, 0.0) + score);
                    }
                }
            }

            Map<String, StudentCoPerformance> perfMap = new HashMap<>();
            for (Map.Entry<String, Double> coEntry : coTotalPossibleMarks.entrySet()) {
                String coCode = coEntry.getKey();
                double maxPossible = coEntry.getValue();
                double scored = studentCoScores.getOrDefault(coCode, 0.0);
                double percent = maxPossible > 0 ? (scored / maxPossible) * 100.0 : 0.0;
                boolean isMet = percent >= courseTargetThreshold;

                StudentCoPerformance perf = new StudentCoPerformance(
                        coCode,
                        scored,
                        maxPossible,
                        Math.round(percent * 100.0) / 100.0,
                        isMet
                );
                perfMap.put(coCode, perf);

                if (isMet) {
                    coStudentsMetCount.put(coCode, coStudentsMetCount.getOrDefault(coCode, 0) + 1);
                }
                coTotalScoreAccumulator.put(coCode, coTotalScoreAccumulator.getOrDefault(coCode, 0.0) + percent);
                coStudentEvaluatedCount.put(coCode, coStudentEvaluatedCount.getOrDefault(coCode, 0) + 1);
            }
            record.setCoPerformances(perfMap);
            studentMarksRecordRepository.save(record);
        }

        // ====================================================================
        // METHOD A: Student-Centric CO Target Attainment
        // % Students Achieved CO_k = (Count(Met == "Y") / TotalStudents) * 100%
        // Final CO_k Result = "Y" if % >= T_course, else "N"
        // Direct Attainment Level: 3 (>=70%), 2 (>=60%), 1 (>=50%), 0 (<50%)
        // ====================================================================
        List<CoAttainmentSummary> coAttainments = new ArrayList<>();
        Set<String> attainedCoCodes = new HashSet<>();

        // Collect all course outcomes from course or from exam subquestions
        List<CourseOutcome> courseOutcomes = course.getCourseOutcomes();
        if (courseOutcomes == null || courseOutcomes.isEmpty()) {
            courseOutcomes = new ArrayList<>();
            for (String coCode : coTotalPossibleMarks.keySet()) {
                courseOutcomes.add(new CourseOutcome(coCode, "Course Outcome " + coCode, courseTargetThreshold));
            }
        }

        for (CourseOutcome co : courseOutcomes) {
            String coCode = co.getCoCode();
            double target = co.getTargetPercent() > 0 ? co.getTargetPercent() : courseTargetThreshold;
            int metCount = coStudentsMetCount.getOrDefault(coCode, 0);

            double achievedPercent = totalStudents > 0 ?
                    ((double) metCount / totalStudents) * 100.0 : 0.0;
            achievedPercent = Math.round(achievedPercent * 100.0) / 100.0;

            String finalResult = achievedPercent >= target ? "Y" : "N";
            if ("Y".equals(finalResult)) {
                attainedCoCodes.add(coCode);
            }

            int directLevel = 0;
            if (achievedPercent >= 70.0) {
                directLevel = 3;
            } else if (achievedPercent >= 60.0) {
                directLevel = 2;
            } else if (achievedPercent >= 50.0) {
                directLevel = 1;
            }

            int evalCount = coStudentEvaluatedCount.getOrDefault(coCode, 0);
            double avgPercent = evalCount > 0 ?
                    (coTotalScoreAccumulator.getOrDefault(coCode, 0.0) / evalCount) : 0.0;

            CoAttainmentSummary coSummary = new CoAttainmentSummary();
            coSummary.setCoCode(coCode);
            coSummary.setDescription(co.getDescription());
            coSummary.setTargetPercent(target);
            coSummary.setTotalStudents(totalStudents);
            coSummary.setStudentsMetCount(metCount);
            coSummary.setStudentsMetPercent(achievedPercent);
            coSummary.setFinalResult(finalResult);
            coSummary.setDirectAttainmentLevel(directLevel);
            coSummary.setAverageMarksPercent(Math.round(avgPercent * 100.0) / 100.0);

            coAttainments.add(coSummary);
        }

        // ====================================================================
        // PO Attainment Formula (Weighted Average based on Articulation Matrix):
        // 1. Sum of Weightages for PO_m = Sum_{All mapped CO_k} Wt(CO_k, PO_m)
        // 2. Individual CO Contribution = (CO_AT_k * Wt_km) / SumOfWeightages
        // 3. Total PO_m Attainment = Sum_{CO_k} [ (CO_AT_k * Wt_km) / SumOfWeightages ]
        //                          = [ Sum_{CO_k} (CO_AT_k * Wt_km) ] / SumOfWeightages
        // ====================================================================
        Map<String, Double> coAttainmentLevelMap = new HashMap<>();
        for (CoAttainmentSummary cs : coAttainments) {
            double lvl = cs.getDirectAttainmentLevel();
            if (lvl <= 0 && cs.getStudentsMetPercent() > 0) {
                if (cs.getStudentsMetPercent() >= 70.0) lvl = 3.0;
                else if (cs.getStudentsMetPercent() >= 60.0) lvl = 2.0;
                else if (cs.getStudentsMetPercent() >= 50.0) lvl = 1.0;
            }
            coAttainmentLevelMap.put(cs.getCoCode(), lvl);
        }

        List<PoAttainmentSummary> poAttainments = new ArrayList<>();
        List<CoPoMapping> mappings = course.getCoPoMappings() != null ?
                course.getCoPoMappings() : new ArrayList<>();

        // Group mappings by PO code
        Map<String, List<CoPoMapping>> poMapGroup = new LinkedHashMap<>();
        // Standard NBA POs: PO1 through PO12, PSO1, PSO2
        List<String> standardPos = Arrays.asList(
                "PO1", "PO2", "PO3", "PO4", "PO5", "PO6",
                "PO7", "PO8", "PO9", "PO10", "PO11", "PO12",
                "PSO1", "PSO2"
        );
        for (String po : standardPos) {
            poMapGroup.put(po, new ArrayList<>());
        }
        for (CoPoMapping m : mappings) {
            if (m.getPoCode() != null && m.getLevel() > 0) {
                poMapGroup.computeIfAbsent(m.getPoCode(), k -> new ArrayList<>()).add(m);
            }
        }

        for (Map.Entry<String, List<CoPoMapping>> entry : poMapGroup.entrySet()) {
            String poCode = entry.getKey();
            List<CoPoMapping> poMappings = entry.getValue();

            // 1. Calculate sum of weightages (sum of Wt from articulation matrix)
            double sumOfWeightages = 0.0;
            for (CoPoMapping m : poMappings) {
                sumOfWeightages += m.getLevel();
            }

            // 2. Calculate sum of (weightage * co_att_lvl) and individual contributions
            double sumWeightXCoAtt = 0.0;
            List<PoAttainmentSummary.CoPoContribution> contributions = new ArrayList<>();

            for (CoPoMapping m : poMappings) {
                int wt = m.getLevel();
                double coAttLvl = coAttainmentLevelMap.getOrDefault(m.getCoCode(), 0.0);
                double coPoAt = sumOfWeightages > 0 ? (coAttLvl * wt) / sumOfWeightages : 0.0;
                coPoAt = Math.round(coPoAt * 100.0) / 100.0;

                sumWeightXCoAtt += (coAttLvl * wt);

                contributions.add(new PoAttainmentSummary.CoPoContribution(
                        m.getCoCode(),
                        coAttLvl,
                        wt,
                        coPoAt
                ));
            }

            // Total PO Attainment: sum of all PO AT values (sumWeightXCoAtt / sumOfWeightages)
            double poAttainment = sumOfWeightages > 0 ? (sumWeightXCoAtt / sumOfWeightages) : 0.0;
            poAttainment = Math.round(poAttainment * 100.0) / 100.0;

            // Target threshold comparison
            double targetScale = courseTargetThreshold > 3.0 ? (courseTargetThreshold / 100.0) * 3.0 : courseTargetThreshold;
            targetScale = Math.round(targetScale * 100.0) / 100.0;
            String finalStatus = (sumOfWeightages > 0 && poAttainment >= targetScale) ? "Y" : "N";

            PoAttainmentSummary poSum = new PoAttainmentSummary();
            poSum.setPoCode(poCode);
            poSum.setAttainedMappingSum(Math.round(sumWeightXCoAtt * 100.0) / 100.0); // Σ(Weightage × CO_AT)
            poSum.setTotalMappingSum(sumOfWeightages);                               // Σ(Weightage)
            poSum.setPoAttainmentPercent(poAttainment);                              // PO Attainment (e.g. 2.50)
            poSum.setTargetThreshold(targetScale);
            poSum.setFinalStatus(finalStatus);
            poSum.setContributions(contributions);

            poAttainments.add(poSum);
        }

        // Build and save Attainment Report
        AttainmentReport report = attainmentReportRepository.findByExamId(examId)
                .orElse(new AttainmentReport());

        report.setCourseId(course.getId());
        report.setCourseCode(course.getCourseCode());
        report.setCourseName(course.getCourseName());
        report.setExamId(exam.getId());
        report.setExamTitle(exam.getTitle());
        report.setTotalStudentsEvaluated(totalStudents);
        report.setCourseTargetThreshold(courseTargetThreshold);
        report.setQuestionThresholdPercent(questionThresholdPercent);
        report.setQuestionAttainments(questionAttainments);
        report.setCoAttainments(coAttainments);
        report.setPoAttainments(poAttainments);

        return attainmentReportRepository.save(report);
    }
}
