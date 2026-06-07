package kg.gfh.kpi.dto;

import java.util.List;

public record TeamResponse(
    List<TeamMemberDto> attention,
    TeamMemberDto bestPerformer,
    int totalCount,
    Double teamAvg,
    int evaluatedCount,
    int zoneOk,
    int zoneWarn,
    int zoneCrit
) {
    public record TeamMemberDto(
        Long userId,
        String fullName,
        String position,
        String initials,
        Double latestScore,
        Double scoreDelta,
        String status,
        String reasonLabel
    ) {}
}
