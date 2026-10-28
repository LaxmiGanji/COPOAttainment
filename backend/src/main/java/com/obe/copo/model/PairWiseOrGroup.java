package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PairWiseOrGroup {
    private String groupName; // e.g. "Module 1", "Unit 1", or "Choice Pair 1"
    private String questionA; // e.g. "Q1"
    private String questionB; // e.g. "Q2"
}
