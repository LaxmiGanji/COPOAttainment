package com.obe.copo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Dedicated Faculty model representing faculty credentials and profile.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "faculty")
public class Faculty {
    @Id
    private String id;
    private String facultyId;
    private String name;
    private String email;
    private String password;
    private String department;
    private String designation;
}
