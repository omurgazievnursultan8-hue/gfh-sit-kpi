package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import kg.gfh.kpi.enums.OrgUnitType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "org_units")
@Getter @Setter
public class OrgUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_kg", nullable = false)
    private String nameKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrgUnitType type;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "head_user_id")
    private Long headUserId;

    @Column(name = "code", unique = true)
    private String code;

    @Column(name = "name_ru_short")
    private String nameRuShort;

    @Column(name = "name_kg_short")
    private String nameKgShort;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    private Long version;
}
