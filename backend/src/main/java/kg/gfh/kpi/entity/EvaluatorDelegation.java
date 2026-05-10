package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluator_delegations")
@Getter @Setter
public class EvaluatorDelegation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluatee_id", nullable = false)
    private Long evaluateeId;

    @Column(name = "original_evaluator_id", nullable = false)
    private Long originalEvaluatorId;

    @Column(name = "delegated_to_id", nullable = false)
    private Long delegatedToId;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to", nullable = false)
    private LocalDate validTo;

    private String reason;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
