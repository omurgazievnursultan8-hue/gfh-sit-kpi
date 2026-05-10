package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.*;
import kg.gfh.kpi.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            org.springframework.security.core.Authentication auth) {
        Long userId = ((kg.gfh.kpi.entity.User) auth.getPrincipal()).getId();
        userService.changePassword(userId, req.currentPassword(), req.newPassword());
        return ResponseEntity.ok().build();
    }
}
