package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import kg.gfh.kpi.entity.PasswordResetToken;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.PasswordResetTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.JwtService;
import kg.gfh.kpi.service.EmailService;
import kg.gfh.kpi.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/auth/password")
@RequiredArgsConstructor
public class AuthPasswordController {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final JwtService jwtService;
    private final UserService userService;
    private final EmailService emailService;

    record ForgotRequest(@NotBlank @Email String email) {}
    record ResetRequest(@NotBlank String token, @NotBlank String newPassword) {}

    @PostMapping("/forgot")
    public ResponseEntity<Void> forgot(@Valid @RequestBody ForgotRequest req) {
        userRepository.findByEmail(req.email()).ifPresent(user -> {
            String raw = jwtService.generateRefreshTokenRaw();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setUserId(user.getId());
            prt.setTokenHash(jwtService.hashToken(raw));
            prt.setIssuedAt(LocalDateTime.now());
            prt.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            resetTokenRepository.save(prt);
            emailService.sendPasswordResetLink(user.getEmail(),
                    "https://gfh.internal/reset-password?token=" + raw);
        });
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@Valid @RequestBody ResetRequest req) {
        String hash = jwtService.hashToken(req.token());
        PasswordResetToken prt = resetTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException("INVALID_RESET_TOKEN",
                        "Недействительная или истёкшая ссылка",
                        "Жараксыз же мөөнөтү өткөн шилтеме"));
        if (prt.getUsedAt() != null || prt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("INVALID_RESET_TOKEN",
                    "Ссылка уже использована или истёкла",
                    "Шилтеме буга чейин колдонулган же мөөнөтү өткөн");
        }
        userService.changePassword(prt.getUserId(), null, req.newPassword());
        prt.setUsedAt(LocalDateTime.now());
        resetTokenRepository.save(prt);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin-reset/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> adminReset(@PathVariable Long userId) {
        userService.changePassword(userId, null, "TempReset1!");
        return ResponseEntity.ok().build();
    }
}
