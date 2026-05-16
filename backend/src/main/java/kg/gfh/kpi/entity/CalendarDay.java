package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A single day that deviates from the default weekday rule — a public holiday,
 * a transferred working day, or a transferred day off. Regular working days and
 * weekends are NOT stored; they are derived from the day of week.
 */
@Entity
@Table(name = "calendar_day")
@Getter @Setter
public class CalendarDay {

    public enum DayType {
        /** Public holiday — non-working. */
        HOLIDAY,
        /** Transferred working day (e.g. a Saturday made working). */
        WORKING,
        /** Transferred day off (e.g. a weekday made non-working). */
        DAY_OFF
    }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "day", nullable = false, unique = true)
    private LocalDate day;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_type", nullable = false, length = 20)
    private DayType dayType;

    @Column(name = "description_ru", length = 255)
    private String descriptionRu;

    @Column(name = "description_kg", length = 255)
    private String descriptionKg;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
