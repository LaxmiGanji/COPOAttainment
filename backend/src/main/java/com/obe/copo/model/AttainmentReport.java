package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "attainment_reports")
public class AttainmentReport {
    @Id
    private String id;
    private String courseId;
    private String courseCode;
    private String courseName;
    private String examId;
    private String examTitle;
    
    private int totalStudentsEvaluated;
    private double courseTargetThreshold; // T_course
    private double questionThresholdPercent; // T_percent
    
    // Method B: Question level aggregate
    @Builder.Default
    private List<QuestionAttainmentSummary> questionAttainments = new ArrayList<>();
    
    // Method A: Student-centric CO target attainment
    @Builder.Default
    private List<CoAttainmentSummary> coAttainments = new ArrayList<>();
    
    // Program Outcome (PO) Attainment
    @Builder.Default
    private List<PoAttainmentSummary> poAttainments = new ArrayList<>();
}
