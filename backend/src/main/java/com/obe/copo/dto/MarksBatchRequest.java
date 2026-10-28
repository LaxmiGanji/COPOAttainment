package com.obe.copo.dto;

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
public class MarksBatchRequest {
    private String examId;
    @Builder.Default
    private List<StudentMarkInputDto> records = new ArrayList<>();
}
