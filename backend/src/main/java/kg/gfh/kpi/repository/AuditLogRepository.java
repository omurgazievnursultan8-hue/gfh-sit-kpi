package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:userId IS NULL OR a.userId = :userId)
          AND (:action IS NULL OR a.action = :action)
          AND (:entityType IS NULL OR a.entityType = :entityType)
          AND (:from IS NULL OR a.timestamp >= :from)
          AND (:to IS NULL OR a.timestamp <= :to)
        ORDER BY a.timestamp DESC
        """)
    Page<AuditLog> search(
        @Param("userId") Long userId,
        @Param("action") String action,
        @Param("entityType") String entityType,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        Pageable pageable
    );

    long countByTimestampAfter(LocalDateTime since);
}
