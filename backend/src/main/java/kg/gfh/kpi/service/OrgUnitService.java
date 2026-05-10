package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.OrgUnitRequest;
import kg.gfh.kpi.dto.OrgUnitResponse;
import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.OrgUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrgUnitService {

    private final OrgUnitRepository orgUnitRepository;

    @Transactional
    public OrgUnitResponse createUnit(OrgUnitRequest req) {
        if (req.parentId() != null) {
            validateNoNewCycle(null, req.parentId());
        }
        OrgUnit unit = new OrgUnit();
        unit.setNameRu(req.nameRu());
        unit.setNameKg(req.nameKg());
        unit.setType(req.type());
        unit.setParentId(req.parentId());
        unit.setHeadUserId(req.headUserId());
        return OrgUnitResponse.from(orgUnitRepository.save(unit));
    }

    @Transactional
    public OrgUnitResponse updateUnit(Long id, OrgUnitRequest req) {
        OrgUnit unit = findOrThrow(id);
        if (req.parentId() != null && !req.parentId().equals(unit.getParentId())) {
            validateNoNewCycle(id, req.parentId());
        }
        unit.setNameRu(req.nameRu());
        unit.setNameKg(req.nameKg());
        unit.setType(req.type());
        unit.setParentId(req.parentId());
        unit.setHeadUserId(req.headUserId());
        return OrgUnitResponse.from(orgUnitRepository.save(unit));
    }

    @Transactional
    public void deleteUnit(Long id) {
        findOrThrow(id);
        List<OrgUnit> children = orgUnitRepository.findByParentId(id);
        if (!children.isEmpty()) {
            throw new ApiException("ORG_UNIT_HAS_CHILDREN",
                    "Нельзя удалить подразделение с дочерними подразделениями",
                    "Бала бөлүмдөрү бар бөлүмдү жок кылуу мүмкүн эмес");
        }
        orgUnitRepository.deleteById(id);
    }

    public void setParent(Long unitId, Long newParentId) {
        validateNoNewCycle(unitId, newParentId);
        OrgUnit unit = findOrThrow(unitId);
        unit.setParentId(newParentId);
        orgUnitRepository.save(unit);
    }

    public OrgUnitResponse getUnit(Long id) {
        return OrgUnitResponse.from(findOrThrow(id));
    }

    public List<OrgUnitResponse> getFullTree() {
        List<OrgUnit> all = orgUnitRepository.findAll();
        Map<Long, List<OrgUnit>> byParent = all.stream()
                .filter(u -> u.getParentId() != null)
                .collect(Collectors.groupingBy(OrgUnit::getParentId));
        return all.stream()
                .filter(u -> u.getParentId() == null)
                .map(u -> buildTree(u, byParent))
                .collect(Collectors.toList());
    }

    private OrgUnitResponse buildTree(OrgUnit unit, Map<Long, List<OrgUnit>> byParent) {
        List<OrgUnitResponse> children = byParent.getOrDefault(unit.getId(), List.of())
                .stream()
                .map(child -> buildTree(child, byParent))
                .collect(Collectors.toList());
        return new OrgUnitResponse(unit.getId(), unit.getNameRu(), unit.getNameKg(),
                unit.getType(), unit.getParentId(), unit.getHeadUserId(), children);
    }

    private void validateNoNewCycle(Long unitId, Long proposedParentId) {
        List<OrgUnit> all = orgUnitRepository.findAll();
        Map<Long, Long> parentOf = all.stream()
                .filter(u -> u.getParentId() != null)
                .collect(Collectors.toMap(OrgUnit::getId, OrgUnit::getParentId));

        if (unitId != null) {
            parentOf.put(unitId, proposedParentId);
        }

        Long current = proposedParentId;
        int steps = 0;
        while (current != null) {
            if (current.equals(unitId)) {
                throw new ApiException("CYCLE_DETECTED",
                        "Обнаружен cycle в оргструктуре",
                        "Уюм структурасында cycle аныкталды");
            }
            current = parentOf.get(current);
            if (++steps > all.size()) break;
        }
    }

    private OrgUnit findOrThrow(Long id) {
        return orgUnitRepository.findById(id)
                .orElseThrow(() -> new ApiException("ORG_UNIT_NOT_FOUND",
                        "Подразделение не найдено", "Бөлүм табылган жок"));
    }
}
