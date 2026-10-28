package com.obe.copo.serviceImpl;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.obe.copo.dto.SheetAssessmentDto;
import com.obe.copo.service.PdfReportService;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class PdfReportServiceImpl implements PdfReportService {

    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, BaseColor.DARK_GRAY);
    private static final Font SUBTITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BaseColor.BLACK);
    private static final Font HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, BaseColor.WHITE);
    private static final Font CELL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 8, BaseColor.BLACK);
    private static final Font CELL_BOLD_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, BaseColor.BLACK);

    @Override
    public byte[] generateAssessmentPdf(SheetAssessmentDto sheet) throws Exception {
        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        // 1. Title & Header
        Paragraph title = new Paragraph(sheet.getInstitutionName(), TITLE_FONT);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        String examHeader = (sheet.getExamTitle() != null && !sheet.getExamTitle().isEmpty())
                ? sheet.getExamTitle()
                : (sheet.getExamType() != null ? sheet.getExamType() : "Assessment");
        Paragraph subtitle = new Paragraph(examHeader + " • CO-PO Attainment Assessment Report", SUBTITLE_FONT);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(10);
        document.add(subtitle);

        // Course Info Table
        PdfPTable infoTable = new PdfPTable(4);
        infoTable.setWidthPercentage(100);
        infoTable.setSpacingAfter(10);
        addInfoCell(infoTable, "Course Code:", sheet.getCourseCode());
        addInfoCell(infoTable, "Course Title:", sheet.getCourseTitle());
        addInfoCell(infoTable, "Semester & Year:", sheet.getSemesterAndYear());
        addInfoCell(infoTable, "Target Threshold:", sheet.getThreshold() + "%");
        document.add(infoTable);

        // 2. Student Marks & Results Table
        List<SheetAssessmentDto.QuestionMeta> qList = sheet.getMidtermQuestions();
        int totalCols = 2 + qList.size() + 1; // Student ID + Name + Qs + Total
        PdfPTable table = new PdfPTable(totalCols);
        table.setWidthPercentage(100);

        // Table Header
        BaseColor headerBg = new BaseColor(41, 128, 185); // Indigo/Blue
        addHeaderCell(table, "USN", headerBg);
        addHeaderCell(table, "Student Name", headerBg);
        for (SheetAssessmentDto.QuestionMeta q : qList) {
            addHeaderCell(table, q.getId() + "\n(" + q.getCoCode() + " / " + q.getMaxMarks() + "M)", headerBg);
        }
        String totalColHeader = (sheet.getExamType() != null ? sheet.getExamType() : "Exam") + "\nTotal";
        addHeaderCell(table, totalColHeader, new BaseColor(39, 174, 96)); // Green

        // Student Data Rows
        if (sheet.getStudents() != null) {
            for (SheetAssessmentDto.StudentRowDto s : sheet.getStudents()) {
                addCell(table, s.getStudentId(), CELL_FONT);
                addCell(table, s.getStudentName(), CELL_FONT);
                for (SheetAssessmentDto.QuestionMeta q : qList) {
                    String val = s.getMidScores() != null ? s.getMidScores().getOrDefault(q.getId(), "-") : "-";
                    addCell(table, (val == null || val.trim().isEmpty()) ? "-" : val, CELL_FONT);
                }
                String tot = (s.getMidTotal() != null) ? String.format("%.1f", s.getMidTotal()) : "-";
                addCell(table, tot, CELL_BOLD_FONT);
            }
        }

        // Question Summary Row: Attempted Count & Pass %
        addCell(table, "Attempted", CELL_BOLD_FONT);
        addCell(table, "-", CELL_BOLD_FONT);
        for (SheetAssessmentDto.QuestionMeta q : qList) {
            addCell(table, String.valueOf(q.getAttemptedCount()), CELL_BOLD_FONT);
        }
        addCell(table, "-", CELL_BOLD_FONT);

        addCell(table, "Pass %", CELL_BOLD_FONT);
        addCell(table, "-", CELL_BOLD_FONT);
        for (SheetAssessmentDto.QuestionMeta q : qList) {
            addCell(table, String.format("%.0f%%", q.getPassPercentage()), CELL_BOLD_FONT);
        }
        addCell(table, "-", CELL_BOLD_FONT);

        document.add(table);

        // 3. CO Summary Section
        Paragraph coHeading = new Paragraph("Course Outcome (CO) Summary", SUBTITLE_FONT);
        coHeading.setSpacingBefore(12);
        coHeading.setSpacingAfter(6);
        document.add(coHeading);

        PdfPTable coTable = new PdfPTable(4);
        coTable.setWidthPercentage(60);
        coTable.setHorizontalAlignment(Element.ALIGN_LEFT);
        addHeaderCell(coTable, "CO Code", headerBg);
        addHeaderCell(coTable, "Students Achieved", headerBg);
        addHeaderCell(coTable, "Attainment %", headerBg);
        addHeaderCell(coTable, "Result (Y/N)", headerBg);

        if (sheet.getCoSummary() != null) {
            for (SheetAssessmentDto.CoSummaryMeta cs : sheet.getCoSummary().values()) {
                addCell(coTable, cs.getCoCode(), CELL_FONT);
                addCell(coTable, String.valueOf(cs.getAchievedCount()), CELL_FONT);
                addCell(coTable, String.format("%.1f%%", cs.getAchievedPercent()), CELL_FONT);
                addCell(coTable, cs.getResult(), "Y".equals(cs.getResult()) ? CELL_BOLD_FONT : CELL_FONT);
            }
        }
        document.add(coTable);

        document.close();
        return out.toByteArray();
    }

    private void addInfoCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(label + " " + (value != null ? value : ""), CELL_FONT));
        cell.setBorder(Rectangle.NO_BORDER);
        table.addCell(cell);
    }

    private void addHeaderCell(PdfPTable table, String text, BaseColor bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, HEADER_FONT));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(3);
        table.addCell(cell);
    }
}
