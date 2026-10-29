package com.obe.copo.controller;

import com.obe.copo.model.AttainmentReport;
import com.obe.copo.model.CourseOverallAttainment;
import com.obe.copo.service.AttainmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attainment")
public class AttainmentController {

    @Autowired
    private AttainmentService attainmentService;

    @PostMapping("/calculate/{examId}")
    public ResponseEntity<AttainmentReport> calculateAttainment(@PathVariable String examId) {
        try {
            AttainmentReport report = attainmentService.calculateAttainment(examId);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/exam/{examId}")
    public ResponseEntity<AttainmentReport> getReportByExamId(@PathVariable String examId) {
        return attainmentService.getReportByExamId(examId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/course/{courseId}")
    public List<AttainmentReport> getReportsByCourseId(@PathVariable String courseId) {
        return attainmentService.getReportsByCourseId(courseId);
    }

    @GetMapping("/course/{courseId}/overall")
    public ResponseEntity<CourseOverallAttainment> getCourseOverallAttainment(@PathVariable String courseId) {
        return attainmentService.getCourseOverallAttainment(courseId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    try {
                        CourseOverallAttainment overall = attainmentService.calculateCourseOverallAttainment(courseId);
                        return ResponseEntity.ok(overall);
                    } catch (Exception e) {
                        return ResponseEntity.notFound().build();
                    }
                });
    }

    @PostMapping("/calculate/course/{courseId}")
    public ResponseEntity<CourseOverallAttainment> calculateCourseOverallAttainment(@PathVariable String courseId) {
        try {
            CourseOverallAttainment overall = attainmentService.calculateCourseOverallAttainment(courseId);
            return ResponseEntity.ok(overall);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
