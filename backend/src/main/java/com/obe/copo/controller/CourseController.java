package com.obe.copo.controller;

import com.obe.copo.model.CoPoMapping;
import com.obe.copo.model.Course;
import com.obe.copo.service.CourseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired
    private CourseService courseService;

    @GetMapping//http://localhost:8080/api/courses
    public List<Course> getAllCourses() {
        return courseService.getAllCourses();
    }

    @GetMapping("/{id}")//http://localhost:8080/api/courses/1
    public ResponseEntity<Course> getCourseById(@PathVariable String id) {
        return courseService.getCourseById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Course> createCourse(@RequestBody Course course) {
        return ResponseEntity.ok(courseService.createCourse(course));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Course> updateCourse(@PathVariable String id, @RequestBody Course updatedCourse) {
        return courseService.updateCourse(id, updatedCourse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/copo-matrix")
    public ResponseEntity<Course> updateCoPoMatrix(@PathVariable String id, @RequestBody List<CoPoMapping> mappings) {
        return courseService.updateCoPoMatrix(id, mappings)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable String id) {
        if (courseService.deleteCourse(id)) {
            return ResponseEntity.ok(java.util.Map.of(
                    "status", "SUCCESS",
                    "message", "Course deleted successfully",
                    "identifier", id
            ));
        }
        return ResponseEntity.status(404).body(java.util.Map.of(
                "status", "ERROR",
                "message", "Course not found with id or courseCode: " + id
        ));
    }
}
