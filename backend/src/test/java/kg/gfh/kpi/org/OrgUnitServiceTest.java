package kg.gfh.kpi.org;

import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.OrgUnitRepository;
import kg.gfh.kpi.service.OrgUnitService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrgUnitServiceTest {

    @Mock OrgUnitRepository orgUnitRepository;
    @InjectMocks OrgUnitService orgUnitService;

    @Test
    void detectsDirectCycle() {
        OrgUnit unitA = orgUnit(1L, null);
        OrgUnit unitB = orgUnit(2L, 1L);
        when(orgUnitRepository.findAll()).thenReturn(List.of(unitA, unitB));

        assertThatThrownBy(() -> orgUnitService.setParent(1L, 2L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cycle");
    }

    @Test
    void detectsIndirectCycle() {
        OrgUnit a = orgUnit(1L, null);
        OrgUnit b = orgUnit(2L, 1L);
        OrgUnit c = orgUnit(3L, 2L);
        when(orgUnitRepository.findAll()).thenReturn(List.of(a, b, c));

        assertThatThrownBy(() -> orgUnitService.setParent(1L, 3L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cycle");
    }

    @Test
    void validReparentDoesNotThrow() {
        OrgUnit a = orgUnit(1L, null);
        OrgUnit b = orgUnit(2L, null);
        OrgUnit c = orgUnit(3L, 2L);
        when(orgUnitRepository.findAll()).thenReturn(List.of(a, b, c));
        when(orgUnitRepository.findById(3L)).thenReturn(Optional.of(c));
        when(orgUnitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        orgUnitService.setParent(3L, 1L);
    }

    private OrgUnit orgUnit(Long id, Long parentId) {
        OrgUnit u = new OrgUnit();
        u.setId(id);
        u.setParentId(parentId);
        u.setNameRu("Unit " + id);
        u.setNameKg("Unit " + id);
        u.setType(OrgUnitType.UNIT);
        return u;
    }
}
