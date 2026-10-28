package com.obe.copo.service;

import com.obe.copo.model.StudentMarksRecord;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ExcelMarksService {
    byte[] generateExcelTemplate(String examId) throws Exception;
    List<StudentMarksRecord> importMarksFromExcel(String examId, MultipartFile file) throws Exception;
}
