package com.obe.copo.repository;

import com.obe.copo.model.StudentMarksRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentMarksRecordRepository extends MongoRepository<StudentMarksRecord, String> {
    List<StudentMarksRecord> findByExamId(String examId);
    List<StudentMarksRecord> findByCourseId(String courseId);
    List<StudentMarksRecord> findByStudentUsn(String studentUsn);
    Optional<StudentMarksRecord> findByExamIdAndStudentUsn(String examId, String studentUsn);
    void deleteByExamId(String examId);
    void deleteByCourseId(String courseId);
}
