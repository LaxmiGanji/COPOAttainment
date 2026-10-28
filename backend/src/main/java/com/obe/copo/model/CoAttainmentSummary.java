package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoAttainmentSummary {
    private String coCode;
    private String description;
    private double targetPercent; // T_course, e.g. 50%
    private int totalStudents;
    private int studentsMetCount; // Count with Met = "Y"
    private double studentsMetPercent; // (Count / Total) * 100
    private String finalResult; // "Y" if studentsMetPercent >= targetPercent, else "N"
    private int directAttainmentLevel; // 1 (50-60%), 2 (60-70%), 3 (>=70%)
    private double averageMarksPercent; // Overall average marks % for this CO
}
