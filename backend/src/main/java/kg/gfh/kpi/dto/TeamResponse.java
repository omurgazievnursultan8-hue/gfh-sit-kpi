package kg.gfh.kpi.dto;

import java.util.List;

public record TeamResponse(
    List<TeamMemberDto> attention,
    TeamMemberDto bestPerformer,
    int totalCount,
    Double teamAvg
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
