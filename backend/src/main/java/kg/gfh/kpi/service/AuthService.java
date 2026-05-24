package kg.gfh.kpi.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import kg.gfh.kpi.dto.LoginRequest;
import kg.gfh.kpi.dto.LoginResponse;
import kg.gfh.kpi.entity.RefreshToken;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.access-token-minutes:15}")
    private long accessTokenMinutes;

    @Transactional
    public LoginResponse login(LoginRequest request, String ip, String userAgent,
                               HttpServletResponse response) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS",
                        "Неверный email или пароль", "Email же сырсөз туура эмес"));

        if (!user.isActive()) {
            throw new ApiException("ACCOUNT_DISABLED",
                    "Аккаунт деактивирован", "Аккаунт өчүрүлгөн");
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new ApiException("ACCOUNT_LOCKED",
                    "Аккаунт заблокирован до " + user.getLockedUntil(),
                    "Аккаунт " + user.getLockedUntil() + " чейин бөгөттөлгөн");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            handleFailedLogin(user);
            throw new ApiException("INVALID_CREDENTIALS",
                    "Неверный email или пароль", "Email же сырсөз туура эмес");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String rawRefresh = jwtService.generateRefreshTokenRaw();
        String hashRefresh = jwtService.hashToken(rawRefresh);

        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setTokenHash(hashRefresh);
        rt.setIssuedAt(LocalDateTime.now());
        rt.setExpiresAt(LocalDateTime.now().plusDays(jwtService.refreshTokenDays()));
        rt.setUserAgent(userAgent);
        rt.setIpAddress(ip);
        refreshTokenRepository.save(rt);

        setTokenCookies(response, accessToken, rawRefresh);

        boolean passwordExpired = user.getPasswordUpdatedAt() != null &&
                user.getPasswordUpdatedAt().isBefore(LocalDateTime.now().minusDays(90));

        return new LoginResponse(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole().name(), passwordExpired, false);
    }

    @Transactional
    public void logout(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken != null) {
            String hash = jwtService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
                rt.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(rt);
            });
        }
        clearTokenCookies(response);
    }

    @Transactional
    public void refresh(String rawRefreshToken, String ip, String userAgent, HttpServletResponse response) {
        if (rawRefreshToken == null) {
            throw new ApiException("INVALID_REFRESH_TOKEN",
                    "Refresh token отсутствует", "Refresh token жок");
        }
        String hash = jwtService.hashToken(rawRefreshToken);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException("INVALID_REFRESH_TOKEN",
                        "Недействительный refresh token", "Жараксыз refresh token"));

        if (rt.getRevokedAt() != null) {
            refreshTokenRepository.revokeAllByUserId(rt.getUserId());
            clearTokenCookies(response);
            throw new ApiException("TOKEN_REUSE_DETECTED",
                    "Обнаружено повторное использование токена",
                    "Токенди кайра колдонуу аныкталды");
        }

        if (rt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("REFRESH_TOKEN_EXPIRED",
                    "Refresh token истёк", "Refresh token мөөнөтү бүттү");
        }

        rt.setRevokedAt(LocalDateTime.now());
        rt.setUsedAt(LocalDateTime.now());
        refreshTokenRepository.save(rt);

        User user = userRepository.findById(rt.getUserId())
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                        "Пользователь не найден", "Колдонуучу табылган жок"));
        String newAccess = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String newRawRefresh = jwtService.generateRefreshTokenRaw();

        RefreshToken newRt = new RefreshToken();
        newRt.setUserId(user.getId());
        newRt.setTokenHash(jwtService.hashToken(newRawRefresh));
        newRt.setIssuedAt(LocalDateTime.now());
        newRt.setExpiresAt(LocalDateTime.now().plusDays(jwtService.refreshTokenDays()));
        newRt.setIpAddress(ip);
        newRt.setUserAgent(userAgent);
        refreshTokenRepository.save(newRt);

        setTokenCookies(response, newAccess, newRawRefresh);
    }

    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= 5) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(30));
            user.setFailedLoginAttempts(0);
        }
        userRepository.save(user);
    }

    private void setTokenCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        addCookie(response, "access_token", accessToken, (int)(accessTokenMinutes * 60));
        addCookie(response, "refresh_token", refreshToken,
                (int)(jwtService.refreshTokenDays() * 24 * 3600));
    }

    private void clearTokenCookies(HttpServletResponse response) {
        addCookie(response, "access_token", "", 0);
        addCookie(response, "refresh_token", "", 0);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }
}
