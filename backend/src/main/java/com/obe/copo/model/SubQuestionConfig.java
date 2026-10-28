package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubQuestionConfig {
    private String subQuestionId; // e.g. "Q1a", "Q1b"
    private String parentQuestionId; // e.g. "Q1"
    private String label; // e.g. "1.(a)"
    @Builder.Default
    private double maxMarks = 5.0;
    @Builder.Default
    private String coCode = "CO1"; // Mapped CO
    @Builder.Default
    private String bloomsLevel = "L2"; // L1-Remember, L2-Understand, L3-Apply, etc.
    private String description;

    public SubQuestionConfig(String subQuestionId, String parentQuestionId, String label, double maxMarks, String coCode, String bloomsLevel) {
        this.subQuestionId = subQuestionId;
        this.parentQuestionId = parentQuestionId;
        this.label = label;
        this.maxMarks = maxMarks;
        this.coCode = coCode;
        this.bloomsLevel = bloomsLevel;
    }
}
