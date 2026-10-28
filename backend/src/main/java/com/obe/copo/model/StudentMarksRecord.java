package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Stores assessment marks and rule engine evaluation results for a student in a specific exam.
 * Student profile and credentials are kept separately in the {@link Student} model.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "student_marks_records")
public class StudentMarksRecord {
    @Id
    private String id;
    private String courseId;
    private String examId;
    private String studentUsn;
    private String studentName;
    
    // Raw ingested sub-question scores (e.g. "Q1a" -> 4.5, "Q1b" -> 5.0)
    @Builder.Default
    private Map<String, Double> subQuestionScores = new HashMap<>();
    
    // Aggregated outputs from Rule Engine
    @Builder.Default
    private Map<String, Double> mainQuestionScores = new HashMap<>();
    @Builder.Default
    private List<String> selectedQuestionIds = new ArrayList<>();
    @Builder.Default
    private List<String> ignoredQuestionIds = new ArrayList<>();
    private double totalScore;
    @Builder.Default
    private List<String> evaluationSteps = new ArrayList<>();
    
    // Per-student CO attainment breakdown
    @Builder.Default
    private Map<String, StudentCoPerformance> coPerformances = new HashMap<>();
}
