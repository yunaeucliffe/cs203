package com.silverroute.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.silverroute.dto.SavedPlaceRequest;
import com.silverroute.exception.DuplicateSavedPlaceException;
import com.silverroute.model.SavedPlace;
import com.silverroute.model.User;
import com.silverroute.repository.SavedPlaceRepository;
import com.silverroute.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class SavedPlaceServiceTests {

    @Mock
    private SavedPlaceRepository savedPlaceRepository;
    @Mock
    private UserRepository userRepository;

    private SavedPlaceService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new SavedPlaceService(savedPlaceRepository, userRepository);
        user = new User("Mary Tan", "marytan", "mary@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    @Test
    void getAllReturnsOnlyAuthenticatedUsersPlaces() {
        SavedPlace home = place(10L, 1L, "Home");
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
        when(savedPlaceRepository.findByUserIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(home));

        assertThat(service.getAll("mary@example.com"))
                .extracting(response -> response.label())
                .containsExactly("Home");
    }

    @Test
    void createTrimsAndSavesThePlace() {
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
        when(savedPlaceRepository.save(any(SavedPlace.class))).thenAnswer(invocation -> {
            SavedPlace saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 10L);
            return saved;
        });

        var response = service.create("mary@example.com", request("  Home  ", " Tampines "));

        assertThat(response).hasValueSatisfying(place -> {
            assertThat(place.id()).isEqualTo(10L);
            assertThat(place.label()).isEqualTo("Home");
            assertThat(place.address()).isEqualTo("Tampines");
        });
    }

    @Test
    void duplicateLabelIsRejectedCaseInsensitively() {
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
        when(savedPlaceRepository.existsByUserIdAndLabelIgnoreCase(1L, "home")).thenReturn(true);

        assertThatThrownBy(() -> service.create("mary@example.com", request("home", "Elsewhere")))
                .isInstanceOf(DuplicateSavedPlaceException.class);
        verify(savedPlaceRepository, never()).save(any());
    }

    @Test
    void deleteCannotRemoveAnotherUsersPlace() {
        when(userRepository.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
        when(savedPlaceRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThat(service.delete("mary@example.com", 99L)).isFalse();
        verify(savedPlaceRepository, never()).delete(any());
    }

    private SavedPlace place(Long id, Long userId, String label) {
        SavedPlace place = new SavedPlace(userId, label, "Tampines", null, null);
        ReflectionTestUtils.setField(place, "id", id);
        return place;
    }

    private SavedPlaceRequest request(String label, String address) {
        return new SavedPlaceRequest(label, address,
                new BigDecimal("1.3521"), new BigDecimal("103.9447"));
    }
}
