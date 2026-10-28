package com.obe.copo.service;

import com.obe.copo.model.AttainmentReport;

public interface AttainmentCalculationService {
    AttainmentReport calculateExamAttainment(String examId);
}
