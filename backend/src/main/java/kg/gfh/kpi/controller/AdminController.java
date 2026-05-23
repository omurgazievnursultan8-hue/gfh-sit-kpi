package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AdminStatsResponse;
import kg.gfh.kpi.dto.QuartzJobInfo;
import kg.gfh.kpi.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.quartz.impl.matchers.GroupMatcher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final Scheduler scheduler;

    @GetMapping("/stats")
    public AdminStatsResponse getStats(@RequestParam(value = "range", required = false) String range) {
        return adminService.getStats(range);
    }

    @GetMapping("/quartz-jobs")
    public List<QuartzJobInfo> getQuartzJobs() throws SchedulerException {
        List<QuartzJobInfo> result = new ArrayList<>();
        for (String group : scheduler.getJobGroupNames()) {
            for (JobKey key : scheduler.getJobKeys(GroupMatcher.groupEquals(group))) {
                JobDetail detail = scheduler.getJobDetail(key);
                List<? extends Trigger> triggers = scheduler.getTriggersOfJob(key);
                Trigger trigger = triggers.isEmpty() ? null : triggers.get(0);

                String cronExpr = null;
                if (trigger instanceof CronTrigger cron) cronExpr = cron.getCronExpression();

                String state = trigger != null
                        ? scheduler.getTriggerState(trigger.getKey()).name()
                        : "NONE";

                result.add(new QuartzJobInfo(
                        key.getName(),
                        key.getGroup(),
                        detail.getDescription(),
                        cronExpr,
                        trigger != null ? trigger.getPreviousFireTime() : null,
                        trigger != null ? trigger.getNextFireTime() : null,
                        state
                ));
            }
        }
        return result;
    }

    @GetMapping("/error-logs")
    public Map<String, List<String>> getErrorLogs() {
        return Map.of("lines", adminService.getLastErrorLogLines(20));
    }
}
