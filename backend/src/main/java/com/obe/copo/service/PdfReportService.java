package com.obe.copo.service;

import com.obe.copo.dto.SheetAssessmentDto;

public interface PdfReportService {
    byte[] generateAssessmentPdf(SheetAssessmentDto sheet) throws Exception;
}
