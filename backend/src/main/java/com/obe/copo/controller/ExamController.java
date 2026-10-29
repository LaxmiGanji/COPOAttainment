package com.obe.copo.controller;

import com.obe.copo.dto.RuleSimulationRequest;
import com.obe.copo.model.ExamAssessment;
import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.service.ExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    @Autowired
    private ExamService examService;

    //MongoDB course ID
    @GetMapping("/course/{courseId}")//http://localhost:8080/api/exams/course/6ae1c28c5ee0313e9ab1bda3
    public List<ExamAssessment> getExamsByCourseId(@PathVariable String courseId) {
        return examService.getExamsByCourseId(courseId);
    }

    @GetMapping("/{id}")//http://localhost:8080/api/exams/6ae1d0c54f47ec6286463463
    public ResponseEntity<ExamAssessment> getExamById(@PathVariable String id) {
        return examService.getExamById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ExamAssessment> createExam(@RequestBody ExamAssessment exam) {
        return ResponseEntity.ok(examService.createExam(exam));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExamAssessment> updateExam(@PathVariable String id, @RequestBody ExamAssessment updatedExam) {
        return examService.updateExam(id, updatedExam)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExam(@PathVariable String id) {
        if (examService.deleteExam(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    //just for test. original --> evaluateStudentMarks
    @PostMapping("/simulate-rule")
    public ResponseEntity<EvaluationResult> simulateRuleEngine(@RequestBody RuleSimulationRequest request) {
        return ResponseEntity.ok(examService.simulateRuleEngine(request));
    }
}
