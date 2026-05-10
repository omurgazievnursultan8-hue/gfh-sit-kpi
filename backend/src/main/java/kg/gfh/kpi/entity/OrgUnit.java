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

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    private Long version;
}
