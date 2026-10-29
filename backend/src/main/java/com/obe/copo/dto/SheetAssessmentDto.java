package com.obe.copo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SheetAssessmentDto {
    // Header Metadata
    @Builder.Default
    private String institutionName = "Faculty of Engineering & Technology";
    @Builder.Default
    private String assessmentTitle = "CO Attainment Assessment Sheet";
    @Builder.Default
    private String semesterAndYear = "";
    @Builder.Default
    private String courseCode = "";
    @Builder.Default
    private String courseTitle = "";
    @Builder.Default
    private String levelAndTerm = "";
    @Builder.Default
    private String section = "";
    @Builder.Default
    private int noOfStudents = 0;
    @Builder.Default
    private String mlInitial = "";
    @Builder.Default
    private double threshold = 50.0; // 50%
    private String examId;
    @Builder.Default
    private String examType = "";
    @Builder.Default
    private String examTitle = "";

    // Question Definitions
    @Builder.Default
    private List<QuestionMeta> midtermQuestions = new ArrayList<>();
    @Builder.Default
    private List<QuestionMeta> finalQuestions = new ArrayList<>();

    // Students with entered scores & backend calculated outcomes
    @Builder.Default
    private List<StudentRowDto> students = new ArrayList<>();

    // Calculated Blocks from Backend
    @Builder.Default
    private List<CoMatrixRow> coQuestionMatrix = new ArrayList<>();//
    @Builder.Default
    private Map<String, CoSummaryMeta> coSummary = new LinkedHashMap<>();
    @Builder.Default
    private List<PoAttainmentRow> poAttainments = new ArrayList<>();

    // Inner Classes with Lombok
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionMeta {
        private String id;        // "Q1", "Q2", etc.
        private String coCode;    // "CO1", "CO2", etc.
        private double maxMarks;  // 6, 3, 4, etc.
        // Calculated by backend:
        private double thresholdMarks;
        private int attemptedCount;
        private int passedCount;
        private double passPercentage;

        public QuestionMeta(String id, String coCode, double maxMarks) {
            this.id = id;
            this.coCode = coCode;
            this.maxMarks = maxMarks;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentRowDto {
        private String studentId;
        private String studentName;
        // Raw marks entered: e.g. "3", "N", "2.5"
        @Builder.Default
        private Map<String, String> midScores = new LinkedHashMap<>();
        @Builder.Default
        private Map<String, String> finalScores = new LinkedHashMap<>();

        // Calculated by backend strictly:
        @Builder.Default
        private Double midTotal = null;
        @Builder.Default
        private Double finalTotal = null;
        @Builder.Default
        private Double overallTotal = null;
        @Builder.Default
        private boolean attempted = false;
        @Builder.Default
        private Map<String, Double> coMarksPercent = new LinkedHashMap<>(); // "CO1" -> 35.0
        @Builder.Default
        private Map<String, String> coMetStatus = new LinkedHashMap<>();    // "CO1" -> "N" or "-"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CoMatrixRow {
        private String coCode;
        private double midMarks;
        private double finalMarks;
        private double totalMarks;
        private double percent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CoSummaryMeta {
        private String coCode;
        private int achievedCount;
        private double achievedPercent;
        private String result; // "Y" or "N"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PoAttainmentRow {
        private String coCode;
        private String coResult; // "Y" or "N"
        @Builder.Default
        private double coAttainmentLevel = 0.0;
        @Builder.Default
        private Map<String, Integer> poWeights = new LinkedHashMap<>(); // "PO1" -> 3
    }
}
