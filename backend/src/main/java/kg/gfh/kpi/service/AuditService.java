package kg.gfh.kpi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Direct-write audit logging for explicit audit points (file downloads, etc.).
 * M5 adds Spring AOP layer for automatic method-level auditing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final JdbcTemplate jdbcTemplate;

    public void logFileDownload(Long userId, Long fileId, String fileName) {
        log("FILE_DOWNLOAD", userId, "evaluation_file", fileId, fileName);
    }

    public void logExport(Long userId, String reportType, Long entityId) {
        log("EXPORT", userId, "report", entityId, reportType);
    }

    private void log(String action, Long userId, String entityType, Long entityId, String detail) {
        try {
            jdbcTemplate.update(
                "INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_value) " +
                "VALUES (?, ?, ?, ?, ?::jsonb)",
                userId, action, entityType, entityId,
                detail != null ? "{\"detail\":\"" + detail.replace("\"", "\\\"") + "\"}" : null
            );
        } catch (Exception e) {
            log.warn("Failed to write audit log: action={} userId={} entityId={}", action, userId, entityId);
        }
    }
}
