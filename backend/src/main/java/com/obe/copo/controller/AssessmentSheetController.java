package com.obe.copo.controller;

import com.obe.copo.dto.SheetAssessmentDto;
import com.obe.copo.service.AssessmentSheetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assessment-sheet")
public class AssessmentSheetController {

    @Autowired
    private AssessmentSheetService assessmentSheetService;

    //Loads the default template matching the reference sheet.
    @GetMapping("/template")//http://localhost:8080/api/assessment-sheet/template
    public ResponseEntity<SheetAssessmentDto> getDefaultTemplate() {
        return ResponseEntity.ok(assessmentSheetService.getDefaultTemplate());
    }


     //Dynamically generates the assessment sheet template for any course & its mapped questions.
     //All question threshold marks are calculated automatically in backend (T_Q = M_Q * threshold%).
     //Marks start completely blank for faculty entry.

    @GetMapping("/course/{courseId}")//http:localhost:8080/api/assessment-sheet/course/1
    public ResponseEntity<SheetAssessmentDto> getTemplateForCourse(
            @PathVariable String courseId,
            @RequestParam(required = false) String examId,
            @RequestParam(required = false) String examType) {
        return ResponseEntity.ok(assessmentSheetService.getTemplateForCourse(courseId, examId, examType));
    }


//     Executes ALL mathematical formulas and evaluations strictly on the backend.
//     The frontend only transmits raw marks entered by faculty.

    @PostMapping("/calculate")
    public ResponseEntity<SheetAssessmentDto> calculateSheet(@RequestBody SheetAssessmentDto input) {
        return ResponseEntity.ok(assessmentSheetService.calculateSheet(input));
    }

    //Calculates sheet outcomes and persists all entered student marks into MongoDB.
    @PostMapping("/save")
    public ResponseEntity<SheetAssessmentDto> saveAssessmentSheetMarks(@RequestBody SheetAssessmentDto input) {
        return ResponseEntity.ok(assessmentSheetService.saveAssessmentSheetMarks(input));
    }

   
    @PostMapping("/export-excel")
    public ResponseEntity<byte[]> exportExcel(@RequestBody SheetAssessmentDto input) {
        try {
            byte[] fileBytes = assessmentSheetService.exportExcel(input);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CO_PO_Attainment_Assessment.xlsx\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(fileBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    //Exports high-resolution PDF assessment report with tables and CO summaries.
    @PostMapping("/export-pdf")
    public ResponseEntity<byte[]> exportPdf(@RequestBody SheetAssessmentDto input) {
        try {
            byte[] fileBytes = assessmentSheetService.exportPdf(input);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CO_PO_Attainment_Assessment.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(fileBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
