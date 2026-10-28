package com.obe.copo.service;

import com.obe.copo.dto.SheetAssessmentDto;

public interface AssessmentSheetService {
    SheetAssessmentDto getDefaultTemplate();
    SheetAssessmentDto getTemplateForCourse(String courseId, String examId, String examType);
    SheetAssessmentDto calculateSheet(SheetAssessmentDto input);
    SheetAssessmentDto saveAssessmentSheetMarks(SheetAssessmentDto input);
    byte[] exportExcel(SheetAssessmentDto input) throws Exception;
    byte[] exportPdf(SheetAssessmentDto input) throws Exception;
}
