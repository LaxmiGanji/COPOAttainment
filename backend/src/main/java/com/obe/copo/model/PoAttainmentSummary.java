package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoAttainmentSummary {
    private String poCode;              // e.g. "PO1", "PO2", ... "PO12", "PSO1", "PSO2"
    private double attainedMappingSum;  // Sum of (Weightage × CO Attainment Level) e.g. 30.0
    private double totalMappingSum;     // Sum of Weightages (Sum of Wt) e.g. 12.0
    private double poAttainmentPercent; // PO Attainment Value (AttainedSum / TotalSum) e.g. 2.50
    private double targetThreshold;     // Benchmark target level (e.g. 2.0 or 1.5)
    private String finalStatus;         // "Y" if poAttainmentPercent >= targetThreshold, else "N"
    @Builder.Default
    private List<CoPoContribution> contributions = new ArrayList<>(); // Detailed breakdown table per mapped CO

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CoPoContribution {
        private String coCode;
        private double coAttainmentLevel; // e.g. 3.00, 1.00
        private int weight;               // e.g. 3
        private double poContribution;    // (coAttainmentLevel * weight) / sumOfWeights, e.g. 0.75
    }
}
