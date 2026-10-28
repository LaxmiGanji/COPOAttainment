package com.obe.copo.dto;

import com.obe.copo.model.ExamRuleConfig;
import com.obe.copo.model.QuestionConfig;
import com.obe.copo.model.RuleEngineCase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleSimulationRequest {
    private RuleEngineCase ruleEngineCase;
    private ExamRuleConfig ruleConfig;
    private List<QuestionConfig> questions;
    private Map<String, Double> subQuestionScores;
}
