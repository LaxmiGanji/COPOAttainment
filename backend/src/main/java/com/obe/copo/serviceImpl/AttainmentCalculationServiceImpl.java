package com.obe.copo.serviceImpl;

import com.obe.copo.service.AttainmentCalculationService;

import com.obe.copo.model.*;
import com.obe.copo.repository.AttainmentReportRepository;
import com.obe.copo.repository.CourseOverallAttainmentRepository;
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

    @Autowired
    private CourseOverallAttainmentRepository courseOverallAttainmentRepository;

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
            if (achievedPercent >= 75.0) {
                directLevel = 3;
            } else if (achievedPercent >= 70.0) {
                directLevel = 2;
            } else if (achievedPercent >= 65.0) {
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
                if (cs.getStudentsMetPercent() >= 75.0) lvl = 3.0;
                else if (cs.getStudentsMetPercent() >= 70.0) lvl = 2.0;
                else if (cs.getStudentsMetPercent() >= 65.0) lvl = 1.0;
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

        AttainmentReport saved = attainmentReportRepository.save(report);
        try {
            calculateCourseOverallAttainment(course.getId());
        } catch (Exception ignored) {}
        return saved;
    }

    /**
     * Calculates the Overall Combined Course CO and PO Attainment across IA 1, IA 2, and Final examinations:
     * - Mid/Internal CO Attainment = (CO Attainment of IA1 + CO Attainment of IA2) / 2
     * - If only 1 IA is entered, that IA's CO attainment is used directly without distortion
     * - Internal component: 40% weightage (0.40 * COMid)
     * - Final component: 60% weightage (0.60 * COFinal)
     * - Total CO Attainment = Internal CO Attainment + Final CO Attainment
     */
    @Override
    public CourseOverallAttainment calculateCourseOverallAttainment(String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Course not found with id: " + courseId));

        List<ExamAssessment> exams = examAssessmentRepository.findByCourseId(courseId);

        ExamAssessment ia1Exam = null;
        ExamAssessment ia2Exam = null;
        ExamAssessment finalExam = null;

        for (ExamAssessment e : exams) {
            String cat = getExamCategory(e);
            if ("IA 1".equals(cat)) {
                ia1Exam = e;
            } else if ("IA 2".equals(cat)) {
                ia2Exam = e;
            } else if ("SEM final".equals(cat)) {
                finalExam = e;
            }
        }

        AttainmentReport ia1Report = getReportForExam(ia1Exam);
        AttainmentReport ia2Report = getReportForExam(ia2Exam);
        AttainmentReport finalReport = getReportForExam(finalExam);

        boolean ia1Entered = (ia1Report != null && ia1Report.getCoAttainments() != null && !ia1Report.getCoAttainments().isEmpty());
        boolean ia2Entered = (ia2Report != null && ia2Report.getCoAttainments() != null && !ia2Report.getCoAttainments().isEmpty());
        boolean finalEntered = (finalReport != null && finalReport.getCoAttainments() != null && !finalReport.getCoAttainments().isEmpty());

        double internalWeight = 0.40;
        double externalWeight = 0.60;
        double courseTargetThreshold = course.getTargetThresholdPercent() > 0 ? course.getTargetThresholdPercent() : 60.0;

        // Collect all distinct course outcomes
        Set<String> coCodes = new LinkedHashSet<>();
        Map<String, String> coDescriptions = new HashMap<>();
        Map<String, Double> coTargetMap = new HashMap<>();

        if (course.getCourseOutcomes() != null) {
            for (CourseOutcome co : course.getCourseOutcomes()) {
                coCodes.add(co.getCoCode());
                if (co.getDescription() != null) {
                    coDescriptions.put(co.getCoCode(), co.getDescription());
                }
                if (co.getTargetPercent() > 0) {
                    coTargetMap.put(co.getCoCode(), co.getTargetPercent());
                }
            }
        }
        if (ia1Report != null && ia1Report.getCoAttainments() != null) {
            for (CoAttainmentSummary c : ia1Report.getCoAttainments()) coCodes.add(c.getCoCode());
        }
        if (ia2Report != null && ia2Report.getCoAttainments() != null) {
            for (CoAttainmentSummary c : ia2Report.getCoAttainments()) coCodes.add(c.getCoCode());
        }
        if (finalReport != null && finalReport.getCoAttainments() != null) {
            for (CoAttainmentSummary c : finalReport.getCoAttainments()) coCodes.add(c.getCoCode());
        }

        List<CourseOverallAttainment.CourseCoAttainmentRow> coRows = new ArrayList<>();
        Map<String, Double> totalCoLevelMap = new HashMap<>();

        double sumTotalCoPercent = 0.0;
        int evaluatedCoCount = 0;

        for (String coCode : coCodes) {
            Double ia1Level = getCoLevelFromReport(ia1Report, coCode);
            Double ia2Level = getCoLevelFromReport(ia2Report, coCode);
            Double finalLevel = getCoLevelFromReport(finalReport, coCode);

            Double ia1Pct = getCoPercentFromReport(ia1Report, coCode);
            Double ia2Pct = getCoPercentFromReport(ia2Report, coCode);
            Double finalPct = getCoPercentFromReport(finalReport, coCode);

            // 1. Calculate internal mid levels & percentages: average of IA1 and IA2 (or single IA if other not entered)
            Double internalLevel = calculateMidAverage(ia1Level, ia2Level);
            Double internalPct = calculateMidAverage(ia1Pct, ia2Pct);

            // 2. Component Attainments: (0.40 * IA1), (0.40 * IA2), then average for Internal
            Double ia1Weighted = ia1Level != null ? Math.round((internalWeight * ia1Level) * 100.0) / 100.0 : null;
            Double ia2Weighted = ia2Level != null ? Math.round((internalWeight * ia2Level) * 100.0) / 100.0 : null;
            Double weightedInternal = calculateMidAverage(ia1Weighted, ia2Weighted);

            Double ia1WeightedPct = ia1Pct != null ? Math.round((internalWeight * ia1Pct) * 100.0) / 100.0 : null;
            Double ia2WeightedPct = ia2Pct != null ? Math.round((internalWeight * ia2Pct) * 100.0) / 100.0 : null;
            Double weightedInternalPct = calculateMidAverage(ia1WeightedPct, ia2WeightedPct);

            Double weightedFinal = null;
            Double weightedFinalPct = null;
            if (finalLevel != null) {
                weightedFinal = Math.round((externalWeight * finalLevel) * 100.0) / 100.0;
            }
            if (finalPct != null) {
                weightedFinalPct = Math.round((externalWeight * finalPct) * 100.0) / 100.0;
            }

            // 3. Total CO Attainment (Internal + Final)
            Double totalCo = null;
            if (weightedInternal != null || weightedFinal != null) {
                double total = (weightedInternal != null ? weightedInternal : 0.0)
                             + (weightedFinal != null ? weightedFinal : 0.0);
                totalCo = Math.round(total * 100.0) / 100.0;
            }

            Double totalPct = null;
            if (weightedInternalPct != null || weightedFinalPct != null) {
                double totalP = (weightedInternalPct != null ? weightedInternalPct : 0.0)
                              + (weightedFinalPct != null ? weightedFinalPct : 0.0);
                totalPct = Math.round(totalP * 100.0) / 100.0;
            }

            // 4. Rubric Attainment Level: >=75% -> 3, 70-75% -> 2, 65-70% -> 1, <65% -> 0
            double effectivePctForLevel = totalPct != null ? totalPct : (totalCo != null ? (totalCo / 3.0) * 100.0 : 0.0);
            Integer coAttainmentLevel = getAttainmentLevelFromPercent(effectivePctForLevel);

            // 5. Target Benchmark Check: check if course/CO is attained or not
            double target = coTargetMap.getOrDefault(coCode, courseTargetThreshold);
            String finalResult = effectivePctForLevel >= target ? "Y" : "N";

            if (totalPct != null) {
                sumTotalCoPercent += totalPct;
                evaluatedCoCount++;
            }

            totalCoLevelMap.put(coCode, totalCo != null ? totalCo : (double) coAttainmentLevel);

            CourseOverallAttainment.CourseCoAttainmentRow row = CourseOverallAttainment.CourseCoAttainmentRow.builder()
                    .coCode(coCode)
                    .description(coDescriptions.getOrDefault(coCode, "Course Outcome " + coCode))
                    .ia1Percent(ia1Pct)
                    .ia2Percent(ia2Pct)
                    .internalPercent(internalPct)
                    .weightedInternalPercent(weightedInternalPct)
                    .finalPercent(finalPct)
                    .weightedFinalPercent(weightedFinalPct)
                    .totalCoPercent(totalPct)
                    .targetPercent(target)
                    .finalResult(finalResult)
                    .directAttainmentLevel(coAttainmentLevel)
                    .ia1Level(ia1Level)
                    .ia2Level(ia2Level)
                    .ia1Weighted(ia1Weighted)
                    .ia2Weighted(ia2Weighted)
                    .internalLevel(internalLevel)
                    .weightedInternal(weightedInternal)
                    .finalLevel(finalLevel)
                    .weightedFinal(weightedFinal)
                    .totalCoAttainment(totalCo)
                    .build();
            coRows.add(row);
        }

        // 6. Overall Course-level Attainment Percentage and Level
        Double overallCourseAttainmentPercent = evaluatedCoCount > 0
                ? Math.round((sumTotalCoPercent / evaluatedCoCount) * 100.0) / 100.0
                : null;

        Integer overallCourseAttainmentLevel = getAttainmentLevelFromPercent(overallCourseAttainmentPercent);

        String overallCourseAttained = (overallCourseAttainmentPercent != null && overallCourseAttainmentPercent >= courseTargetThreshold)
                ? "Y"
                : "N";

        // 7. Calculate PO Attainment using the combined Total CO Attainments
        List<PoAttainmentSummary> poAttainments = calculatePoAttainmentForCourse(course, totalCoLevelMap);

        CourseOverallAttainment overall = courseOverallAttainmentRepository.findByCourseId(courseId)
                .orElse(new CourseOverallAttainment());

        overall.setCourseId(course.getId());
        overall.setCourseCode(course.getCourseCode());
        overall.setCourseName(course.getCourseName());
        overall.setInternalWeightage(internalWeight);
        overall.setExternalWeightage(externalWeight);
        overall.setCourseTargetThreshold(courseTargetThreshold);
        overall.setOverallCourseAttainmentPercent(overallCourseAttainmentPercent);
        overall.setOverallCourseAttainmentLevel(overallCourseAttainmentLevel);
        overall.setOverallCourseAttained(overallCourseAttained);
        overall.setIa1Entered(ia1Entered);
        overall.setIa2Entered(ia2Entered);
        overall.setFinalEntered(finalEntered);
        overall.setIa1ExamId(ia1Exam != null ? ia1Exam.getId() : null);
        overall.setIa2ExamId(ia2Exam != null ? ia2Exam.getId() : null);
        overall.setFinalExamId(finalExam != null ? finalExam.getId() : null);
        overall.setCoAttainments(coRows);
        overall.setPoAttainments(poAttainments);

        return courseOverallAttainmentRepository.save(overall);
    }

    private String getExamCategory(ExamAssessment e) {
        if (e == null) return "IA 1";
        String et = (e.getExamType() != null ? e.getExamType() : "").toUpperCase();
        String t = (e.getTitle() != null ? e.getTitle() : "").toUpperCase();

        if (et.contains("SEM") || et.contains("FINAL") || et.contains("MODEL") || et.contains("END") || t.contains("FINAL") || t.contains("SEMESTER") || t.contains("MODEL") || t.contains("END")) {
            return "SEM final";
        }
        if (et.contains("IAT-2") || et.contains("IA2") || et.contains("IA 2") || t.contains("TEST - 2") || t.contains("TEST 2") || t.contains("IA 2") || t.contains("IA-2") || t.contains("IAT 2") || t.contains("IAT-2") || t.contains("MID 2") || t.contains("MID-2") || (et.contains("2") && !et.contains("1"))) {
            return "IA 2";
        }
        return "IA 1";
    }

    private AttainmentReport getReportForExam(ExamAssessment exam) {
        if (exam == null || exam.getId() == null) return null;
        Optional<AttainmentReport> opt = attainmentReportRepository.findByExamId(exam.getId());
        if (opt.isPresent()) return opt.get();

        List<StudentMarksRecord> records = studentMarksRecordRepository.findByExamId(exam.getId());
        if (records != null && !records.isEmpty()) {
            try {
                return calculateExamAttainment(exam.getId());
            } catch (Exception ignored) {}
        }
        return null;
    }

    private Double getCoLevelFromReport(AttainmentReport report, String coCode) {
        if (report == null || report.getCoAttainments() == null) return null;
        for (CoAttainmentSummary c : report.getCoAttainments()) {
            if (coCode.equalsIgnoreCase(c.getCoCode())) {
                double lvl = c.getDirectAttainmentLevel();
                if (lvl <= 0 && c.getStudentsMetPercent() > 0) {
                    lvl = (double) getAttainmentLevelFromPercent(c.getStudentsMetPercent());
                }
                return lvl;
            }
        }
        return null;
    }

    private Double getCoPercentFromReport(AttainmentReport report, String coCode) {
        if (report == null || report.getCoAttainments() == null) return null;
        for (CoAttainmentSummary c : report.getCoAttainments()) {
            if (coCode.equalsIgnoreCase(c.getCoCode())) {
                return c.getStudentsMetPercent();
            }
        }
        return null;
    }

    private List<PoAttainmentSummary> calculatePoAttainmentForCourse(Course course, Map<String, Double> coLevelMap) {
        List<PoAttainmentSummary> poAttainments = new ArrayList<>();
        List<CoPoMapping> mappings = course.getCoPoMappings() != null ?
                course.getCoPoMappings() : new ArrayList<>();

        Map<String, List<CoPoMapping>> poMapGroup = new LinkedHashMap<>();
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

        double courseTargetThreshold = course.getTargetThresholdPercent() > 0 ? course.getTargetThresholdPercent() : 60.0;
        double targetScale = courseTargetThreshold > 3.0 ? (courseTargetThreshold / 100.0) * 3.0 : courseTargetThreshold;
        targetScale = Math.round(targetScale * 100.0) / 100.0;

        for (Map.Entry<String, List<CoPoMapping>> entry : poMapGroup.entrySet()) {
            String poCode = entry.getKey();
            List<CoPoMapping> poMappings = entry.getValue();

            double sumOfWeightages = 0.0;
            for (CoPoMapping m : poMappings) {
                sumOfWeightages += m.getLevel();
            }

            double sumWeightXCoAtt = 0.0;
            List<PoAttainmentSummary.CoPoContribution> contributions = new ArrayList<>();

            for (CoPoMapping m : poMappings) {
                int wt = m.getLevel();
                double coAttLvl = coLevelMap.getOrDefault(m.getCoCode(), 0.0);
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

            double poAttainment = sumOfWeightages > 0 ? (sumWeightXCoAtt / sumOfWeightages) : 0.0;
            poAttainment = Math.round(poAttainment * 100.0) / 100.0;

            String finalStatus = (sumOfWeightages > 0 && poAttainment >= targetScale) ? "Y" : "N";

            PoAttainmentSummary poSum = new PoAttainmentSummary();
            poSum.setPoCode(poCode);
            poSum.setAttainedMappingSum(Math.round(sumWeightXCoAtt * 100.0) / 100.0);
            poSum.setTotalMappingSum(sumOfWeightages);
            poSum.setPoAttainmentPercent(poAttainment);
            poSum.setTargetThreshold(targetScale);
            poSum.setFinalStatus(finalStatus);
            poSum.setContributions(contributions);

            poAttainments.add(poSum);
        }

        return poAttainments;
    }
    /**
     * Calculates the internal mid average between IA1 and IA2.
     * If only one IA is entered, returns that IA's value without division by 2.
     */
    private Double calculateMidAverage(Double v1, Double v2) {
        if (v1 != null && v2 != null) {
            return Math.round(((v1 + v2) / 2.0) * 100.0) / 100.0;
        } else if (v1 != null) {
            return v1;
        } else if (v2 != null) {
            return v2;
        }
        return null;
    }

    /**
     * Converts attainment percentage to standard NBA Level:
     * >= 75% -> 3
     * 70 - 75% -> 2
     * 65 - 70% -> 1
     * < 65% -> 0
     */
    private int getAttainmentLevelFromPercent(Double percent) {
        if (percent == null) return 0;
        if (percent >= 75.0) return 3;
        if (percent >= 70.0) return 2;
        if (percent >= 65.0) return 1;
        return 0;
    }
}
