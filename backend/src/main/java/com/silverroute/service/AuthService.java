package com.silverroute.service;

import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    /** Width of users.email and spring_session.principal_name. */
    static final int MAX_EMAIL_LENGTH = 255;

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository, UserPreferenceRepository preferenceRepository) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
    }

    /**
     * Canonical form of an email, used for storage, lookup and as the session
     * principal. Locale.ROOT keeps it independent of the server's locale.
     */
    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public LoginResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            return new LoginResponse(false, null, null, "Invalid email or password");
        }

        return new LoginResponse(true, user.getId(), user.getName(), "Login successful");
    }

    @Transactional
    public LoginResponse signUp(SignUpRequest request) {
        String email = normalizeEmail(request.email());
        String username = request.username().trim().toLowerCase(Locale.ROOT);

        // @Size checks the raw value, but lowercasing some characters (e.g.
        // U+0130) lengthens the string, so recheck what is actually stored.
        if (email.length() > MAX_EMAIL_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "email size must be between 0 and " + MAX_EMAIL_LENGTH);
        }

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
        preferenceRepository.save(new UserPreference(user.getId(), "Normal", 50, 20));

        return new LoginResponse(true, user.getId(), user.getName(), "Account created successfully");
    }
}
