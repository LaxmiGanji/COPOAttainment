package com.obe.copo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentMarkInputDto {
    private String studentUsn;
    private String studentName;
    private Map<String, Double> subQuestionScores;
}
