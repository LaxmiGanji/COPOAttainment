package com.obe.copo.service;

import com.obe.copo.dto.SheetAssessmentDto;
import com.obe.copo.model.Course;
import com.obe.copo.model.ExamAssessment;

import java.util.List;

public interface AssessmentCalculationService {

    SheetAssessmentDto calculateAssessmentSheet(SheetAssessmentDto input);

    SheetAssessmentDto generateTemplateForCourse(Course course, List<ExamAssessment> exams);

    SheetAssessmentDto getDefaultTemplateData();

    byte[] generateAssessmentExcel(SheetAssessmentDto sheet) throws Exception;
}
