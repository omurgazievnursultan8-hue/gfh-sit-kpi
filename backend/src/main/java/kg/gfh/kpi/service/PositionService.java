package kg.gfh.kpi.service;

import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.dto.PositionRequest;
import kg.gfh.kpi.dto.PositionResponse;
import kg.gfh.kpi.entity.Position;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.OrgUnitRepository;
import kg.gfh.kpi.repository.PositionRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionService {

    private final PositionRepository positionRepository;
    private final OrgUnitRepository orgUnitRepository;
    private final UserRepository userRepository;

    public List<PositionResponse> listByUnit(Long unitId, boolean activeOnly) {
        List<Position> list = activeOnly
            ? positionRepository.findByUnitIdAndIsActiveTrueOrderByDisplayOrderAscNameRuAsc(unitId)
            : positionRepository.findByUnitIdOrderByDisplayOrderAscNameRuAsc(unitId);
        return list.stream().map(PositionResponse::from).toList();
    }

    public List<PositionResponse> listAll() {
        return positionRepository.findAll().stream().map(PositionResponse::from).toList();
    }

    public PositionResponse getOne(Long id) {
        return PositionResponse.from(findOrThrow(id));
    }

    @Audited(action = "CREATE_POSITION", entityType = "POSITION")
    @Transactional
    public PositionResponse create(PositionRequest req) {
        validateUnit(req.unitId());
        Position p = new Position();
        apply(p, req);
        return PositionResponse.from(positionRepository.save(p));
    }

    @Audited(action = "UPDATE_POSITION", entityType = "POSITION")
    @Transactional
    public PositionResponse update(Long id, PositionRequest req) {
        Position p = findOrThrow(id);
        validateUnit(req.unitId());
        apply(p, req);
        return PositionResponse.from(positionRepository.save(p));
    }

    @Audited(action = "DELETE_POSITION", entityType = "POSITION")
    @Transactional
    public void delete(Long id) {
        Position p = findOrThrow(id);
        long inUse = userRepository.countByPositionId(id);
        if (inUse > 0) {
            throw new ApiException("POSITION_IN_USE",
                "Должность используется сотрудниками",
                "Кызмат орду кызматкерлер тарабынан колдонулууда");
        }
        positionRepository.delete(p);
    }

    private void apply(Position p, PositionRequest req) {
        p.setNameRu(req.nameRu());
        p.setNameKg(req.nameKg());
        p.setUnitId(req.unitId());
        p.setCode(req.code() == null || req.code().isBlank() ? null : req.code().trim());
        p.setDisplayOrder(req.displayOrder() != null ? req.displayOrder() : 0);
        if (req.isActive() != null) p.setActive(req.isActive());
    }

    private void validateUnit(Long unitId) {
        if (unitId == null || !orgUnitRepository.existsById(unitId)) {
            throw new ApiException("ORG_UNIT_NOT_FOUND",
                "Подразделение не найдено", "Бөлүм табылган жок");
        }
    }

    private Position findOrThrow(Long id) {
        return positionRepository.findById(id)
            .orElseThrow(() -> new ApiException("POSITION_NOT_FOUND",
                "Должность не найдена", "Кызмат орду табылган жок"));
    }
}
