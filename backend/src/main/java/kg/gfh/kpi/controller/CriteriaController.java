package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.dto.CriteriaResponse;
import kg.gfh.kpi.service.CriteriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/criteria")
@RequiredArgsConstructor
public class CriteriaController {

    private final CriteriaService criteriaService;

    @GetMapping
    public Page<CriteriaResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return criteriaService.listActive(PageRequest.of(page, size));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CriteriaResponse> create(@Valid @RequestBody CriteriaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(criteriaService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CriteriaResponse update(@PathVariable Long id, @Valid @RequestBody CriteriaRequest req) {
        return criteriaService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        criteriaService.deactivate(id);
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public CriteriaResponse reactivate(@PathVariable Long id) {
        return criteriaService.reactivate(id);
    }
}
