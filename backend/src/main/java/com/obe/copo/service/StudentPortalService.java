package com.obe.copo.service;

import java.util.List;
import java.util.Map;

public interface StudentPortalService {
    Map<String, Object> getStudentPerformance(String usn);
    List<Map<String, String>> getDistinctStudents();
}
