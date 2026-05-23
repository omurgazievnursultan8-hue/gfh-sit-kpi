package kg.gfh.kpi.auth;

import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("gfh_test").withUsername("gfh").withPassword("gfh");

    @org.springframework.test.context.DynamicPropertySource
    static void props(org.springframework.test.context.DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    void seed() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        User u = new User();
        u.setEmail("admin@gfh.kg");
        u.setFullName("Admin User");
        u.setPasswordHash(passwordEncoder.encode("Secret123!"));
        u.setRole(Role.ADMIN);
        u.setActive(true);
        u.setPasswordUpdatedAt(LocalDateTime.now());
        userRepository.save(u);
    }

    @Test
    void loginWithValidCredentialsReturns200AndSetsCookies() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@gfh.kg\",\"password\":\"Secret123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@gfh.kg"))
                .andExpect(cookie().exists("access_token"))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("access_token", true))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void loginWithWrongPasswordReturns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@gfh.kg\",\"password\":\"wrong\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    // Unauthenticated requests must return 401 (not 403) so the frontend axios
    // interceptor triggers token refresh / login redirect instead of silently
    // swallowing the error and rendering empty (zeroed) data.
    @Test
    void protectedEndpointWithNoTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/personal"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointWithInvalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/personal")
                .cookie(new Cookie("access_token", "invalid.jwt.token")))
                .andExpect(status().isUnauthorized());
    }
}
