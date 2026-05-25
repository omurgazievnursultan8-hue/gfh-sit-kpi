package kg.gfh.kpi.service;

import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.dto.*;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.PasswordPolicyValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024; // 2 MB
    private static final Map<String, byte[]> AVATAR_MAGIC = Map.of(
        "image/png",  new byte[]{(byte)0x89, 0x50, 0x4E, 0x47},
        "image/jpeg", new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF}
    );
    private static final Map<String, String> AVATAR_EXT = Map.of(
        "image/png", "png",
        "image/jpeg", "jpg"
    );

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;

    @Value("${app.upload-dir:/app/uploads}")
    private String uploadDir;

    @Audited(action = "CREATE_USER", entityType = "USER")
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
        user.setFirstName(req.firstName());
        user.setLastName(req.lastName());
        user.setMiddleName(req.middleName());
        user.setEmployeeNumber(req.employeeNumber());
        user.setEmail(req.email());
        user.setPhone(normalizePhone(req.phone()));
        user.setAvatarUrl(req.avatarUrl());
        user.setHireDate(req.hireDate());
        user.setTerminationDate(req.terminationDate());
        user.setEmploymentType(req.employmentType());
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
        if (req.firstName() != null) user.setFirstName(req.firstName());
        if (req.lastName() != null) user.setLastName(req.lastName());
        if (req.middleName() != null) user.setMiddleName(req.middleName());
        if (req.employeeNumber() != null) user.setEmployeeNumber(req.employeeNumber());
        if (req.phone() != null) user.setPhone(normalizePhone(req.phone()));
        if (req.avatarUrl() != null) user.setAvatarUrl(req.avatarUrl());
        if (req.hireDate() != null) user.setHireDate(req.hireDate());
        if (req.terminationDate() != null) user.setTerminationDate(req.terminationDate());
        if (req.employmentType() != null) user.setEmploymentType(req.employmentType());
        if (req.role() != null) user.setRole(req.role());
        if (req.position() != null) user.setPosition(req.position());
        if (req.unitId() != null) user.setUnitId(req.unitId());
        if (req.managerId() != null) user.setManagerId(req.managerId());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Audited(action = "DEACTIVATE_USER", entityType = "USER")
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
        if (newHistory.size() > 5) newHistory = new ArrayList<>(newHistory.subList(newHistory.size() - 5, newHistory.size()));

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

    @Transactional
    public UserResponse uploadAvatar(Long userId, MultipartFile file) {
        User user = findOrThrow(userId);
        if (file == null || file.isEmpty()) {
            throw new ApiException("FILE_EMPTY", "Файл пуст", "Файл бош");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new ApiException("FILE_TOO_LARGE",
                "Аватар превышает 2 МБ", "Аватар 2 МБдан ашат");
        }
        String mime = detectAvatarMime(file);
        if (mime == null) {
            throw new ApiException("UNSUPPORTED_FILE_TYPE",
                "Допустимые форматы: PNG, JPEG", "Уруксат берилген форматтар: PNG, JPEG");
        }

        String ext = AVATAR_EXT.get(mime);
        String filename = UUID.randomUUID() + "." + ext;
        Path dir = Paths.get(uploadDir, "avatars", userId.toString());
        Path dest = dir.resolve(filename);

        try {
            Files.createDirectories(dir);
            Files.write(dest, file.getBytes());
        } catch (IOException e) {
            throw new ApiException("FILE_STORAGE_ERROR",
                "Ошибка при сохранении файла", "Файлды сактоодо ката кетти");
        }

        String previous = user.getAvatarUrl();
        user.setAvatarUrl("/api/v1/users/" + userId + "/avatar/" + filename);
        userRepository.save(user);

        if (previous != null && previous.startsWith("/api/v1/users/" + userId + "/avatar/")) {
            String oldName = previous.substring(previous.lastIndexOf('/') + 1);
            try { Files.deleteIfExists(dir.resolve(oldName)); } catch (IOException ignored) {}
        }
        return UserResponse.from(user);
    }

    public byte[] readAvatar(Long userId, String filename) {
        if (filename == null || filename.contains("/") || filename.contains("..")) {
            throw new ApiException("INVALID_PATH", "Неверный путь", "Туура эмес жол");
        }
        Path path = Paths.get(uploadDir, "avatars", userId.toString(), filename);
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new ApiException("FILE_NOT_FOUND", "Файл не найден", "Файл табылган жок");
        }
    }

    private String detectAvatarMime(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(8);
            for (Map.Entry<String, byte[]> e : AVATAR_MAGIC.entrySet()) {
                byte[] p = e.getValue();
                if (header.length < p.length) continue;
                boolean match = true;
                for (int i = 0; i < p.length; i++) if (header[i] != p[i]) { match = false; break; }
                if (match) return e.getKey();
            }
        } catch (IOException ignored) {}
        return null;
    }

    public List<UserResponse> getDirectSubordinates(Long managerId) {
        return userRepository.findByManagerIdAndIsActiveTrue(managerId)
                .stream().map(UserResponse::from).collect(java.util.stream.Collectors.toList());
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                        "Пользователь не найден", "Колдонуучу табылган жок"));
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String stripped = phone.replaceAll("[\\s\\-()]", "");
        return stripped.isEmpty() ? null : stripped;
    }

    private String generateTempPassword() {
        return "Temp" + java.util.UUID.randomUUID().toString().substring(0, 8) + "1!";
    }
}
