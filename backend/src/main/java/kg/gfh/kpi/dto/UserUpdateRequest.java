package kg.gfh.kpi.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PastOrPresent;
import kg.gfh.kpi.enums.EmploymentType;
import kg.gfh.kpi.enums.Role;

import java.time.LocalDate;

public record UserUpdateRequest(
    String fullName,
    String firstName,
    String lastName,
    String middleName,
    String employeeNumber,
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "invalid phone") String phone,
    String avatarUrl,
    @PastOrPresent LocalDate hireDate,
    LocalDate terminationDate,
    EmploymentType employmentType,
    Role role,
    String position,
    Long unitId,
    Long managerId
) {}
