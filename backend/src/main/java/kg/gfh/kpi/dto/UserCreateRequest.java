package kg.gfh.kpi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PastOrPresent;
import kg.gfh.kpi.enums.EmploymentType;
import kg.gfh.kpi.enums.Role;

import java.time.LocalDate;

public record UserCreateRequest(
    @NotBlank String fullName,
    String firstName,
    String lastName,
    String middleName,
    String employeeNumber,
    @NotBlank @Email String email,
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "invalid phone") String phone,
    String avatarUrl,
    @PastOrPresent LocalDate hireDate,
    LocalDate terminationDate,
    EmploymentType employmentType,
    @NotNull Role role,
    String position,
    Long positionId,
    Long unitId,
    Long managerId
) {}
