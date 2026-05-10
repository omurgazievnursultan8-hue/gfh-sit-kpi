package kg.gfh.kpi.dto;

import java.util.Date;

public record QuartzJobInfo(
    String name,
    String group,
    String description,
    String cronExpression,
    Date previousFireTime,
    Date nextFireTime,
    String state
) {}
