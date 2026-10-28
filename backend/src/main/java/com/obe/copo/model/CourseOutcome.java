package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseOutcome {
    private String coCode; // e.g. "CO1"
    private String description;
    @Builder.Default
    private double targetPercent = 50.0; // default 50%
}
