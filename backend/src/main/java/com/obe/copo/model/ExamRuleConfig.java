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
public class ExamRuleConfig {
    @Builder.Default
    private int topN = 3;
    @Builder.Default
    private List<String> mandatoryQuestionIds = new ArrayList<>();
    @Builder.Default
    private List<PairWiseOrGroup> orPairs = new ArrayList<>();
}
