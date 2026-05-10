package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.OrgUnitRequest;
import kg.gfh.kpi.dto.OrgUnitResponse;
import kg.gfh.kpi.service.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/org")
@RequiredArgsConstructor
public class OrgUnitController {

    private final OrgUnitService orgUnitService;

    @GetMapping("/structure")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
    public ResponseEntity<List<OrgUnitResponse>> getStructure() {
        return ResponseEntity.ok(orgUnitService.getFullTree());
    }

    @PostMapping("/units")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrgUnitResponse> createUnit(@Valid @RequestBody OrgUnitRequest req) {
        return ResponseEntity.ok(orgUnitService.createUnit(req));
    }

    @GetMapping("/units/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrgUnitResponse> getUnit(@PathVariable Long id) {
        return ResponseEntity.ok(orgUnitService.getUnit(id));
    }

    @PutMapping("/units/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrgUnitResponse> updateUnit(@PathVariable Long id,
                                                       @Valid @RequestBody OrgUnitRequest req) {
        return ResponseEntity.ok(orgUnitService.updateUnit(id, req));
    }

    @DeleteMapping("/units/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUnit(@PathVariable Long id) {
        orgUnitService.deleteUnit(id);
        return ResponseEntity.ok().build();
    }
}
