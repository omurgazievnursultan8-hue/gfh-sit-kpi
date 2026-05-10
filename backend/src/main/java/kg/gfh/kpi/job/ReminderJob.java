package kg.gfh.kpi.job;

import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import kg.gfh.kpi.repository.EvaluationPeriodRepository;
import kg.gfh.kpi.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
public class ReminderJob implements Job {

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");

    @Autowired EvaluationPeriodRepository periodRepository;
    @Autowired NotificationService notificationService;

    @Override
    public void execute(JobExecutionContext context) {
        LocalDateTime now = LocalDateTime.now(BISHKEK);
        LocalDateTime in3Days = now.plusDays(3);

        List<EvaluationPeriod> active = periodRepository.findByStatus(PeriodStatus.ACTIVE);
        for (EvaluationPeriod period : active) {
            LocalDateTime deadline = period.getSubmissionDeadline();
            if (deadline.isAfter(now) && deadline.isBefore(in3Days)) {
                notificationService.sendDeadlineReminders(period);
                log.info("ReminderJob: sent reminders for period {} (deadline {})",
                    period.getId(), deadline);
            }
        }
    }
}
