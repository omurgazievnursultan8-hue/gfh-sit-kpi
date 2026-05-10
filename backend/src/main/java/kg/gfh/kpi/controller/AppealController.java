package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.AppealService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/appeals")
@RequiredArgsConstructor
public class AppealController {

    private final AppealService appealService;
    private final UserRepository userRepository;

    @PostMapping
    public Object fileAppeal(@RequestBody Map<String, Object> body, Authentication auth) {
        Long userId = resolveUserId(auth);
        Long evaluationId = Long.parseLong(body.get("evaluationId").toString());
        String reason = (String) body.get("reason");
        return appealService.fileAppeal(evaluationId, userId, reason);
    }

    @PostMapping("/{id}/respond")
    public Object respond(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        AppealStatus decision = AppealStatus.valueOf(body.get("decision"));
        String response = body.get("response");
        return appealService.respond(id, userId, decision, response);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
