package kg.gfh.kpi.controller;

import jakarta.servlet.http.HttpServletRequest;
import kg.gfh.kpi.entity.PdpaConsent;
import kg.gfh.kpi.repository.PdpaConsentRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/pdpa")
@RequiredArgsConstructor
public class PdpaController {

    private final PdpaConsentRepository pdpaConsentRepository;
    private final UserRepository userRepository;

    @PostMapping("/accept")
    public ResponseEntity<Void> acceptPdpa(
            @RequestParam(defaultValue = "1.0") String version,
            Authentication auth,
            HttpServletRequest request) {
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow().getId();

        PdpaConsent consent = new PdpaConsent();
        consent.setUserId(userId);
        consent.setVersion(version);
        consent.setIpAddress(request.getRemoteAddr());
        pdpaConsentRepository.save(consent);

        return ResponseEntity.ok().build();
    }
}
