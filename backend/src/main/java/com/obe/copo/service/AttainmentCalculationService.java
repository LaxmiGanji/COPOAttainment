package com.obe.copo.service;

import com.obe.copo.model.AttainmentReport;
import com.obe.copo.model.CourseOverallAttainment;

public interface AttainmentCalculationService {
    AttainmentReport calculateExamAttainment(String examId);
    CourseOverallAttainment calculateCourseOverallAttainment(String courseId);
}
