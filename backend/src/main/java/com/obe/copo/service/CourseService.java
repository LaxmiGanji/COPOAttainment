package com.obe.copo.service;

import com.obe.copo.model.CoPoMapping;
import com.obe.copo.model.Course;

import java.util.List;
import java.util.Optional;

public interface CourseService {
    List<Course> getAllCourses();
    Optional<Course> getCourseById(String id);
    Course createCourse(Course course);
    Optional<Course> updateCourse(String id, Course updatedCourse);
    Optional<Course> updateCoPoMatrix(String id, List<CoPoMapping> mappings);
    boolean deleteCourse(String id);
}
