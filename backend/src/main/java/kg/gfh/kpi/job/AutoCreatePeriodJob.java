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

        boolean exists = periodRepository.findAll().stream().anyMatch(p ->
            p.getStartDate().equals(firstOfMonth) && p.getType() == PeriodType.MONTHLY);

        if (exists) {
            log.info("AutoCreatePeriodJob: MONTHLY period for {} already exists, skipping", firstOfMonth);
            return;
        }

        LocalDateTime deadline = lastOfMonth.atTime(18, 0);
        EvaluationPeriodRequest req = new EvaluationPeriodRequest(
            PeriodType.MONTHLY, firstOfMonth, lastOfMonth, deadline);

        EvaluationPeriod period = evaluationService.createPeriod(req, null);
        evaluationService.activatePeriod(period.getId());

        log.info("AutoCreatePeriodJob: created and activated MONTHLY period {} for {}",
            period.getId(), firstOfMonth);
    }
}
