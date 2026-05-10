package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.PdpaConsent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PdpaConsentRepository extends JpaRepository<PdpaConsent, Long> {
    Optional<PdpaConsent> findTopByUserIdOrderByAcceptedAtDesc(Long userId);
}
