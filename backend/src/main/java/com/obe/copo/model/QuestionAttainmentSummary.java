package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionAttainmentSummary {
    private String questionOrSubQuestionId;
    private String label;
    private String coCode;
    private double maxMarks;
    private double thresholdMarks; // T_Q = M_Q * T_percent
    private int totalAttemptedStudents;
    private int passedStudentsCount; // Score >= T_Q
    private double passPercentage;   // (passed / attempted) * 100
}
