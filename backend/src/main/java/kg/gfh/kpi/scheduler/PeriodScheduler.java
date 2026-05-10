package kg.gfh.kpi.scheduler;

import kg.gfh.kpi.job.AppealTimeoutJob;
import kg.gfh.kpi.job.AutoCreatePeriodJob;
import kg.gfh.kpi.job.DeadlineEnforcementJob;
import kg.gfh.kpi.job.ReminderJob;
import org.quartz.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

import static org.quartz.CronScheduleBuilder.cronSchedule;
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;

@Configuration
public class PeriodScheduler {

    private static final TimeZone BISHKEK_TZ = TimeZone.getTimeZone("Asia/Bishkek");

    // ── Auto-create monthly period ────────────────────────────────────────────

    @Bean
    public JobDetail autoCreatePeriodJobDetail() {
        return newJob(AutoCreatePeriodJob.class)
            .withIdentity("auto-create-period", "gfh")
            .storeDurably()
            .build();
    }

    @Bean
    public Trigger autoCreatePeriodTrigger(JobDetail autoCreatePeriodJobDetail) {
        return newTrigger()
            .withIdentity("auto-create-period-trigger", "gfh")
            .forJob(autoCreatePeriodJobDetail)
            .withSchedule(cronSchedule("0 0 1 1 * ?").inTimeZone(BISHKEK_TZ))
            .build();
    }

    // ── Deadline reminders (09:00 daily) ─────────────────────────────────────

    @Bean
    public JobDetail reminderJobDetail() {
        return newJob(ReminderJob.class)
            .withIdentity("reminder", "gfh")
            .storeDurably()
            .build();
    }

    @Bean
    public Trigger reminderTrigger(JobDetail reminderJobDetail) {
        return newTrigger()
            .withIdentity("reminder-trigger", "gfh")
            .forJob(reminderJobDetail)
            .withSchedule(cronSchedule("0 0 9 * * ?").inTimeZone(BISHKEK_TZ))
            .build();
    }

    // ── Deadline enforcement (every hour) ────────────────────────────────────

    @Bean
    public JobDetail deadlineEnforcementJobDetail() {
        return newJob(DeadlineEnforcementJob.class)
            .withIdentity("deadline-enforcement", "gfh")
            .storeDurably()
            .build();
    }

    @Bean
    public Trigger deadlineEnforcementTrigger(JobDetail deadlineEnforcementJobDetail) {
        return newTrigger()
            .withIdentity("deadline-enforcement-trigger", "gfh")
            .forJob(deadlineEnforcementJobDetail)
            .withSchedule(cronSchedule("0 0 * * * ?").inTimeZone(BISHKEK_TZ))
            .build();
    }

    // ── Appeal timeout (every 30 minutes) ────────────────────────────────────

    @Bean
    public JobDetail appealTimeoutJobDetail() {
        return newJob(AppealTimeoutJob.class)
            .withIdentity("appeal-timeout", "gfh")
            .storeDurably()
            .build();
    }

    @Bean
    public Trigger appealTimeoutTrigger(JobDetail appealTimeoutJobDetail) {
        return newTrigger()
            .withIdentity("appeal-timeout-trigger", "gfh")
            .forJob(appealTimeoutJobDetail)
            .withSchedule(cronSchedule("0 0/30 * * * ?").inTimeZone(BISHKEK_TZ))
            .build();
    }
}
