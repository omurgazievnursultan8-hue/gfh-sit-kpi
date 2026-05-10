package kg.gfh.kpi.evaluator;

import kg.gfh.kpi.entity.EvaluatorDelegation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.EvaluatorDelegationRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.EvaluatorResolver;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvaluatorResolverTest {

    @Mock UserRepository userRepository;
    @Mock EvaluatorDelegationRepository delegationRepository;
    @InjectMocks EvaluatorResolver resolver;

    private final LocalDate periodStart = LocalDate.of(2026, 5, 1);

    @Test
    void step1_activeDelegationReturnsDelegate() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        EvaluatorDelegation delegation = delegation(10L, 20L, 30L);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart))
                .thenReturn(Optional.of(delegation));
        when(delegationRepository.findActiveDelegation(30L, periodStart))
                .thenReturn(Optional.empty());
        when(userRepository.findById(30L)).thenReturn(Optional.of(user(30L, Role.HEAD_OF_DEPARTMENT_UNIT, null, true)));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(30L);
    }

    @Test
    void step2_chairmanReturnsNull() {
        User chairman = user(1L, Role.CHAIRMAN, null, true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(chairman));
        when(delegationRepository.findActiveDelegation(1L, periodStart)).thenReturn(Optional.empty());

        assertThat(resolver.resolve(1L, periodStart)).isNull();
    }

    @Test
    void step3_activeManagerReturnsManager() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        User manager = user(20L, Role.HEAD_OF_DEPARTMENT_UNIT, null, true);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(manager));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(20L);
    }

    @Test
    void step4_inactiveManagerWalksUpHierarchy() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        User inactiveManager = user(20L, Role.HEAD_OF_DEPARTMENT_UNIT, 30L, false);
        User grandparent = user(30L, Role.HEAD_OF_DEPARTMENT, null, true);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(inactiveManager));
        when(userRepository.findById(30L)).thenReturn(Optional.of(grandparent));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(30L);
    }

    @Test
    void step5_noActiveEvaluatorReturnsNull() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        User inactiveManager = user(20L, Role.HEAD_OF_DEPARTMENT_UNIT, null, false);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(inactiveManager));

        assertThat(resolver.resolve(10L, periodStart)).isNull();
    }

    @Test
    void chainDelegation_returnsFinalDelegate() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        EvaluatorDelegation delAtoB = delegation(10L, 20L, 30L);
        EvaluatorDelegation delBtoC = delegation(10L, 30L, 40L);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart))
                .thenReturn(Optional.of(delAtoB));
        when(delegationRepository.findActiveDelegation(30L, periodStart))
                .thenReturn(Optional.of(delBtoC));
        when(delegationRepository.findActiveDelegation(40L, periodStart))
                .thenReturn(Optional.empty());
        when(userRepository.findById(40L)).thenReturn(Optional.of(user(40L, Role.HEAD_OF_DEPARTMENT, null, true)));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(40L);
    }

    private User user(Long id, Role role, Long managerId, boolean active) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        u.setManagerId(managerId);
        u.setActive(active);
        return u;
    }

    private EvaluatorDelegation delegation(Long evaluateeId, Long originalEvaluatorId, Long delegatedToId) {
        EvaluatorDelegation d = new EvaluatorDelegation();
        d.setEvaluateeId(evaluateeId);
        d.setOriginalEvaluatorId(originalEvaluatorId);
        d.setDelegatedToId(delegatedToId);
        return d;
    }
}
