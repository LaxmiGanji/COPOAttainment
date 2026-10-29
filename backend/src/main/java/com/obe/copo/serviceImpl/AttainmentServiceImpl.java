package com.obe.copo.serviceImpl;

import com.obe.copo.model.AttainmentReport;
import com.obe.copo.model.CourseOverallAttainment;
import com.obe.copo.repository.AttainmentReportRepository;
import com.obe.copo.repository.CourseOverallAttainmentRepository;
import com.obe.copo.service.AttainmentCalculationService;
import com.obe.copo.service.AttainmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AttainmentServiceImpl implements AttainmentService {

    @Autowired
    private AttainmentCalculationService attainmentCalculationService;

    @Autowired
    private AttainmentReportRepository attainmentReportRepository;

    @Autowired
    private CourseOverallAttainmentRepository courseOverallAttainmentRepository;

    @Override
    public AttainmentReport calculateAttainment(String examId) throws Exception {
        return attainmentCalculationService.calculateExamAttainment(examId);
    }

    @Override
    public Optional<AttainmentReport> getReportByExamId(String examId) {
        return attainmentReportRepository.findByExamId(examId);
    }

    @Override
    public List<AttainmentReport> getReportsByCourseId(String courseId) {
        return attainmentReportRepository.findByCourseId(courseId);
    }

    @Override
    public CourseOverallAttainment calculateCourseOverallAttainment(String courseId) {
        return attainmentCalculationService.calculateCourseOverallAttainment(courseId);
    }

    @Override
    public Optional<CourseOverallAttainment> getCourseOverallAttainment(String courseId) {
        return courseOverallAttainmentRepository.findByCourseId(courseId);
    }
}
