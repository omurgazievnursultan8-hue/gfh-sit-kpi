package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_periods")
@Getter @Setter
public class EvaluationPeriod {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PeriodType type;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "submission_deadline", nullable = false)
    private LocalDateTime submissionDeadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PeriodStatus status = PeriodStatus.DRAFT;

    @Column(name = "auto_created")
    private boolean autoCreated = false;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public enum PeriodType { MONTHLY, QUARTERLY, ANNUAL }
    public enum PeriodStatus { DRAFT, ACTIVE, CLOSED }
}
