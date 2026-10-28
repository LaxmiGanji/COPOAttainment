package com.obe.copo.serviceImpl;

import com.obe.copo.service.ExcelMarksService;
import com.obe.copo.service.AttainmentCalculationService;

import com.obe.copo.model.*;
import com.obe.copo.repository.CourseRepository;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.repository.StudentMarksRecordRepository;
import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.service.ExamService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

@Service
public class ExcelMarksServiceImpl implements ExcelMarksService {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Autowired
    private StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired
    private ExamService examService;

    @Autowired
    private AttainmentCalculationService attainmentCalculationService;


    /**
     * Generates a downloadable Excel template with Course & Exam details,
     * Question No., Sub-question No., Mapped COs, and Max Marks headers.
     */
    @Override
    public byte[] generateExcelTemplate(String examId) throws Exception {
        ExamAssessment exam = examAssessmentRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));
        Course course = courseRepository.findById(exam.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + exam.getCourseId()));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Marks Sheet");

            // Fonts & Styles
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 12);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setFont(titleFont);

            CellStyle metaStyle = workbook.createCellStyle();
            metaStyle.setFont(titleFont);

            // Row 0: Exam Information
            Row metaRow0 = sheet.createRow(0);
            metaRow0.createCell(0).setCellValue("Course: " + course.getCourseCode() + " - " + course.getCourseName());
            metaRow0.createCell(3).setCellValue("Exam: " + exam.getTitle() + " (" + exam.getExamType() + ")");
            metaRow0.createCell(6).setCellValue("Evaluation Rule: " + exam.getRuleEngineCase().name());

            // Collect all sub-questions in order
            List<SubQuestionConfig> subQuestions = new ArrayList<>();
            for (QuestionConfig qc : exam.getQuestions()) {
                if (qc.getSubQuestions() != null && !qc.getSubQuestions().isEmpty()) {
                    subQuestions.addAll(qc.getSubQuestions());
                } else {
                    String co = (qc.getCoCode() != null && !qc.getCoCode().trim().isEmpty())
                            ? qc.getCoCode().trim()
                            : (qc.getPrimaryCoCode() != null ? qc.getPrimaryCoCode().trim() : "CO1");
                    subQuestions.add(new SubQuestionConfig(qc.getQuestionId(), qc.getQuestionId(), qc.getLabel(), qc.getTotalMaxMarks(), co, "L2"));
                }
            }

            // Row 2: Main Question Header
            Row qRow = sheet.createRow(2);
            qRow.createCell(0).setCellValue("SL NO");
            qRow.createCell(1).setCellValue("USN");
            qRow.createCell(2).setCellValue("STUDENT NAME");

            // Row 3: Sub-Question Label Header
            Row subQRow = sheet.createRow(3);
            subQRow.createCell(0).setCellValue("");
            subQRow.createCell(1).setCellValue("");
            subQRow.createCell(2).setCellValue("");

            // Row 4: CO Mapping Header
            Row coRow = sheet.createRow(4);
            coRow.createCell(0).setCellValue("");
            coRow.createCell(1).setCellValue("");
            coRow.createCell(2).setCellValue("Mapped CO:");

            // Row 5: Max Marks Header
            Row maxMarksRow = sheet.createRow(5);
            maxMarksRow.createCell(0).setCellValue("");
            maxMarksRow.createCell(1).setCellValue("");
            maxMarksRow.createCell(2).setCellValue("Max Marks:");

            int colIdx = 3;
            for (SubQuestionConfig sqc : subQuestions) {
                Cell qCell = qRow.createCell(colIdx);
                qCell.setCellValue(sqc.getParentQuestionId() != null ? sqc.getParentQuestionId() : sqc.getSubQuestionId());
                qCell.setCellStyle(headerStyle);

                Cell subQCell = subQRow.createCell(colIdx);
                subQCell.setCellValue(sqc.getSubQuestionId());
                subQCell.setCellStyle(headerStyle);

                Cell coCell = coRow.createCell(colIdx);
                coCell.setCellValue(sqc.getCoCode());
                coCell.setCellStyle(headerStyle);

                Cell mmCell = maxMarksRow.createCell(colIdx);
                mmCell.setCellValue(sqc.getMaxMarks());
                mmCell.setCellStyle(headerStyle);

                colIdx++;
            }

            // Prepopulate some sample student rows for faculty convenience
            String[][] sampleStudents = {
                    {"1", "1MS21CS001", "Aarav Sharma"},
                    {"2", "1MS21CS002", "Ananya Rao"},
                    {"3", "1MS21CS003", "Bhavya Patel"},
                    {"4", "1MS21CS004", "Chetan Kumar"},
                    {"5", "1MS21CS005", "Divya Nair"}
            };

            int startRow = 6;
            for (String[] s : sampleStudents) {
                Row row = sheet.createRow(startRow++);
                row.createCell(0).setCellValue(s[0]);
                row.createCell(1).setCellValue(s[1]);
                row.createCell(2).setCellValue(s[2]);
                // Leave score columns empty for faculty to enter marks
            }

            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Parses uploaded Excel file, processes marks through the 4-step Rule Engine,
     * saves student records, and triggers CO-PO Attainment calculation.
     */
    @Override
    public List<StudentMarksRecord> importMarksFromExcel(String examId, MultipartFile file) throws Exception {
        ExamAssessment exam = examAssessmentRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        List<StudentMarksRecord> savedRecords = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            // Read headers from row 3 (sub-question IDs)
            Row subQRow = sheet.getRow(3);
            if (subQRow == null) {
                throw new IllegalArgumentException("Invalid Excel template format. Sub-question header row not found.");
            }

            Map<Integer, String> colToSubQId = new HashMap<>();
            for (int col = 3; col < subQRow.getLastCellNum(); col++) {
                Cell cell = subQRow.getCell(col);
                if (cell != null && cell.getCellType() == CellType.STRING) {
                    String subQId = cell.getStringCellValue().trim();
                    if (!subQId.isEmpty()) {
                        colToSubQId.put(col, subQId);
                    }
                }
            }

            // Delete previous records for clean re-ingestion
            studentMarksRecordRepository.deleteByExamId(examId);

            // Process data rows starting from row 6
            for (int r = 6; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Cell usnCell = row.getCell(1);
                Cell nameCell = row.getCell(2);

                if (usnCell == null) continue;
                String usn = getCellValueAsString(usnCell).trim();
                if (usn.isEmpty()) continue;

                String name = nameCell != null ? getCellValueAsString(nameCell).trim() : "Student";

                Map<String, Double> subQScores = new HashMap<>();
                for (Map.Entry<Integer, String> entry : colToSubQId.entrySet()) {
                    int col = entry.getKey();
                    String subQId = entry.getValue();
                    Cell markCell = row.getCell(col);
                    double score = 0.0;
                    if (markCell != null) {
                        if (markCell.getCellType() == CellType.NUMERIC) {
                            score = markCell.getNumericCellValue();
                        } else if (markCell.getCellType() == CellType.STRING) {
                            try {
                                score = Double.parseDouble(markCell.getStringCellValue().trim());
                            } catch (Exception ignored) {}
                        }
                    }
                    subQScores.put(subQId, score);
                }

                // Execute Rule Evaluation
                EvaluationResult evalResult = examService.evaluateStudentMarks(exam, subQScores);

                StudentMarksRecord record = new StudentMarksRecord();
                record.setCourseId(exam.getCourseId());
                record.setExamId(exam.getId());
                record.setStudentUsn(usn);
                record.setStudentName(name);
                record.setSubQuestionScores(subQScores);
                record.setMainQuestionScores(evalResult.getMainQuestionScores());
                record.setSelectedQuestionIds(evalResult.getSelectedQuestionIds());
                record.setIgnoredQuestionIds(evalResult.getIgnoredQuestionIds());
                record.setTotalScore(evalResult.getTotalScore());
                record.setEvaluationSteps(evalResult.getEvaluationSteps());

                savedRecords.add(studentMarksRecordRepository.save(record));
            }
        }

        // Trigger attainment calculation automatically
        if (!savedRecords.isEmpty()) {
            attainmentCalculationService.calculateExamAttainment(examId);
        }

        return savedRecords;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        return "";
    }
}
