package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.AuditLog;
import kg.gfh.kpi.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long userId, String userName, String action,
                    String entityType, Long entityId, String details, String ipAddress) {
        try {
            AuditLog entry = new AuditLog();
            entry.setUserId(userId);
            entry.setUserName(userName != null ? userName : "system");
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setNewValue(details);
            entry.setIpAddress(ipAddress);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log: action={}, userId={}", action, userId, e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFileDownload(Long userId, Long fileId, String fileName) {
        log(userId, null, "FILE_DOWNLOAD", "evaluation_file", fileId,
            "{\"fileName\":\"" + fileName.replace("\"", "\\\"") + "\"}", null);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logExport(Long userId, String reportType, Long entityId) {
        log(userId, null, "EXPORT_REPORT", "report", entityId,
            "{\"reportType\":\"" + reportType + "\"}", null);
    }
}
