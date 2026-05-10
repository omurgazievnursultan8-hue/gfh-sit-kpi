package kg.gfh.kpi.dto;

public record DashboardEventResponse(
    Long id,
    String action,
    String text,
    String iconType,
    String timestamp
) {}
