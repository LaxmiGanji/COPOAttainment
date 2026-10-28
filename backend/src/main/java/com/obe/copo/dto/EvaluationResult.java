package com.obe.copo.dto;

import com.obe.copo.model.RuleEngineCase;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResult {
    private double totalScore;
    private List<String> selectedQuestionIds = new ArrayList<>();
    private List<String> ignoredQuestionIds = new ArrayList<>();
    private Map<String, Double> mainQuestionScores = new HashMap<>();
    private List<String> evaluationSteps = new ArrayList<>();
    private RuleEngineCase ruleEngineCase;
}
