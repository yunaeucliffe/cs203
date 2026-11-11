package com.silverroute.service;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.silverroute.dto.LoginRequest;
import com.silverroute.dto.LoginResponse;
import com.silverroute.dto.SignUpRequest;
import com.silverroute.exception.RegistrationConflictException;
import com.silverroute.model.User;
import com.silverroute.model.UserPreference;
import com.silverroute.repository.UserRepository;
import com.silverroute.repository.UserPreferenceRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;
    private static final String PBKDF2_ID = "pbkdf2@SpringSecurity_v5_8";
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
    private final DelegatingPasswordEncoder passwordEncoder = new DelegatingPasswordEncoder(
            PBKDF2_ID, Map.of(PBKDF2_ID, Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8()));

    public AuthService(UserRepository userRepository, UserPreferenceRepository preferenceRepository) {
        passwordEncoder.setDefaultPasswordEncoderForMatches(bcrypt);
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
    }

    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            return new LoginResponse(false, null, null, "Invalid email or password");
        }

        return new LoginResponse(true, user.getId(), user.getName(), "Login successful");
    }

    private String encodePassword(String password) {
        // Keep the existing BCrypt format for passwords it can represent in full.
        if (password.getBytes(StandardCharsets.UTF_8).length <= 72) {
            return bcrypt.encode(password);
        }
        return passwordEncoder.encode(password);
    }

    @Transactional
    public LoginResponse signUp(SignUpRequest request) {
        String email = request.email().trim().toLowerCase();
        String username = request.username().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RegistrationConflictException("An account with this email already exists");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new RegistrationConflictException("This username is already taken");
        }

        User user = userRepository.save(new User(
                request.name().trim(),
                username,
                email,
                encodePassword(request.password())));
        preferenceRepository.save(new UserPreference(user.getId(), "Normal", 50, 20));

        return new LoginResponse(true, user.getId(), user.getName(), "Account created successfully");
    }
}
