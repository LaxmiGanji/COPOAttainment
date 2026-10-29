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
@Document(collection = "course_overall_attainments")
public class CourseOverallAttainment {
    @Id
    private String id;
    private String courseId;
    private String courseCode;
    private String courseName;

    // Component weightages: 40% Internal, 60% Final
    @Builder.Default
    private double internalWeightage = 0.40;
    @Builder.Default
    private double externalWeightage = 0.60;

    // Course Target Threshold (e.g. 60.0% or 65.0%)
    @Builder.Default
    private double courseTargetThreshold = 60.0;

    // Course Overall Attainment Summary (across all COs)
    private Double overallCourseAttainmentPercent; // Average attainment percentage of the course
    private Integer overallCourseAttainmentLevel;  // Level: 0 (<65%), 1 (65-70%), 2 (70-75%), 3 (>=75%)
    private String overallCourseAttained;          // "Y" if overallCourseAttainmentPercent >= courseTargetThreshold, else "N"

    // Status of which assessments are entered
    private boolean ia1Entered;
    private boolean ia2Entered;
    private boolean finalEntered;

    private String ia1ExamId;
    private String ia2ExamId;
    private String finalExamId;

    // Combined CO Attainments
    @Builder.Default
    private List<CourseCoAttainmentRow> coAttainments = new ArrayList<>();

    // PO Attainments evaluated from the combined Total CO Attainments
    @Builder.Default
    private List<PoAttainmentSummary> poAttainments = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CourseCoAttainmentRow {
        private String coCode;
        private String description;

        // Attainment Percentages (% Students scoring >= 60% marks)
        private Double ia1Percent;
        private Double ia2Percent;
        private Double internalPercent;         // (IA1% + IA2%) / 2, or IA1% alone
        private Double weightedInternalPercent; // 0.40 * internalPercent
        private Double finalPercent;
        private Double weightedFinalPercent;    // 0.60 * finalPercent
        private Double totalCoPercent;          // weightedInternalPercent + weightedFinalPercent

        // Target and Attainment Check
        private Double targetPercent;           // Course Target Benchmark (e.g. 60%)
        private String finalResult;             // "Y" if totalCoPercent >= targetPercent, else "N"
        private Integer directAttainmentLevel;  // 3 (>=75%), 2 (70-75%), 1 (65-70%), 0 (<65%)

        // Scale 0.00 - 3.00 Levels
        private Double ia1Level;                // Level from IA 1 (scale 0-3)
        private Double ia2Level;                // Level from IA 2 (scale 0-3)
        private Double ia1Weighted;             // coattainment of IA1 = 0.40 * ia1Level
        private Double ia2Weighted;             // coattainment of IA2 = 0.40 * ia2Level
        private Double internalLevel;           // Average of raw levels: (IA1 + IA2) / 2
        private Double weightedInternal;        // Internal Mid Attainment = (ia1Weighted + ia2Weighted) / 2 (or IA1 alone)
        private Double finalLevel;              // Level from Final (scale 0-3)
        private Double weightedFinal;           // Final Attainment = 0.60 * finalLevel
        private Double totalCoAttainment;       // weightedInternal + weightedFinal (scale 0-3)
    }
}
