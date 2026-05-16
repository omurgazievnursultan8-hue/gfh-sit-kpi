package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.EvaluatorDelegation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.function.Function;

public record DelegationResponse(
    Long id,
    Long evaluateeId,
    String evaluateeName,
    Long originalEvaluatorId,
    String originalEvaluatorName,
    Long delegatedToId,
    String delegatedToName,
    LocalDate validFrom,
    LocalDate validTo,
    String reason,
    boolean isActive,
    LocalDateTime createdAt
) {
    public static DelegationResponse from(EvaluatorDelegation d, Function<Long, String> nameOf) {
        return new DelegationResponse(d.getId(),
            d.getEvaluateeId(), nameOf.apply(d.getEvaluateeId()),
            d.getOriginalEvaluatorId(), nameOf.apply(d.getOriginalEvaluatorId()),
            d.getDelegatedToId(), nameOf.apply(d.getDelegatedToId()),
            d.getValidFrom(), d.getValidTo(), d.getReason(),
            d.isActive(), d.getCreatedAt());
    }
}
