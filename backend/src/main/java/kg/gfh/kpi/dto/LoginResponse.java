package kg.gfh.kpi.dto;

public record LoginResponse(
    Long userId,
    String email,
    String fullName,
    String role,
    boolean passwordExpired,
    boolean pdpaRequired
) {}
