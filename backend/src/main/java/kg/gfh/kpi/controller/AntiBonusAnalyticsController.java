package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AntiBonusAnalyticsResponse;
import kg.gfh.kpi.service.AntiBonusAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analytics/anti-bonus")
@RequiredArgsConstructor
public class AntiBonusAnalyticsController {

    private final AntiBonusAnalyticsService service;

    @GetMapping
    public AntiBonusAnalyticsResponse get(
            @RequestParam(required = false) Long orgUnitId,
            @RequestParam(defaultValue = "MONTHLY") String periodType) {
        return service.getAnalytics(orgUnitId, periodType);
    }
}
