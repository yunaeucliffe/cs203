package com.silverroute.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;

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
import com.silverroute.dto.SignUpRequest;
import com.silverroute.exception.RegistrationConflictException;
import com.silverroute.model.User;
import com.silverroute.model.UserPreference;
import com.silverroute.repository.UserRepository;
import com.silverroute.repository.UserPreferenceRepository;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserPreferenceRepository preferenceRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, preferenceRepository);
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

    @Test
    void signUpHashesPasswordAndCreatesDefaultPreferences() {
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            ReflectionTestUtils.setField(user, "id", 7L);
            return user;
        });

        LoginResponse response = authService.signUp(new SignUpRequest(
                "Alex Lee", "Alex.L", "ALEX@example.com", "password123"));

        assertThat(response.success()).isTrue();
        assertThat(response.userId()).isEqualTo(7L);
        verify(userRepository).save(argThat(user ->
                !user.getPasswordHash().equals("password123")
                        && new BCryptPasswordEncoder().matches("password123", user.getPasswordHash())
                        && user.getEmail().equals("alex@example.com")
                        && user.getUsername().equals("alex.l")));
        verify(preferenceRepository).save(argThat(preference ->
                preference.getUserId().equals(7L)
                        && preference.getWalkingSpeed().equals("Normal")
                        && preference.getMinimizeWalkingPriority() == 50
                        && preference.getShelterPriority() == 20));
    }

    @Test
    void signUpRejectsAnExistingEmail() {
        when(userRepository.existsByEmailIgnoreCase("mary@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.signUp(new SignUpRequest(
                "Mary Tan", "mary2", "mary@example.com", "password123")))
                .isInstanceOf(RegistrationConflictException.class)
                .hasMessageContaining("email");
    }

    @Test
    void normalizeEmailIgnoresServerLocale() {
        Locale original = Locale.getDefault();
        try {
            // Under a Turkish default locale, plain toLowerCase() maps 'I' to dotless 'ı'.
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThat(AuthService.normalizeEmail("  MARY.LIM@EXAMPLE.COM ")).isEqualTo("mary.lim@example.com");
        } finally {
            Locale.setDefault(original);
        }
    }

    @Test
    void signUpRejectsEmailThatExceedsColumnWidthOnceLowercased() {
        // 'İ' (U+0130) lowercases to two chars, so this 254-char email becomes 256.
        String email = "\u0130\u0130" + "a".repeat(62) + "@" + "b".repeat(60) + "." + "c".repeat(60) + "." + "d".repeat(63) + ".com";
        assertThat(email).hasSize(254);
        assertThat(AuthService.normalizeEmail(email).length()).isGreaterThan(255);

        assertThatThrownBy(() -> authService.signUp(new SignUpRequest("Mary Tan", "marytan", email, "password123")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(userRepository, never()).save(any(User.class));
    }
}
