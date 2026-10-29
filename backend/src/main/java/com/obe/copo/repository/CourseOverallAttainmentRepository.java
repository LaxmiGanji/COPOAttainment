package com.obe.copo.repository;

import com.obe.copo.model.CourseOverallAttainment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CourseOverallAttainmentRepository extends MongoRepository<CourseOverallAttainment, String> {
    Optional<CourseOverallAttainment> findByCourseId(String courseId);
    void deleteByCourseId(String courseId);
}

