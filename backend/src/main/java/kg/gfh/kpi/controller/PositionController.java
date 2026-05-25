package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.PositionRequest;
import kg.gfh.kpi.dto.PositionResponse;
import kg.gfh.kpi.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PositionResponse>> list(
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        if (unitId != null) {
            return ResponseEntity.ok(positionService.listByUnit(unitId, activeOnly));
        }
        return ResponseEntity.ok(positionService.listAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PositionResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(positionService.getOne(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PositionResponse> create(@Valid @RequestBody PositionRequest req) {
        return ResponseEntity.ok(positionService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PositionResponse> update(@PathVariable Long id,
                                                    @Valid @RequestBody PositionRequest req) {
        return ResponseEntity.ok(positionService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        positionService.delete(id);
        return ResponseEntity.ok().build();
    }
}
