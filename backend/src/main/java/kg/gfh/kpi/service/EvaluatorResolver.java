package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.EvaluatorDelegation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.EvaluatorDelegationRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvaluatorResolver {

    private final UserRepository userRepository;
    private final EvaluatorDelegationRepository delegationRepository;

    public Long resolve(Long userId, LocalDate periodStartDate) {
        User user = userRepository.findById(userId).orElseThrow();

        // Step 1: check active delegation (follow chain A->B->C)
        Long delegateId = resolveChainedDelegation(userId, periodStartDate);
        if (delegateId != null) {
            return delegateId;
        }

        // Step 2: CHAIRMAN is not evaluated
        if (user.getRole() == Role.CHAIRMAN) {
            return null;
        }

        // Step 3: active direct manager
        if (user.getManagerId() != null) {
            User manager = userRepository.findById(user.getManagerId()).orElse(null);
            if (manager != null && manager.isActive()) {
                return manager.getId();
            }

            // Step 4: walk hierarchy upward
            User current = manager;
            while (current != null && current.getManagerId() != null) {
                User parent = userRepository.findById(current.getManagerId()).orElse(null);
                if (parent != null && parent.isActive()) {
                    log.warn("AUTO_RESOLVED: evaluator for user {} resolved via hierarchy to {}",
                            userId, parent.getId());
                    return parent.getId();
                }
                current = parent;
            }
        }

        // Step 5: no evaluator found
        log.warn("AUTO_RESOLVED: no evaluator found for user {}, marking UNEVALUABLE", userId);
        return null;
    }

    private Long resolveChainedDelegation(Long evaluateeId, LocalDate date) {
        Long current = evaluateeId;
        int maxChain = 10;
        while (maxChain-- > 0) {
            Optional<EvaluatorDelegation> delegation =
                    delegationRepository.findActiveDelegation(current, date);
            if (delegation.isEmpty()) break;
            Long delegatedTo = delegation.get().getDelegatedToId();
            // Check if this delegate has also delegated further
            Optional<EvaluatorDelegation> nextDelegation =
                    delegationRepository.findActiveDelegation(delegatedTo, date);
            if (nextDelegation.isEmpty()) {
                User finalDelegate = userRepository.findById(delegatedTo).orElse(null);
                if (finalDelegate != null && finalDelegate.isActive()) {
                    return delegatedTo;
                }
                return null;
            }
            current = delegatedTo;
        }
        return null;
    }
}
