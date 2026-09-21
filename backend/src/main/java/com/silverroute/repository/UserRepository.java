package com.silverroute.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.silverroute.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUsernameIgnoreCase(String username);
}
