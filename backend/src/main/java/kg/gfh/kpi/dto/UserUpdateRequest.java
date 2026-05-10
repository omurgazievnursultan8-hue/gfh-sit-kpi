package kg.gfh.kpi.dto;

import kg.gfh.kpi.enums.Role;

public record UserUpdateRequest(
    String fullName,
    Role role,
    String position,
    Long unitId,
    Long managerId
) {}
