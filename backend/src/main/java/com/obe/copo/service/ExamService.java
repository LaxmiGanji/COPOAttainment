package com.obe.copo.service;

import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.dto.RuleSimulationRequest;
import com.obe.copo.model.ExamAssessment;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ExamService {
    List<ExamAssessment> getExamsByCourseId(String courseId);
    Optional<ExamAssessment> getExamById(String id);
    ExamAssessment createExam(ExamAssessment exam);
    Optional<ExamAssessment> updateExam(String id, ExamAssessment updatedExam);
    boolean deleteExam(String id);
    EvaluationResult simulateRuleEngine(RuleSimulationRequest request);
    EvaluationResult evaluateStudentMarks(ExamAssessment exam, Map<String, Double> rawSubQuestionScores);
}
