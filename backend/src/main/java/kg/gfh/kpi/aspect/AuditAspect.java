package kg.gfh.kpi.aspect;

import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint pjp, Audited audited) throws Throwable {
        Object result = pjp.proceed();

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userName = auth != null ? auth.getName() : "system";

            Long entityId = null;
            Object[] args = pjp.getArgs();
            MethodSignature sig = (MethodSignature) pjp.getSignature();
            String[] paramNames = sig.getParameterNames();
            for (int i = 0; i < args.length; i++) {
                if (paramNames[i].endsWith("Id") && args[i] instanceof Number) {
                    entityId = ((Number) args[i]).longValue();
                    break;
                }
            }

            auditService.log(null, userName, audited.action(), audited.entityType(),
                entityId, null, null);
        } catch (Exception e) {
            log.warn("AuditAspect failed to log: {}", e.getMessage());
        }

        return result;
    }
}
