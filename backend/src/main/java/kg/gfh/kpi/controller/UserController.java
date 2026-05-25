package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.*;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.EvaluatorResolver;
import kg.gfh.kpi.service.UserService;
import kg.gfh.kpi.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final EvaluatorResolver evaluatorResolver;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserResponse> listUsers(@PageableDefault(size = 20) Pageable pageable) {
        return userService.listUsers(pageable);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest req) {
        return ResponseEntity.ok(userService.createUser(req));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                   @Valid @RequestBody UserUpdateRequest req) {
        return ResponseEntity.ok(userService.updateUser(id, req));
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> reactivateUser(@PathVariable Long id) {
        userService.reactivateUser(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/subordinates")
    @PreAuthorize("hasAnyRole('DEPUTY_CHAIRMAN','ORG_HEAD')")
    public ResponseEntity<List<UserResponse>> getSubordinates(
            org.springframework.security.core.Authentication auth) {
        Long managerId = extractManagerId(auth);
        return ResponseEntity.ok(userService.getDirectSubordinates(managerId));
    }

    private Long extractManagerId(org.springframework.security.core.Authentication auth) {
        return userRepository.findByEmail(auth.getName()).orElseThrow().getId();
    }

    @GetMapping("/{id}/evaluator")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Long> getEvaluator(@PathVariable Long id) {
        Long evaluatorId = evaluatorResolver.resolve(id, java.time.LocalDate.now());
        return ResponseEntity.ok(evaluatorId);
    }

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadAvatar(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        requireSelfOrAdmin(id, auth);
        return ResponseEntity.ok(userService.uploadAvatar(id, file));
    }

    @GetMapping("/{id}/avatar/{filename}")
    public ResponseEntity<byte[]> getAvatar(
            @PathVariable Long id,
            @PathVariable String filename) {
        byte[] data = userService.readAvatar(id, filename);
        String mime = filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
            .contentType(MediaType.parseMediaType(mime))
            .body(data);
    }

    private void requireSelfOrAdmin(Long targetId, Authentication auth) {
        boolean admin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (admin) return;
        Long callerId = userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                "Пользователь не найден", "Колдонуучу табылган жок")).getId();
        if (!callerId.equals(targetId)) {
            throw new ApiException("ACCESS_DENIED", "Нет доступа", "Жетүү жок");
        }
    }

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            org.springframework.security.core.Authentication auth) {
        String email = auth.getName();
        kg.gfh.kpi.entity.User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                "Пользователь не найден", "Колдонуучу табылган жок"));
        Long userId = user.getId();
        userService.changePassword(userId, req.currentPassword(), req.newPassword());
        return ResponseEntity.ok().build();
    }
}
