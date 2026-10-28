package com.obe.copo.repository;

import com.obe.copo.model.AttainmentReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttainmentReportRepository extends MongoRepository<AttainmentReport, String> {
    List<AttainmentReport> findByCourseId(String courseId);
    Optional<AttainmentReport> findByExamId(String examId);
    void deleteByCourseId(String courseId);
    void deleteByExamId(String examId);
}
