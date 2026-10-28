package com.obe.copo.serviceImpl;

import com.obe.copo.dto.MarksBatchRequest;
import com.obe.copo.dto.StudentMarkInputDto;
import com.obe.copo.model.ExamAssessment;
import com.obe.copo.model.StudentMarksRecord;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.repository.StudentMarksRecordRepository;
import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.service.AttainmentCalculationService;
import com.obe.copo.service.ExamService;
import com.obe.copo.service.ExcelMarksService;
import com.obe.copo.service.MarksService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class MarksServiceImpl implements MarksService {

    @Autowired
    private StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Autowired
    private ExamService examService;

    @Autowired
    private ExcelMarksService excelMarksService;

    @Autowired
    private AttainmentCalculationService attainmentCalculationService;

    @Override
    public List<StudentMarksRecord> getMarksByExamId(String examId) {
        return studentMarksRecordRepository.findByExamId(examId);
    }

    @Override
    public List<StudentMarksRecord> saveBatchMarks(MarksBatchRequest request) {
        String examId = request.getExamId();
        ExamAssessment exam = examAssessmentRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        // Delete existing records to allow full sync from table
        studentMarksRecordRepository.deleteByExamId(examId);

        List<StudentMarksRecord> recordsToSave = request.getRecords().stream()
                .filter(input -> input.getStudentUsn() != null && !input.getStudentUsn().trim().isEmpty())
                .map(input -> {
                    EvaluationResult evalResult = examService.evaluateStudentMarks(exam, input.getSubQuestionScores());
                    StudentMarksRecord record = new StudentMarksRecord();
                    record.setCourseId(exam.getCourseId());
                    record.setExamId(exam.getId());
                    record.setStudentUsn(input.getStudentUsn().trim());
                    record.setStudentName(input.getStudentName() != null ? input.getStudentName().trim() : "Student");
                    record.setSubQuestionScores(input.getSubQuestionScores());
                    record.setMainQuestionScores(evalResult.getMainQuestionScores());
                    record.setSelectedQuestionIds(evalResult.getSelectedQuestionIds());
                    record.setIgnoredQuestionIds(evalResult.getIgnoredQuestionIds());
                    record.setTotalScore(evalResult.getTotalScore());
                    record.setEvaluationSteps(evalResult.getEvaluationSteps());
                    return record;
                })
                .toList();

        List<StudentMarksRecord> saved = studentMarksRecordRepository.saveAll(recordsToSave);

        // Trigger CO-PO Attainment Calculation
        if (!saved.isEmpty()) {
            attainmentCalculationService.calculateExamAttainment(examId);
        }

        return saved;
    }

    @Override
    public byte[] downloadExcelTemplate(String examId) throws Exception {
        return excelMarksService.generateExcelTemplate(examId);
    }

    @Override
    public List<StudentMarksRecord> uploadExcelMarks(String examId, MultipartFile file) throws Exception {
        return excelMarksService.importMarksFromExcel(examId, file);
    }
}
