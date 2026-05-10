package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import kg.gfh.kpi.enums.Role;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String position;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "manager_id")
    private Long managerId;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "password_updated_at")
    private LocalDateTime passwordUpdatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "password_history", columnDefinition = "jsonb")
    private List<String> passwordHistory;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Version
    private Long version;

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
