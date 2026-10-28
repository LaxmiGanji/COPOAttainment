package com.obe.copo.controller;

import com.obe.copo.dto.MarksBatchRequest;
import com.obe.copo.model.StudentMarksRecord;
import com.obe.copo.service.MarksService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/marks")
public class MarksController {

    @Autowired
    private MarksService marksService;

    @GetMapping("/exam/{examId}")//http://localhost:8080/api/marks/exam/
    public List<StudentMarksRecord> getMarksByExamId(@PathVariable String examId) {
        return marksService.getMarksByExamId(examId);
    }

    @PostMapping("/batch")//http://localhost:8080/api/marks/batch
    public ResponseEntity<List<StudentMarksRecord>> saveBatchMarks(@RequestBody MarksBatchRequest request) {
        return ResponseEntity.ok(marksService.saveBatchMarks(request));
    }

    @GetMapping("/exam/{examId}/template")
    public ResponseEntity<byte[]> downloadExcelTemplate(@PathVariable String examId) {
        try {
            byte[] fileBytes = marksService.downloadExcelTemplate(examId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"marks_template_" + examId + ".xlsx\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(fileBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/exam/{examId}/import")
    public ResponseEntity<List<StudentMarksRecord>> uploadExcelMarks(@PathVariable String examId,
                                                                     @RequestParam("file") MultipartFile file) {
        try {
            List<StudentMarksRecord> records = marksService.uploadExcelMarks(examId, file);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
