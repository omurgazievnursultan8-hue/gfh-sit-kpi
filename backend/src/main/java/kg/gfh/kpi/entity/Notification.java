package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter
public class Notification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(name = "title_ru", nullable = false, length = 255)
    private String titleRu;

    @Column(name = "title_kg", nullable = false, length = 255)
    private String titleKg;

    @Column(name = "body_ru", columnDefinition = "TEXT")
    private String bodyRu;

    @Column(name = "body_kg", columnDefinition = "TEXT")
    private String bodyKg;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
