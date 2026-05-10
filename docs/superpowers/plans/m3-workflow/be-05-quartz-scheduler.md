# M3-BE-05: Quartz Scheduler — Period Auto-Creation, Reminders, Deadline Enforcement, Asia/Bishkek

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Quartz with 4 scheduled jobs: (1) auto-create monthly evaluation periods on the 1st of each month, (2) send reminder notifications 3 days before submission deadline, (3) force-close periods past their deadline, (4) auto-agree pending appeals past their timeout. All schedules use timezone `Asia/Bishkek`.

**Architecture:** Quartz uses in-memory scheduler (no DB persistence for jobs — periods are already DB-backed). Jobs are Spring-managed beans via `SpringBeanJobFactory`. Trigger definitions use `CronScheduleBuilder.cronSchedule(...).inTimeZone(ZoneId.of("Asia/Bishkek"))`. Each job is idempotent — re-running has no duplicate effect.

**Tech Stack:** Spring Boot 3.x, Quartz 2.3.x (spring-boot-starter-quartz), Spring Context.

**Depends on:** m3-workflow/be-03-appeal-reaction.md

---

### Task 1: Quartz configuration

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/config/QuartzConfig.java`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Configure Quartz**

`backend/src/main/java/kg/gfh/kpi/config/QuartzConfig.java`:
```java
package kg.gfh.kpi.config;

import org.quartz.spi.TriggerFiredBundle;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.quartz.SpringBeanJobFactory;

@Configuration
public class QuartzConfig {

    @Bean
    public SpringBeanJobFactory springBeanJobFactory(ApplicationContext ctx) {
        SpringBeanJobFactory factory = new SpringBeanJobFactory() {
            private final AutowireCapableBeanFactory beanFactory = ctx.getAutowireCapableBeanFactory();

            @Override
            protected Object createJobInstance(TriggerFiredBundle bundle) throws Exception {
                Object job = super.createJobInstance(bundle);
                beanFactory.autowireBean(job);
                return job;
            }
        };
        return factory;
    }
}
```

Add to `application.yml`:
```yaml
spring:
  quartz:
    job-store-type: memory
    auto-startup: true
    scheduler-name: GfhKpiScheduler
    properties:
      org.quartz.scheduler.instanceName: GfhKpiScheduler
      org.quartz.threadPool.threadCount: 4
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/config/QuartzConfig.java \
        backend/src/main/resources/application.yml
git commit -m "chore(quartz): configure Quartz with SpringBeanJobFactory for Spring-managed jobs"
```

---

### Task 2: Auto-create period job

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/job/AutoCreatePeriodJob.java`
- Create: `backend/src/main/java/kg/gfh/kpi/scheduler/PeriodScheduler.java`

- [ ] **Step 1: Create AutoCreatePeriodJob**

`backend/src/main/java/kg/gfh/kpi/job/AutoCreatePeriodJob.java`:
```java
package kg.gfh.kpi.job;

import kg.gfh.kpi.dto.EvaluationPeriodRequest;
import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodType;
import kg.gfh.kpi.repository.EvaluationPeriodRepository;
import kg.gfh.kpi.service.EvaluationService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
public class AutoCreatePeriodJob implements Job {

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");

    @Autowired EvaluationService evaluationService;
    @Autowired EvaluationPeriodRepository periodRepository;

    @Override
    public void execute(JobExecutionContext context) {
        LocalDate today = LocalDate.now(BISHKEK);
        LocalDate firstOfMonth = today.withDayOfMonth(1);
        LocalDate lastOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        // Check if a period for this month already exists
        boolean exists = periodRepository.findAll().stream().anyMatch(p ->
            p.getStartDate().equals(firstOfMonth) && p.getType() == PeriodType.MONTHLY);

        if (exists) {
            log.info("AutoCreatePeriodJob: MONTHLY period for {} already exists, skipping", firstOfMonth);
            return;
        }

        // Submission deadline: last day of month 18:00 Bishkek time
        LocalDateTime deadline = lastOfMonth.atTime(18, 0);

        EvaluationPeriodRequest req = new EvaluationPeriodRequest(
            PeriodType.MONTHLY, firstOfMonth, lastOfMonth, deadline);

        EvaluationPeriod period = evaluationService.createPeriod(req, null);
        evaluationService.activatePeriod(period.getId());

        log.info("AutoCreatePeriodJob: Created and activated MONTHLY period {} for {}",
            period.getId(), firstOfMonth);
    }
}
```

- [ ] **Step 2: Create PeriodScheduler with all 4 triggers**

