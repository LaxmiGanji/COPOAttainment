package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoPoMapping {
    private String coCode; // e.g. "CO1"
    private String poCode; // e.g. "PO1", "PO2", ... "PO12", "PSO1", "PSO2"
    private int level;     // 0 = none, 1 = low, 2 = medium, 3 = high
}
