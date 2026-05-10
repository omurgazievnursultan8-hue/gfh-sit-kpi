package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.EvaluationReaction.ReactionType;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/evaluations/{evaluationId}/reaction")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;
    private final UserRepository userRepository;

    @PostMapping
    public Object react(
            @PathVariable Long evaluationId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        ReactionType type = ReactionType.valueOf(body.get("reaction"));
        String comment = body.get("comment");
        return reactionService.react(evaluationId, userId, type, comment);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
