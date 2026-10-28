package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentCoPerformance {
    private String coCode;
    private double scoredMarks;
    private double maxPossibleMarks;
    private double percentage;
    private boolean isMet; // "Y" if percentage >= targetThreshold, else "N"
}
