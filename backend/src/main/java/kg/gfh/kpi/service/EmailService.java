package kg.gfh.kpi.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    public void sendPasswordResetLink(String email, String resetLink) {
        log.info("Sending password reset email to {} with link: {}", email, resetLink);
    }
}
