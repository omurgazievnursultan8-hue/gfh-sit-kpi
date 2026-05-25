package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Page<User> findAll(Pageable pageable);
    boolean existsByEmail(String email);
    List<User> findByManagerIdAndIsActiveTrue(Long managerId);
    List<User> findByIsActiveTrue();
    long countByIsActiveTrue();
    long countByCreatedAtAfter(LocalDateTime cutoff);
    long countByIsActiveTrueAndCreatedAtAfter(LocalDateTime cutoff);
    long countByIsActiveFalseAndCreatedAtAfter(LocalDateTime cutoff);

    @Query("select u.unitId, count(u) from User u where u.isActive = true and u.unitId is not null group by u.unitId")
    List<Object[]> countActiveByUnit();
}
