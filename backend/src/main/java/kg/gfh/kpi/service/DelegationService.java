package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.DelegationRequest;
import kg.gfh.kpi.dto.DelegationResponse;
import kg.gfh.kpi.entity.EvaluatorDelegation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.EvaluatorDelegationRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class DelegationService {

    private final EvaluatorDelegationRepository delegationRepository;
    private final UserRepository userRepository;

    @Transactional
    public DelegationResponse create(DelegationRequest req, Long createdBy) {
        if (!userRepository.existsById(req.evaluateeId())) {
            throw new ApiException("USER_NOT_FOUND", "Сотрудник не найден", "Кызматкер табылган жок");
        }
        if (!userRepository.existsById(req.delegatedToId())) {
            throw new ApiException("USER_NOT_FOUND", "Делегат не найден", "Делегат табылган жок");
        }

        User evaluatee = userRepository.findById(req.evaluateeId()).orElseThrow();
        Long originalEvaluatorId = evaluatee.getManagerId();
        if (originalEvaluatorId == null) {
            throw new ApiException("NO_MANAGER_ASSIGNED",
                    "У сотрудника не назначен руководитель",
                    "Кызматкерге жетекчи дайындалган эмес");
        }

        EvaluatorDelegation d = new EvaluatorDelegation();
        d.setEvaluateeId(req.evaluateeId());
        d.setOriginalEvaluatorId(originalEvaluatorId);
        d.setDelegatedToId(req.delegatedToId());
        d.setValidFrom(req.validFrom());
        d.setValidTo(req.validTo());
        d.setReason(req.reason());
        d.setCreatedBy(createdBy);
        d.setActive(true);
        EvaluatorDelegation saved = delegationRepository.save(d);
        return DelegationResponse.from(saved, nameResolverFor(Set.of(
                saved.getEvaluateeId(), saved.getOriginalEvaluatorId(), saved.getDelegatedToId())));
    }

    @Transactional
    public void deactivate(Long id) {
        EvaluatorDelegation d = delegationRepository.findById(id)
                .orElseThrow(() -> new ApiException("DELEGATION_NOT_FOUND",
                        "Делегирование не найдено", "Делегирлөө табылган жок"));
        d.setActive(false);
        delegationRepository.save(d);
    }

    public Page<DelegationResponse> list(Pageable pageable) {
        Page<EvaluatorDelegation> page = delegationRepository.findAll(pageable);
        Set<Long> ids = new HashSet<>();
        page.forEach(d -> {
            ids.add(d.getEvaluateeId());
            ids.add(d.getOriginalEvaluatorId());
            ids.add(d.getDelegatedToId());
        });
        Function<Long, String> nameOf = nameResolverFor(ids);
        return page.map(d -> DelegationResponse.from(d, nameOf));
    }

    private Function<Long, String> nameResolverFor(Set<Long> ids) {
        Map<Long, String> names = StreamSupport
                .stream(userRepository.findAllById(ids).spliterator(), false)
                .collect(Collectors.toMap(User::getId, User::getFullName));
        return id -> id == null ? null : names.get(id);
    }
}
