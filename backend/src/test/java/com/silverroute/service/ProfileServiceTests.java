package com.silverroute.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.silverroute.dto.ProfileResponse;
import com.silverroute.dto.UpdatePreferencesRequest;
import com.silverroute.model.User;
import com.silverroute.model.UserPreference;
import com.silverroute.repository.UserPreferenceRepository;
import com.silverroute.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserPreferenceRepository preferenceRepository;

    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        profileService = new ProfileService(userRepository, preferenceRepository);
    }

    @Test
    void getProfileCombinesUserAndPreferences() {
        User user = new User("Mary Tan", "marytan", "mary@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
        UserPreference preference = new UserPreference(1L, "Slow", "Short", true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.of(preference));

        Optional<ProfileResponse> response = profileService.getProfile(1L);

        assertThat(response).contains(new ProfileResponse(
                1L, "Mary Tan", "mary@example.com", "Slow", "Short", true));
    }

    @Test
    void getProfileReturnsEmptyWhenPreferencesAreMissing() {
        User user = new User("Mary Tan", "marytan", "mary@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.empty());

        assertThat(profileService.getProfile(1L)).isEmpty();
    }

    @Test
    void getProfileByEmailUsesTheAuthenticatedUsersEmail() {
        User user = new User("Mary Tan", "marytan", "mary@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
        UserPreference preference = new UserPreference(1L, "Slow", "Short", true);
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.of(preference));

        assertThat(profileService.getProfileByEmail("mary@example.com"))
                .contains(new ProfileResponse(
                        1L, "Mary Tan", "mary@example.com", "Slow", "Short", true));
    }

    @Test
    void updatePreferencesSavesAndReturnsTheUpdatedProfile() {
        User user = new User("Mary Tan", "marytan", "mary@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
        UserPreference preference = new UserPreference(1L, "Slow", "Short", true);
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
        when(preferenceRepository.findByUserId(1L)).thenReturn(Optional.of(preference));

        Optional<ProfileResponse> response = profileService.updatePreferences(
                "mary@example.com",
                new UpdatePreferencesRequest("Fast", "Moderate", false));

        assertThat(response).contains(new ProfileResponse(
                1L, "Mary Tan", "mary@example.com", "Fast", "Moderate", false));
        verify(preferenceRepository).save(preference);
    }
}
