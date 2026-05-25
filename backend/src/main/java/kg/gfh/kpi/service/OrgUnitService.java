package kg.gfh.kpi.service;

import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.dto.OrgUnitRequest;
import kg.gfh.kpi.dto.OrgUnitResponse;
import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.OrgUnitRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrgUnitService {

    private final OrgUnitRepository orgUnitRepository;
    private final UserRepository userRepository;

    private static final Map<OrgUnitType, Set<OrgUnitType>> ALLOWED_PARENTS = Map.of(
            OrgUnitType.BLOCK, EnumSet.noneOf(OrgUnitType.class),
            OrgUnitType.DEPARTMENT, EnumSet.of(OrgUnitType.BLOCK),
            OrgUnitType.SLUZHBA, EnumSet.of(OrgUnitType.BLOCK),
            OrgUnitType.OTDEL, EnumSet.of(OrgUnitType.BLOCK, OrgUnitType.DEPARTMENT, OrgUnitType.SLUZHBA),
            OrgUnitType.SEKTOR, EnumSet.of(OrgUnitType.BLOCK, OrgUnitType.DEPARTMENT, OrgUnitType.SLUZHBA)
    );

    @Audited(action = "CREATE_ORG_UNIT", entityType = "ORG_UNIT")
    @Transactional
    public OrgUnitResponse createUnit(OrgUnitRequest req) {
        validateParentType(req.type(), req.parentId());
        if (req.parentId() != null) {
            validateNoNewCycle(null, req.parentId());
        }
        OrgUnit unit = new OrgUnit();
        applyFields(unit, req);
        return OrgUnitResponse.from(orgUnitRepository.save(unit));
    }

    @Audited(action = "UPDATE_ORG_UNIT", entityType = "ORG_UNIT")
    @Transactional
    public OrgUnitResponse updateUnit(Long id, OrgUnitRequest req) {
        OrgUnit unit = findOrThrow(id);
        validateParentType(req.type(), req.parentId());
        if (req.parentId() != null && !req.parentId().equals(unit.getParentId())) {
            validateNoNewCycle(id, req.parentId());
        }
        applyFields(unit, req);
        return OrgUnitResponse.from(orgUnitRepository.save(unit));
    }

    private void applyFields(OrgUnit unit, OrgUnitRequest req) {
        unit.setNameRu(req.nameRu());
        unit.setNameKg(req.nameKg());
        unit.setType(req.type());
        unit.setParentId(req.parentId());
        unit.setHeadUserId(req.headUserId());
        unit.setCode(req.code());
        unit.setNameRuShort(req.nameRuShort());
        unit.setNameKgShort(req.nameKgShort());
        unit.setDisplayOrder(req.displayOrder() != null ? req.displayOrder() : 0);
    }

    @Audited(action = "ARCHIVE_ORG_UNIT", entityType = "ORG_UNIT")
    @Transactional
    public OrgUnitResponse archiveUnit(Long id) {
        OrgUnit unit = findOrThrow(id);
        LocalDateTime now = LocalDateTime.now();
        archiveCascade(unit, now);
        return OrgUnitResponse.from(unit);
    }

    private void archiveCascade(OrgUnit unit, LocalDateTime ts) {
        if (unit.getArchivedAt() == null) {
            unit.setArchivedAt(ts);
            orgUnitRepository.save(unit);
        }
        for (OrgUnit child : orgUnitRepository.findByParentId(unit.getId())) {
            archiveCascade(child, ts);
        }
    }

    @Audited(action = "RESTORE_ORG_UNIT", entityType = "ORG_UNIT")
    @Transactional
    public OrgUnitResponse restoreUnit(Long id) {
        OrgUnit unit = findOrThrow(id);
        if (unit.getParentId() != null) {
            OrgUnit parent = findOrThrow(unit.getParentId());
            if (parent.getArchivedAt() != null) {
                throw new ApiException("ORG_UNIT_PARENT_ARCHIVED",
                        "Сначала восстановите родительское подразделение",
                        "Адегенде ата-эне бөлүмдү калыбына келтириңиз");
            }
        }
        unit.setArchivedAt(null);
        orgUnitRepository.save(unit);
        return OrgUnitResponse.from(unit);
    }

    @Audited(action = "MOVE_ORG_UNIT", entityType = "ORG_UNIT")
    @Transactional
    public OrgUnitResponse moveUnit(Long id, String direction) {
        OrgUnit unit = findOrThrow(id);
        if (unit.getArchivedAt() != null) {
            throw new ApiException("ORG_UNIT_ARCHIVED",
                    "Архивные подразделения нельзя перемещать",
                    "Архивдик бөлүмдөрдү жылдырууга болбойт");
        }
        if (!"up".equalsIgnoreCase(direction) && !"down".equalsIgnoreCase(direction)) {
            throw new ApiException("ORG_UNIT_INVALID_DIRECTION",
                    "Направление должно быть up или down",
                    "Багыт up же down болушу керек");
        }
        List<OrgUnit> siblings = orgUnitRepository.findAll().stream()
                .filter(s -> Objects.equals(s.getParentId(), unit.getParentId()))
                .filter(s -> s.getArchivedAt() == null)
                .sorted(ORDER_THEN_NAME)
                .collect(Collectors.toList());
        int idx = -1;
        for (int i = 0; i < siblings.size(); i++) {
            if (siblings.get(i).getId().equals(id)) { idx = i; break; }
        }
        if (idx < 0) return OrgUnitResponse.from(unit);
        int target = "up".equalsIgnoreCase(direction) ? idx - 1 : idx + 1;
        if (target < 0 || target >= siblings.size()) return OrgUnitResponse.from(unit);
        Collections.swap(siblings, idx, target);
        for (int i = 0; i < siblings.size(); i++) {
            siblings.get(i).setDisplayOrder(i * 10);
        }
        orgUnitRepository.saveAll(siblings);
        return OrgUnitResponse.from(unit);
    }

    @Audited(action = "DELETE_ORG_UNIT", entityType = "ORG_UNIT")
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
                .sorted(ORDER_THEN_NAME)
                .map(u -> buildTree(u, byParent))
                .collect(Collectors.toList());
    }

    private static final Comparator<OrgUnit> ORDER_THEN_NAME =
            Comparator.comparing((OrgUnit u) -> u.getDisplayOrder() == null ? 0 : u.getDisplayOrder())
                    .thenComparing(OrgUnit::getNameRu, Comparator.nullsLast(String::compareTo));

    private OrgUnitResponse buildTree(OrgUnit unit, Map<Long, List<OrgUnit>> byParent) {
        List<OrgUnitResponse> children = byParent.getOrDefault(unit.getId(), List.of())
                .stream()
                .sorted(ORDER_THEN_NAME)
                .map(child -> buildTree(child, byParent))
                .collect(Collectors.toList());
        return new OrgUnitResponse(unit.getId(), unit.getNameRu(), unit.getNameKg(),
                unit.getType(), unit.getParentId(), unit.getHeadUserId(),
                unit.getCode(), unit.getNameRuShort(), unit.getNameKgShort(),
                unit.getDisplayOrder(), unit.getArchivedAt(), children);
    }

    private void validateParentType(OrgUnitType childType, Long parentId) {
        if (childType == null) {
            throw new ApiException("ORG_UNIT_TYPE_REQUIRED",
                    "Тип подразделения обязателен", "Бөлүм түрү милдеттүү");
        }
        Set<OrgUnitType> allowed = ALLOWED_PARENTS.get(childType);
        if (parentId == null) {
            if (childType != OrgUnitType.BLOCK) {
                throw new ApiException("ORG_UNIT_PARENT_REQUIRED",
                        "Для типа " + childType + " требуется родительское подразделение",
                        childType + " түрү үчүн ата-эне бөлүм керек");
            }
            return;
        }
        if (childType == OrgUnitType.BLOCK) {
            throw new ApiException("ORG_UNIT_BLOCK_HAS_PARENT",
                    "Блок не может иметь родительское подразделение",
                    "Блокто ата-эне бөлүм болбойт");
        }
        OrgUnit parent = findOrThrow(parentId);
        if (!allowed.contains(parent.getType())) {
            throw new ApiException("ORG_UNIT_INVALID_PARENT_TYPE",
                    "Недопустимый тип родителя для " + childType + ": " + parent.getType(),
                    childType + " үчүн ата-эне түрү жараксыз: " + parent.getType());
        }
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
