package com.silverroute.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.silverroute.dto.LoginRequest;
import com.silverroute.dto.LoginResponse;
import com.silverroute.model.User;
import com.silverroute.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {

    @Mock
    private UserRepository userRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository);
    }

    @Test
    void loginReturnsUserForValidCredentials() {
        User user = new User("Mary Tan", "marytan", "mary@example.com",
                new BCryptPasswordEncoder().encode("password123"));
        ReflectionTestUtils.setField(user, "id", 1L);
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));

        LoginResponse response = authService.login(new LoginRequest("mary@example.com", "password123"));

        assertThat(response.success()).isTrue();
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Mary Tan");
    }

    @Test
    void loginReturnsGenericFailureForInvalidPassword() {
        User user = new User("Mary Tan", "marytan", "mary@example.com",
                new BCryptPasswordEncoder().encode("password123"));
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));

        LoginResponse response = authService.login(new LoginRequest("mary@example.com", "wrong-password"));

        assertThat(response.success()).isFalse();
        assertThat(response.userId()).isNull();
        assertThat(response.message()).isEqualTo("Invalid email or password");
    }
}
