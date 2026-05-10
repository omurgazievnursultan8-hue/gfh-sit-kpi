package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.DelegationRequest;
import kg.gfh.kpi.dto.DelegationResponse;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.DelegationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/delegations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DelegationController {

    private final DelegationService delegationService;
    private final UserRepository userRepository;

    @GetMapping
    public Page<DelegationResponse> list(@PageableDefault(size = 20) Pageable pageable) {
        return delegationService.list(pageable);
    }

    @PostMapping
    public ResponseEntity<DelegationResponse> create(
            @Valid @RequestBody DelegationRequest req, Authentication auth) {
        Long adminId = userRepository.findByEmail(auth.getName()).orElseThrow().getId();
        return ResponseEntity.ok(delegationService.create(req, adminId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        delegationService.deactivate(id);
        return ResponseEntity.ok().build();
    }
}
