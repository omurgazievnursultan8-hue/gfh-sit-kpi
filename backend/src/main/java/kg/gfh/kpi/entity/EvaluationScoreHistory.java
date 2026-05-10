package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_score_history")
@Getter @Setter
public class EvaluationScoreHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false)
    private Long evaluationId;

    @Column(name = "criteria_id", nullable = false)
    private Long criteriaId;

    // Denormalized for query performance — avoids JOIN on criteria table per rating computation
    @Enumerated(EnumType.STRING)
    @Column(name = "criteria_type", nullable = false)
    private Criteria.CriteriaType criteriaType;

    @Column(name = "raw_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal rawValue;

    @Column(name = "weighted_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal weightedValue;

    @Column(name = "weight_snapshot", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightSnapshot;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();
}
