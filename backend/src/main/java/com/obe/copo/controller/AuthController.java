package com.obe.copo.controller;

import com.obe.copo.model.Faculty;
import com.obe.copo.model.Student;
import com.obe.copo.repository.FacultyRepository;
import com.obe.copo.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private FacultyRepository facultyRepository;

    @Autowired
    private StudentRepository studentRepository;

    @PostMapping("/faculty/login")
    public ResponseEntity<?> facultyLogin(@RequestBody Map<String, String> credentials) {
        String email = credentials.getOrDefault("email", "").trim();
        String password = credentials.getOrDefault("password", "").trim();
        String name = credentials.getOrDefault("name", "Faculty Member").trim();

        Faculty faculty = facultyRepository.findByEmail(email)
                .orElseGet(() -> {
                    Faculty newFaculty = Faculty.builder()
                            .facultyId("FAC-" + System.currentTimeMillis() % 10000)
                            .name(name)
                            .email(email)
                            .password(password)
                            .department("CSE")
                            .designation("Associate Professor")
                            .build();
                    return facultyRepository.save(newFaculty);
                });

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "role", "FACULTY",
                "user", faculty
        ));
    }

    @PostMapping("/student/login")
    public ResponseEntity<?> studentLogin(@RequestBody Map<String, String> credentials) {
        String usn = credentials.getOrDefault("usn", "").trim();
        String name = credentials.getOrDefault("name", "").trim();

        if (usn.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "USN is required"));
        }

        Student student = studentRepository.findByUsn(usn)
                .orElseGet(() -> {
                    Student newStudent = Student.builder()
                            .usn(usn)
                            .name(name.isEmpty() ? "Student " + usn : name)
                            .department("CSE")
                            .build();
                    return studentRepository.save(newStudent);
                });

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "role", "STUDENT",
                "user", student
        ));
    }

    @GetMapping("/faculty")
    public List<Faculty> getAllFaculty() {
        return facultyRepository.findAll();
    }

    @GetMapping("/students")
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }
}
