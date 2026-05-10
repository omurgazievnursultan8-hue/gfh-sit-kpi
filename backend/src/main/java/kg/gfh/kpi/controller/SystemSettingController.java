package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.SystemSetting;
import kg.gfh.kpi.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<SystemSetting> findAll() {
        return service.findAll();
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public SystemSetting update(@PathVariable String key, @RequestBody Map<String, String> body) {
        return service.update(key, body.get("value"));
    }
}
