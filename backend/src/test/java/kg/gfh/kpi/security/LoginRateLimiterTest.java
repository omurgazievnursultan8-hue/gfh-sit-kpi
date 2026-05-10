package kg.gfh.kpi.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRateLimiterTest {

    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new LoginRateLimiter();
    }

    @Test
    void firstFiveAttemptsAreAllowed() {
        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryConsume("192.168.1.1")).isTrue();
        }
    }

    @Test
    void sixthAttemptIsBlocked() {
        for (int i = 0; i < 5; i++) limiter.tryConsume("10.0.0.1");
        assertThat(limiter.tryConsume("10.0.0.1")).isFalse();
    }

    @Test
    void differentIpsHaveSeparateLimits() {
        for (int i = 0; i < 5; i++) limiter.tryConsume("1.1.1.1");
        assertThat(limiter.tryConsume("2.2.2.2")).isTrue();
    }
}
