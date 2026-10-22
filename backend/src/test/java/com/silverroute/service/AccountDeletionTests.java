package com.silverroute.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import com.silverroute.dto.LoginRequest;
import com.silverroute.model.Category;
import com.silverroute.model.RouteChoiceSnapshot;
import com.silverroute.model.SavedPlace;
import com.silverroute.model.User;
import com.silverroute.model.UserPreference;
import com.silverroute.repository.CategoryRepository;
import com.silverroute.repository.RouteChoiceSnapshotRepository;
import com.silverroute.repository.SavedPlaceRepository;
import com.silverroute.repository.UserPreferenceRepository;
import com.silverroute.repository.UserRepository;

/** Uses the configured PostgreSQL database, like BackendApplicationTests. */
@SpringBootTest
@ActiveProfiles("mock")
class AccountDeletionTests {

    @Autowired private ProfileService profileService;
    @Autowired private AuthService authService;
    @Autowired private UserRepository users;
    @Autowired private UserPreferenceRepository preferences;
    @Autowired private CategoryRepository categories;
    @Autowired private SavedPlaceRepository savedPlaces;
    @Autowired private RouteChoiceSnapshotRepository routeChoices;

    private String email;
    private Long userId;
    private Long otherUserId;

    @BeforeEach
    void setUp() {
        String name = "delete-" + UUID.randomUUID();
        email = name + "@example.com";
        userId = users.save(new User("Delete test", name, email,
                new BCryptPasswordEncoder().encode("password123"))).getId();

        String otherName = "keep-" + UUID.randomUUID();
        otherUserId = users.save(new User("Keep test", otherName, otherName + "@example.com", "unused")).getId();
    }

    @AfterEach
    void cleanUp() {
        users.deleteById(userId);
        users.deleteById(otherUserId);
    }

    @Test
    void deletesTheAccountAndAllItsDataSoItCanNoLongerLogIn() {
        preferences.save(new UserPreference(userId, "Slow", 80, 20));
        Category category = categories.save(new Category(userId, "Work", "#E8DFF5"));
        SavedPlace place = new SavedPlace(userId, "Home", "Tampines, Singapore", null, null);
        place.setCategoryId(category.getId());
        savedPlaces.save(place);
        UUID routeChoiceId = routeChoices.save(new RouteChoiceSnapshot(userId, 0, "[]")).getId();
        assertThat(authService.login(new LoginRequest(email, "password123")).success()).isTrue();

        profileService.deleteAccount(email);

        assertThat(users.existsById(userId)).isFalse();
        assertThat(preferences.findByUserId(userId)).isEmpty();
        assertThat(categories.findByUserIdOrderByIdAsc(userId)).isEmpty();
        assertThat(savedPlaces.findByUserIdOrderByCreatedAtAsc(userId)).isEmpty();
        assertThat(routeChoices.existsById(routeChoiceId)).isFalse();
        assertThat(authService.login(new LoginRequest(email, "password123")).success()).isFalse();
        assertThat(users.existsById(otherUserId)).isTrue();
    }
}
