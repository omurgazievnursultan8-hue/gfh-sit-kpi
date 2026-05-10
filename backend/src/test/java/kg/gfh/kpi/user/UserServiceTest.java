package kg.gfh.kpi.user;

import kg.gfh.kpi.dto.UserCreateRequest;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.PasswordPolicyValidator;
import kg.gfh.kpi.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordPolicyValidator passwordPolicyValidator;
    @InjectMocks UserService userService;

    @Test
    void createUserWithDuplicateEmailThrows() {
        when(userRepository.existsByEmail("a@b.com")).thenReturn(true);
        var req = new UserCreateRequest("Test User", "a@b.com", Role.EMPLOYEE, null, null, null);
        assertThatThrownBy(() -> userService.createUser(req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deactivateUserRevokesAccess() {
        User user = new User();
        user.setId(1L);
        user.setActive(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        userService.deactivateUser(1L);

        assertThat(user.isActive()).isFalse();
        verify(userRepository).save(user);
    }

    @Test
    void reactivateUserSetsActiveTrue() {
        User user = new User();
        user.setId(2L);
        user.setActive(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        userService.reactivateUser(2L);

        assertThat(user.isActive()).isTrue();
    }

    @Test
    void changePasswordWithWeakPasswordThrows() {
        User user = new User();
        user.setId(1L);
        user.setPasswordHash("$2a$12$hashedCurrentPass");
        user.setPasswordHistory(java.util.List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("currentPass", "$2a$12$hashedCurrentPass")).thenReturn(true);
        when(passwordPolicyValidator.validate("weak", java.util.List.of()))
                .thenReturn(new PasswordPolicyValidator.ValidationResult(false, "too weak"));

        assertThatThrownBy(() -> userService.changePassword(1L, "currentPass", "weak"))
                .isInstanceOf(ApiException.class);
    }
}
