package com.obe.copo.service;

import com.obe.copo.dto.MarksBatchRequest;
import com.obe.copo.model.StudentMarksRecord;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MarksService {
    List<StudentMarksRecord> getMarksByExamId(String examId);
    List<StudentMarksRecord> saveBatchMarks(MarksBatchRequest request);
    byte[] downloadExcelTemplate(String examId) throws Exception;
    List<StudentMarksRecord> uploadExcelMarks(String examId, MultipartFile file) throws Exception;
}