`backend/src/main/java/kg/gfh/kpi/scheduler/PeriodScheduler.java`:
```java
package kg.gfh.kpi.scheduler;

import kg.gfh.kpi.job.AutoCreatePeriodJob;
import kg.gfh.kpi.job.DeadlineEnforcementJob;
import kg.gfh.kpi.job.AppealTimeoutJob;
import kg.gfh.kpi.job.ReminderJob;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.quartz.impl.StdSchedulerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.quartz.SpringBeanJobFactory;

import java.util.TimeZone;

import static org.quartz.CronScheduleBuilder.cronSchedule;
import static org.quartz.JobBuilder.newJob;
import static org.quartz.TriggerBuilder.newTrigger;

@Slf4j
@Configuration
public class PeriodScheduler {

    private static final TimeZone BISHKEK_TZ = TimeZone.getTimeZone("Asia/Bishkek");

    @Bean
    public Scheduler quartzScheduler(SpringBeanJobFactory jobFactory) throws SchedulerException {
        SchedulerFactory factory = new StdSchedulerFactory();
        Scheduler scheduler = factory.getScheduler();
        scheduler.setJobFactory(jobFactory);

        scheduleJob(scheduler, AutoCreatePeriodJob.class, "auto-create-period",
            "0 0 1 1 * ?"); // 01:00 on 1st of every month

        scheduleJob(scheduler, ReminderJob.class, "reminder",
            "0 0 9 * * ?"); // 09:00 every day — job itself checks which periods are 3 days away

        scheduleJob(scheduler, DeadlineEnforcementJob.class, "deadline-enforcement",
            "0 0 * * * ?"); // Every hour on the hour

        scheduleJob(scheduler, AppealTimeoutJob.class, "appeal-timeout",
            "0 0/30 * * * ?"); // Every 30 minutes

        scheduler.start();
        log.info("Quartz scheduler started with 4 jobs (Asia/Bishkek timezone)");
        return scheduler;
    }

    private void scheduleJob(Scheduler scheduler, Class<? extends Job> jobClass,
                              String name, String cron) throws SchedulerException {
        JobDetail job = newJob(jobClass)
            .withIdentity(name, "gfh")
            .storeDurably()
            .build();

        Trigger trigger = newTrigger()
            .withIdentity(name + "-trigger", "gfh")
            .withSchedule(cronSchedule(cron).inTimeZone(BISHKEK_TZ))
            .forJob(job)
            .build();

        if (!scheduler.checkExists(job.getKey())) {
            scheduler.scheduleJob(job, trigger);
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/job/AutoCreatePeriodJob.java \
        backend/src/main/java/kg/gfh/kpi/scheduler/PeriodScheduler.java
git commit -m "feat(scheduler): add AutoCreatePeriodJob for monthly period auto-creation on 1st of month"
```

---

### Task 3: Remaining jobs

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/job/ReminderJob.java`
- Create: `backend/src/main/java/kg/gfh/kpi/job/DeadlineEnforcementJob.java`
- Create: `backend/src/main/java/kg/gfh/kpi/job/AppealTimeoutJob.java`

- [ ] **Step 1: Create ReminderJob**

`backend/src/main/java/kg/gfh/kpi/job/ReminderJob.java`:
```java
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
            // Notify if deadline is within the next 3 days
            if (deadline.isAfter(now) && deadline.isBefore(in3Days)) {
                notificationService.sendDeadlineReminders(period);
                log.info("ReminderJob: sent reminders for period {} (deadline {})",
                    period.getId(), deadline);
            }
        }
    }
}
```

- [ ] **Step 2: Create DeadlineEnforcementJob**

`backend/src/main/java/kg/gfh/kpi/job/DeadlineEnforcementJob.java`:
```java
package kg.gfh.kpi.job;

import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import kg.gfh.kpi.repository.EvaluationPeriodRepository;
import kg.gfh.kpi.service.EvaluationService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
public class DeadlineEnforcementJob implements Job {

    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");

    @Autowired EvaluationPeriodRepository periodRepository;
    @Autowired EvaluationService evaluationService;

    @Override
    public void execute(JobExecutionContext context) {
        LocalDateTime now = LocalDateTime.now(BISHKEK);
        List<EvaluationPeriod> active = periodRepository.findByStatus(PeriodStatus.ACTIVE);
        for (EvaluationPeriod period : active) {
            if (period.getSubmissionDeadline().isBefore(now)) {
                evaluationService.closePeriod(period.getId());
                log.info("DeadlineEnforcementJob: auto-closed period {} past deadline {}",
                    period.getId(), period.getSubmissionDeadline());
            }
        }
    }
}
```

- [ ] **Step 3: Create AppealTimeoutJob**

`backend/src/main/java/kg/gfh/kpi/job/AppealTimeoutJob.java`:
```java
package kg.gfh.kpi.job;

import kg.gfh.kpi.service.AppealService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.springframework.beans.factory.annotation.Autowired;

@Slf4j
public class AppealTimeoutJob implements Job {

    @Autowired AppealService appealService;

    @Override
    public void execute(JobExecutionContext context) {
        appealService.processExpiredAppeals();
    }
}
```

- [ ] **Step 4: Verify scheduler starts**

```bash
cd backend && mvn spring-boot:run &
sleep 15
grep -i "quartz" logs/gfh.log | grep -i "started"
```

Expected: log line confirming scheduler started with 4 jobs.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/job/
git commit -m "feat(scheduler): add reminder, deadline enforcement, and appeal timeout Quartz jobs (Asia/Bishkek TZ)"
```
