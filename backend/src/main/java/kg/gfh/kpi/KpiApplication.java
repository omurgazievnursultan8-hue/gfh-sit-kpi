package kg.gfh.kpi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class KpiApplication {
    public static void main(String[] args) {
        SpringApplication.run(KpiApplication.class, args);
    }
}
