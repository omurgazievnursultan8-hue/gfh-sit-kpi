package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "pdpa_consents")
@Getter @Setter
public class PdpaConsent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "accepted_at", nullable = false) private LocalDateTime acceptedAt = LocalDateTime.now();
    @Column(nullable = false) private String version;
    @Column(name = "ip_address") private String ipAddress;
}
