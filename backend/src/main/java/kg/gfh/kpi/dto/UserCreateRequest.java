package kg.gfh.kpi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kg.gfh.kpi.enums.Role;

public record UserCreateRequest(
    @NotBlank String fullName,
    @NotBlank @Email String email,
    @NotNull Role role,
    String position,
    Long unitId,
    Long managerId
) {}
