package com.silverroute.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.silverroute.dto.ProfileResponse;
import com.silverroute.dto.UpdatePreferencesRequest;
import com.silverroute.model.User;
import com.silverroute.model.UserPreference;
import com.silverroute.repository.UserPreferenceRepository;
import com.silverroute.repository.UserRepository;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository preferenceRepository;

    public ProfileService(UserRepository userRepository, UserPreferenceRepository preferenceRepository) {
        this.userRepository = userRepository;
        this.preferenceRepository = preferenceRepository;
    }

    public Optional<ProfileResponse> getProfile(Long userId) {
        Optional<User> user = userRepository.findById(userId);

        return user.flatMap(this::buildProfile);
    }

    public Optional<ProfileResponse> getProfileByEmail(String email) {
        return userRepository.findByEmail(email).flatMap(this::buildProfile);
    }

    @Transactional
    public Optional<ProfileResponse> updatePreferences(String email, UpdatePreferencesRequest request) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty()) {
            return Optional.empty();
        }

        Optional<UserPreference> preference = preferenceRepository.findByUserId(user.get().getId());
        if (preference.isEmpty()) {
            return Optional.empty();
        }

        UserPreference foundPreference = preference.get();
        foundPreference.update(
                request.walkingSpeed(),
                request.walkingTolerance(),
                request.preferSheltered());
        preferenceRepository.save(foundPreference);

        return Optional.of(toResponse(user.get(), foundPreference));
    }

    private Optional<ProfileResponse> buildProfile(User user) {
        Optional<UserPreference> preference = preferenceRepository.findByUserId(user.getId());

        return preference.map(foundPreference -> toResponse(user, foundPreference));
    }

    private ProfileResponse toResponse(User user, UserPreference preference) {
        return new ProfileResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                preference.getWalkingSpeed(),
                preference.getWalkingTolerance(),
                preference.isPreferSheltered());
    }
}
