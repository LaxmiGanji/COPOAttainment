package com.obe.copo.service;

import com.obe.copo.model.AttainmentReport;

import java.util.List;
import java.util.Optional;

public interface AttainmentService {
    AttainmentReport calculateAttainment(String examId) throws Exception;
    Optional<AttainmentReport> getReportByExamId(String examId);
    List<AttainmentReport> getReportsByCourseId(String courseId);
}
