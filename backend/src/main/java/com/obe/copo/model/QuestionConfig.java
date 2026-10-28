package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionConfig {
    private String questionId; // e.g. "Q1", "Q2"
    private int questionNumber;
    private String label; // e.g. "Question 1"
    
    @JsonProperty("isMandatory")
    @JsonAlias({"mandatory", "isMandatory"})
    @Builder.Default
    private boolean isMandatory = false; // Compulsory question
    private String orWithQuestionId;     // If Choice: e.g. "Q2" (Q1 OR Q2)
    @Builder.Default
    private String coCode = "CO1";       // Direct CO mapping
    @Builder.Default
    private Double directMaxMarks = 10.0; // Direct max marks if no subquestions
    @Builder.Default
    private List<SubQuestionConfig> subQuestions = new ArrayList<>();

    public QuestionConfig(String questionId, int questionNumber, String label, boolean isMandatory) {
        this.questionId = questionId;
        this.questionNumber = questionNumber;
        this.label = label;
        this.isMandatory = isMandatory;
    }

    public boolean isMandatory() {
        return isMandatory;
    }

    public boolean getIsMandatory() {
        return isMandatory;
    }

    public void setIsMandatory(boolean isMandatory) {
        this.isMandatory = isMandatory;
    }

    public void setMandatory(boolean isMandatory) {
        this.isMandatory = isMandatory;
    }

    public double getTotalMaxMarks() {
        if (subQuestions != null && !subQuestions.isEmpty()) {
            return subQuestions.stream().mapToDouble(SubQuestionConfig::getMaxMarks).sum();
        }
        return directMaxMarks != null ? directMaxMarks : 0.0;
    }

    public String getPrimaryCoCode() {
        if (coCode != null && !coCode.trim().isEmpty()) {
            return coCode.trim();
        }
        if (subQuestions != null && !subQuestions.isEmpty() && subQuestions.get(0).getCoCode() != null) {
            return subQuestions.get(0).getCoCode();
        }
        return "CO1";
    }
}
