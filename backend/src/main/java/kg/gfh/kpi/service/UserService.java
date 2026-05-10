package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.*;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.PasswordPolicyValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;

    @Transactional
    public UserResponse createUser(UserCreateRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ApiException("EMAIL_ALREADY_EXISTS",
                    "Пользователь с таким email уже already exists",
                    "Бул email менен колдонуучу already exists");
        }
        String tempPassword = generateTempPassword();
        var result = passwordPolicyValidator.validate(tempPassword, List.of());
        if (!result.valid()) {
            tempPassword = "TempPass123!@#";
        }

        User user = new User();
        user.setFullName(req.fullName());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setRole(req.role());
        user.setPosition(req.position());
        user.setUnitId(req.unitId());
        user.setManagerId(req.managerId());
        user.setActive(true);
        user.setPasswordUpdatedAt(null);
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest req) {
        User user = findOrThrow(id);
        if (req.fullName() != null) user.setFullName(req.fullName());
        if (req.role() != null) user.setRole(req.role());
        if (req.position() != null) user.setPosition(req.position());
        if (req.unitId() != null) user.setUnitId(req.unitId());
        if (req.managerId() != null) user.setManagerId(req.managerId());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public void deactivateUser(Long id) {
        User user = findOrThrow(id);
        user.setActive(false);
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(id);
    }

    @Transactional
    public void reactivateUser(Long id) {
        User user = findOrThrow(id);
        user.setActive(true);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = findOrThrow(userId);
        if (currentPassword != null && !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException("INVALID_CURRENT_PASSWORD",
                    "Текущий пароль неверен", "Учурдагы сырсөз туура эмес");
        }
        List<String> history = user.getPasswordHistory() != null ? user.getPasswordHistory() : List.of();
        var result = passwordPolicyValidator.validate(newPassword, history);
        if (!result.valid()) {
            throw new ApiException("WEAK_PASSWORD", result.violation(), result.violation());
        }
        List<String> newHistory = new ArrayList<>(history);
        newHistory.add(user.getPasswordHash());
        if (newHistory.size() > 5) newHistory = newHistory.subList(newHistory.size() - 5, newHistory.size());

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordHistory(newHistory);
        user.setPasswordUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public Page<UserResponse> listUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(UserResponse::from);
    }

    public UserResponse getUser(Long id) {
        return UserResponse.from(findOrThrow(id));
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                        "Пользователь не найден", "Колдонуучу табылган жок"));
    }

    private String generateTempPassword() {
        return "Temp" + java.util.UUID.randomUUID().toString().substring(0, 8) + "1!";
    }
}
