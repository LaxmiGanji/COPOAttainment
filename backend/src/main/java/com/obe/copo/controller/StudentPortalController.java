package com.obe.copo.controller;

import com.obe.copo.service.StudentPortalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
public class StudentPortalController {

    @Autowired
    private StudentPortalService studentPortalService;

    @GetMapping("/{usn}/records")//http://localhost:8080/api/student/1NH20CS028/records
    public ResponseEntity<Map<String, Object>> getStudentPerformance(@PathVariable String usn) {
        return ResponseEntity.ok(studentPortalService.getStudentPerformance(usn));
    }

    @GetMapping("/directory")
    public ResponseEntity<List<Map<String, String>>> getDistinctStudents() {
        return ResponseEntity.ok(studentPortalService.getDistinctStudents());
    }//http://localhost:8080/api/student/directory
}
