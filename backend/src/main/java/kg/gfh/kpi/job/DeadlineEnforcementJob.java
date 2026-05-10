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
