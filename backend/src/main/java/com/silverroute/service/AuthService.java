package com.silverroute.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.silverroute.dto.LoginRequest;
import com.silverroute.dto.LoginResponse;
import com.silverroute.model.User;
import com.silverroute.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            return new LoginResponse(false, null, null, "Invalid email or password");
        }

        return new LoginResponse(true, user.getId(), user.getName(), "Login successful");
    }
}
