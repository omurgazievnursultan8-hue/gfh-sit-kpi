package kg.gfh.kpi.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("test-secret-that-is-long-enough-32chars", 15, 7);
    }

    @Test
    void generateAndValidateAccessToken() {
        String token = jwtService.generateAccessToken(42L, "user@test.com");
        assertThat(jwtService.isTokenValid(token)).isTrue();
        assertThat(jwtService.extractUserId(token)).isEqualTo(42L);
        assertThat(jwtService.extractEmail(token)).isEqualTo("user@test.com");
    }

    @Test
    void expiredTokenIsInvalid() {
        JwtService shortLivedService = new JwtService("test-secret-that-is-long-enough-32chars", 0, 7);
        String token = shortLivedService.generateAccessToken(1L, "a@b.com");
        assertThat(shortLivedService.isTokenValid(token)).isFalse();
    }

    @Test
    void generateRefreshTokenIsNotEmpty() {
        String raw = jwtService.generateRefreshTokenRaw();
        assertThat(raw).isNotBlank().hasSizeGreaterThan(32);
    }

    @Test
    void hashRefreshTokenIsDeterministic() {
        String hash1 = jwtService.hashToken("my-token");
        String hash2 = jwtService.hashToken("my-token");
        assertThat(hash1).isEqualTo(hash2);
    }
}
