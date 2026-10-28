package com.obe.copo.serviceImpl;

import com.obe.copo.model.Course;
import com.obe.copo.model.ExamAssessment;
import com.obe.copo.model.Student;
import com.obe.copo.model.StudentMarksRecord;
import com.obe.copo.repository.CourseRepository;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.repository.StudentMarksRecordRepository;
import com.obe.copo.repository.StudentRepository;
import com.obe.copo.service.StudentPortalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudentPortalServiceImpl implements StudentPortalService {

    @Autowired
    private StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Override
    public Map<String, Object> getStudentPerformance(String usn) {
        List<StudentMarksRecord> records = studentMarksRecordRepository.findByStudentUsn(usn);
        if (records.isEmpty()) {
            return Map.of("usn", usn, "records", Collections.emptyList());
        }

        // Batch load all unique Courses and Exams in 2 queries using findAllById
        Set<String> courseIds = records.stream().map(StudentMarksRecord::getCourseId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<String> examIds = records.stream().map(StudentMarksRecord::getExamId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<String, Course> courseMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, c -> c));
        Map<String, ExamAssessment> examMap = examAssessmentRepository.findAllById(examIds).stream()
                .collect(Collectors.toMap(ExamAssessment::getId, e -> e));

        List<Map<String, Object>> enrichedRecords = records.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("record", r);

            Course c = courseMap.get(r.getCourseId());
            if (c != null) {
                map.put("courseCode", c.getCourseCode());
                map.put("courseName", c.getCourseName());
                map.put("courseType", c.getCourseType());
                map.put("targetThresholdPercent", c.getTargetThresholdPercent());
            }

            ExamAssessment e = examMap.get(r.getExamId());
            if (e != null) {
                map.put("examTitle", e.getTitle());
                map.put("examType", e.getExamType());
                map.put("maxMarks", e.getMaxMarks());
                map.put("ruleCase", e.getRuleEngineCase());
                map.put("questionsConfig", e.getQuestions());
            }

            return map;
        }).toList();

        return Map.of(
                "usn", usn,
                "studentName", records.get(0).getStudentName(),
                "records", enrichedRecords,
                "courses", new ArrayList<>(courseMap.values())
        );
    }

    @Override
    public List<Map<String, String>> getDistinctStudents() {
        List<Student> students = studentRepository.findAll();
        if (!students.isEmpty()) {
            return students.stream()
                    .map(s -> Map.of("usn", s.getUsn(), "name", s.getName() != null ? s.getName() : ""))
                    .toList();
        }

        return studentMarksRecordRepository.findAll().stream()
                .filter(r -> r.getStudentUsn() != null && !r.getStudentUsn().isBlank())
                .collect(Collectors.toMap(
                        StudentMarksRecord::getStudentUsn,
                        r -> r.getStudentName() != null ? r.getStudentName() : "",
                        (existing, replacement) -> existing,
                        LinkedHashMap::new
                ))
                .entrySet().stream()
                .map(e -> Map.of("usn", e.getKey(), "name", e.getValue()))
                .toList();
    }
}
