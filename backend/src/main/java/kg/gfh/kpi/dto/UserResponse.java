package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.EmploymentType;
import kg.gfh.kpi.enums.Role;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record UserResponse(
    Long id,
    String fullName,
    String firstName,
    String lastName,
    String middleName,
    String employeeNumber,
    String email,
    String phone,
    String avatarUrl,
    LocalDate hireDate,
    LocalDate terminationDate,
    EmploymentType employmentType,
    Role role,
    String position,
    Long positionId,
    Long unitId,
    Long managerId,
    boolean isActive,
    LocalDateTime createdAt,
    String tempPassword
) {
    public static UserResponse from(User u) {
        return from(u, null);
    }

    public static UserResponse from(User u, String tempPassword) {
        return new UserResponse(u.getId(), u.getFullName(),
            u.getFirstName(), u.getLastName(), u.getMiddleName(),
            u.getEmployeeNumber(), u.getEmail(), u.getPhone(), u.getAvatarUrl(),
            u.getHireDate(), u.getTerminationDate(), u.getEmploymentType(),
            u.getRole(), u.getPosition(), u.getPositionId(), u.getUnitId(), u.getManagerId(),
            u.isActive(), u.getCreatedAt(), tempPassword);
    }
}
