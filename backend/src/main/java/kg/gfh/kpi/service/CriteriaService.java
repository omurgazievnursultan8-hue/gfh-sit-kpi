package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.dto.CriteriaResponse;
import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.CriteriaRepository;
import kg.gfh.kpi.repository.OrgUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CriteriaService {

    private final CriteriaRepository criteriaRepository;
    private final OrgUnitRepository orgUnitRepository;

    public Page<CriteriaResponse> listActive(Pageable pageable) {
        return criteriaRepository.findByActiveTrue(pageable).map(CriteriaResponse::from);
    }

    @Transactional
    public CriteriaResponse create(CriteriaRequest req) {
        validateWeightSum(req.type(), req.orgUnitId(), req.weight(), null);

        Criteria c = new Criteria();
        c.setNameRu(req.nameRu());
        c.setNameKg(req.nameKg());
        c.setType(req.type());
        c.setWeight(req.weight());
        c.setAutoCalculated(req.autoCalculated());
        if (req.orgUnitId() != null) {
            c.setOrgUnit(orgUnitRepository.findById(req.orgUnitId())
                .orElseThrow(() -> new ApiException("ORG_UNIT_NOT_FOUND",
                    "Подразделение не найдено", "Бөлүм табылган жок")));
        }
        return CriteriaResponse.from(criteriaRepository.save(c));
    }

    @Transactional
    public CriteriaResponse update(Long id, CriteriaRequest req) {
        Criteria c = findById(id);

        if (c.isFrozen() && !c.getWeight().equals(req.weight())) {
            throw new ApiException("CRITERIA_FROZEN",
                "Вес критерия заморожен — по нему уже есть оценки",
                "Критерийдин салмагы тоңдурулган — боюнча баалоолор бар");
        }

        validateWeightSum(req.type(), req.orgUnitId(), req.weight(), id);

        c.setNameRu(req.nameRu());
        c.setNameKg(req.nameKg());
        c.setType(req.type());
        c.setWeight(req.weight());
        c.setAutoCalculated(req.autoCalculated());

        OrgUnit orgUnit = req.orgUnitId() != null
            ? orgUnitRepository.findById(req.orgUnitId())
                .orElseThrow(() -> new ApiException("ORG_UNIT_NOT_FOUND",
                    "Подразделение не найдено", "Бөлүм табылган жок"))
            : null;
        c.setOrgUnit(orgUnit);

        return CriteriaResponse.from(criteriaRepository.save(c));
    }

    @Transactional
    public void deactivate(Long id) {
        Criteria c = findById(id);
        c.setActive(false);
        criteriaRepository.save(c);
    }

    @Transactional
    public CriteriaResponse reactivate(Long id) {
        Criteria c = findById(id);
        validateWeightSum(c.getType(), c.getOrgUnit() != null ? c.getOrgUnit().getId() : null,
            c.getWeight(), null);
        c.setActive(true);
        return CriteriaResponse.from(criteriaRepository.save(c));
    }

    private void validateWeightSum(CriteriaType type, Long orgUnitId, BigDecimal newWeight, Long excludeId) {
        if (type != CriteriaType.POSITIVE) return;

        BigDecimal existing = criteriaRepository.sumWeightByTypeAndScope(type, orgUnitId, excludeId);
        BigDecimal total = existing.add(newWeight);
        if (total.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException("WEIGHT_SUM_EXCEEDS_100",
                String.format("Сумма весов превысит 100%% (текущая: %.2f%%, новая: %.2f%%)", existing, newWeight),
                String.format("Салмактардын суммасы 100%%дан ашат (учурдагы: %.2f%%, жаңы: %.2f%%)", existing, newWeight));
        }
    }

    private Criteria findById(Long id) {
        return criteriaRepository.findById(id)
            .orElseThrow(() -> new ApiException("CRITERIA_NOT_FOUND",
                "Критерий не найден", "Критерий табылган жок"));
    }
}
