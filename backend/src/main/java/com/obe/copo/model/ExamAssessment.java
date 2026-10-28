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
@Document(collection = "exam_assessments")
public class ExamAssessment {
    @Id
    private String id;
    private String courseId;
    private String examType; // e.g. "IAT-1", "IAT-2", "SEMESTER_END", "LAB_INTERNAL", "ASSIGNMENT"
    private String title;    // e.g. "Internal Assessment Test - 1"
    @Builder.Default
    private double maxMarks = 50.0;
    
    // Rule Engine Config
    @Builder.Default
    private RuleEngineCase ruleEngineCase = RuleEngineCase.CASE_1_TOP_N;
    @Builder.Default
    private ExamRuleConfig ruleConfig = new ExamRuleConfig();
    
    // Questions and sub-questions configuration
    @Builder.Default
    private List<QuestionConfig> questions = new ArrayList<>();
}
