package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Dedicated Student model representing student profile and credentials.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "students")
public class Student {
    @Id
    private String id;
    private String usn;
    private String name;
    private String email;
    private String department;
    private String semester;
    private String section;
    private String password;

    public Student(String usn, String name) {
        this.usn = usn;
        this.name = name;
    }
}
