package kg.gfh.kpi.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CsrfCookieFilter csrfCookieFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .ignoringRequestMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/logout",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/password/forgot",
                    "/api/v1/auth/password/reset"
                ))
            .authorizeHttpRequests(auth -> auth
                // sendError(...) by CsrfFilter/AccessDeniedHandlerImpl triggers
                // a Tomcat ERROR dispatch that re-enters the security chain.
                // Permit ERROR dispatches so the original status code (e.g. 403)
                // is preserved instead of being overwritten to 401 by our
                // authenticationEntryPoint.
                .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                .requestMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/logout",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/password/forgot",
                    "/api/v1/auth/password/reset",
                    "/actuator/health",
                    "/actuator/info",
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            // Without an explicit entry point Spring falls back to a 403 for
            // unauthenticated requests. Return 401 so the SPA can distinguish
            // "expired/missing token" (refresh + retry, else redirect to login)
            // from a genuine 403 access-denial.
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, e) ->
                    res.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED)))
            .addFilterBefore(jwtAuthFilter, CsrfFilter.class)
            // CsrfCookieFilter must run AFTER SessionManagementFilter:
            // SessionManagementFilter's CsrfAuthenticationStrategy rotates the
            // XSRF token on each authenticated request (deletes old, defers new).
            // Calling csrfToken.getToken() afterward materialises the new token
            // back into the XSRF-TOKEN cookie. If it runs earlier, the cookie
            // is deleted with no replacement and every subsequent request 403s.
            .addFilterAfter(csrfCookieFilter,
                org.springframework.security.web.session.SessionManagementFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
