package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Page<User> findAll(Pageable pageable);
    boolean existsByEmail(String email);
    List<User> findByManagerIdAndIsActiveTrue(Long managerId);
}
