package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import kg.gfh.kpi.enums.EmploymentType;
import kg.gfh.kpi.enums.Role;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"passwordHash", "passwordHistory", "unit", "manager"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "first_name", length = 128)
    private String firstName;

    @Column(name = "last_name", length = 128)
    private String lastName;

    @Column(name = "middle_name", length = 128)
    private String middleName;

    @Column(name = "employee_number", unique = true, length = 32)
    private String employeeNumber;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(length = 32)
    private String phone;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Column(name = "termination_date")
    private LocalDate terminationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 32)
    private EmploymentType employmentType;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Role role;

    @Column(length = 255)
    private String position;

    @Column(name = "position_id")
    private Long positionId;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "manager_id")
    private Long managerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", insertable = false, updatable = false)
    private OrgUnit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", insertable = false, updatable = false)
    private User manager;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    @Column(name = "preferred_language", length = 2)
    private String preferredLanguage;

    @Column(name = "password_updated_at")
    private LocalDateTime passwordUpdatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "password_history", columnDefinition = "jsonb")
    private List<String> passwordHistory;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "pdpa_accepted_at")
    private LocalDateTime pdpaAcceptedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
