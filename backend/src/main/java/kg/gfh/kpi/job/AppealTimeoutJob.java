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
