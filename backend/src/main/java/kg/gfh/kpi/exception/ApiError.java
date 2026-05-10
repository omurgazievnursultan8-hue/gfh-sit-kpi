package kg.gfh.kpi.exception;

import java.util.Map;

public record ApiError(
    String code,
    String messageRu,
    String messageKg,
    Map<String, Object> details
) {}
