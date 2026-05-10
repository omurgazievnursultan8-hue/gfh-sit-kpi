package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;

import java.time.LocalDateTime;

public record UserResponse(
    Long id,
    String fullName,
    String email,
    Role role,
    String position,
    Long unitId,
    Long managerId,
    boolean isActive,
    LocalDateTime createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(),
            u.getRole(), u.getPosition(), u.getUnitId(), u.getManagerId(),
            u.isActive(), u.getCreatedAt());
    }
}
