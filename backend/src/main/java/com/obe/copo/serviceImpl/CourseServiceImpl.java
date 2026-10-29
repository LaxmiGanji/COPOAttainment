package com.obe.copo.serviceImpl;

import com.obe.copo.model.CoPoMapping;
import com.obe.copo.model.Course;
import com.obe.copo.repository.AttainmentReportRepository;
import com.obe.copo.repository.CourseOverallAttainmentRepository;
import com.obe.copo.repository.CourseRepository;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.repository.StudentMarksRecordRepository;
import com.obe.copo.service.CourseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CourseServiceImpl implements CourseService {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Autowired
    private StudentMarksRecordRepository studentMarksRecordRepository;

    @Autowired
    private AttainmentReportRepository attainmentReportRepository;

    @Autowired
    private CourseOverallAttainmentRepository courseOverallAttainmentRepository;

    @Override
    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    @Override
    public Optional<Course> getCourseById(String id) {
        return courseRepository.findById(id)
                .or(() -> courseRepository.findByCourseCode(id));
    }

    @Override
    public Course createCourse(Course course) {
        return courseRepository.save(course);
    }

    @Override
    public Optional<Course> updateCourse(String id, Course updatedCourse) {
        //may find a match—or may not.
        //Optional<> --> Optional.of()
        Optional<Course> existing = courseRepository.findById(id)
                .or(() -> courseRepository.findByCourseCode(id));
        if (existing.isEmpty()) {
            return Optional.empty();
        }
        updatedCourse.setId(existing.get().getId());
        return Optional.of(courseRepository.save(updatedCourse));
    }

    @Override
    public Optional<Course> updateCoPoMatrix(String id, List<CoPoMapping> mappings) {
        Optional<Course> existing = courseRepository.findById(id)
                .or(() -> courseRepository.findByCourseCode(id));
        return existing.map(course -> {
            course.setCoPoMappings(mappings);
            return courseRepository.save(course);
        });
    }

    @Override
    public boolean deleteCourse(String id) {
        // Find by MongoDB ID or Course Code (e.g. CS501)
        Optional<Course> courseOpt = courseRepository.findById(id)
                .or(() -> courseRepository.findByCourseCode(id));

        if (courseOpt.isPresent()) {
            String courseDbId = courseOpt.get().getId();

            // Cascading deletion to keep database clean and prevent orphaned records
            examAssessmentRepository.deleteByCourseId(courseDbId);
            studentMarksRecordRepository.deleteByCourseId(courseDbId);
            attainmentReportRepository.deleteByCourseId(courseDbId);
            courseOverallAttainmentRepository.deleteByCourseId(courseDbId);

            courseRepository.deleteById(courseDbId);
            return true;
        }
        return false;
    }
}
