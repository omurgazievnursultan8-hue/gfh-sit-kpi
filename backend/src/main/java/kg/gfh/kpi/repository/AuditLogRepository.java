package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // Native query with explicit CASTs — Postgres needs typed parameters when
    // every filter may be null. JPQL `:p IS NULL OR ...` produces untyped binds
    // and breaks with "could not determine data type of parameter".
    @Query(value = """
        SELECT * FROM audit_log
        WHERE (CAST(:userId AS bigint)        IS NULL OR user_id     = CAST(:userId AS bigint))
          AND (CAST(:action AS varchar)       IS NULL OR action      = CAST(:action AS varchar))
          AND (CAST(:entityType AS varchar)   IS NULL OR entity_type = CAST(:entityType AS varchar))
          AND (CAST(:from AS timestamp)       IS NULL OR timestamp  >= CAST(:from AS timestamp))
          AND (CAST(:to   AS timestamp)       IS NULL OR timestamp  <= CAST(:to   AS timestamp))
        """,
        countQuery = """
        SELECT COUNT(*) FROM audit_log
        WHERE (CAST(:userId AS bigint)      IS NULL OR user_id     = CAST(:userId AS bigint))
          AND (CAST(:action AS varchar)     IS NULL OR action      = CAST(:action AS varchar))
          AND (CAST(:entityType AS varchar) IS NULL OR entity_type = CAST(:entityType AS varchar))
          AND (CAST(:from AS timestamp)     IS NULL OR timestamp  >= CAST(:from AS timestamp))
          AND (CAST(:to   AS timestamp)     IS NULL OR timestamp  <= CAST(:to   AS timestamp))
        """,
        nativeQuery = true)
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
