package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.EvaluatorDelegation;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DelegationResponse(
    Long id,
    Long evaluateeId,
    Long originalEvaluatorId,
    Long delegatedToId,
    LocalDate validFrom,
    LocalDate validTo,
    String reason,
    boolean isActive,
    LocalDateTime createdAt
) {
    public static DelegationResponse from(EvaluatorDelegation d) {
        return new DelegationResponse(d.getId(), d.getEvaluateeId(),
            d.getOriginalEvaluatorId(), d.getDelegatedToId(),
            d.getValidFrom(), d.getValidTo(), d.getReason(),
            d.isActive(), d.getCreatedAt());
    }
}
