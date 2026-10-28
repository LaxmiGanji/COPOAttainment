package com.obe.copo.repository;

import com.obe.copo.model.ExamAssessment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamAssessmentRepository extends MongoRepository<ExamAssessment, String> {
    List<ExamAssessment> findByCourseId(String courseId);
    void deleteByCourseId(String courseId);
}
