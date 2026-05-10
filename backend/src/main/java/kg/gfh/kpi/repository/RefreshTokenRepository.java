package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = CURRENT_TIMESTAMP WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
    void revokeAllByUserId(Long userId);
}
