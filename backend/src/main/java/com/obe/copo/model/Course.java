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
@Document(collection = "courses")
public class Course {
    @Id
    private String id;
    private String courseCode;
    private String courseName;
    private String department;
    private String academicYear;
    private int semester;
    @Builder.Default
    private CourseType courseType = CourseType.THEORETICAL;
    
    // Pattern and Weightages
    @Builder.Default
    private double maxInternalMarks = 50.0;
    @Builder.Default
    private double maxExternalMarks = 50.0;
    @Builder.Default
    private double internalWeightage = 50.0; // 50%
    @Builder.Default
    private double externalWeightage = 50.0; // 50%
    @Builder.Default
    private double targetThresholdPercent = 50.0; // Course target threshold T_course (e.g. 50%)
    @Builder.Default
    private double questionThresholdPercent = 50.0; // Default T_percent = 50%
    
    @Builder.Default
    private List<CourseOutcome> courseOutcomes = new ArrayList<>();
    @Builder.Default
    private List<CoPoMapping> coPoMappings = new ArrayList<>();
}
