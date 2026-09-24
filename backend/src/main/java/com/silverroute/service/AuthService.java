package com.silverroute.service;

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
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository, UserPreferenceRepository preferenceRepository) {
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
                passwordEncoder.encode(request.password())));
        preferenceRepository.save(new UserPreference(user.getId(), "Normal", "Moderate", false));

        return new LoginResponse(true, user.getId(), user.getName(), "Account created successfully");
    }
}
