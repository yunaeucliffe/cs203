package com.silverroute.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.silverroute.dto.SavedPlaceRequest;
import com.silverroute.dto.SavedPlaceResponse;
import com.silverroute.exception.DuplicateSavedPlaceException;
import com.silverroute.model.SavedPlace;
import com.silverroute.model.User;
import com.silverroute.repository.SavedPlaceRepository;
import com.silverroute.repository.UserRepository;

@Service
public class SavedPlaceService {

    private final SavedPlaceRepository savedPlaceRepository;
    private final UserRepository userRepository;

    public SavedPlaceService(SavedPlaceRepository savedPlaceRepository, UserRepository userRepository) {
        this.savedPlaceRepository = savedPlaceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<SavedPlaceResponse> getAll(String email) {
        return userRepository.findByEmail(email)
                .map(user -> savedPlaceRepository.findByUserIdOrderByCreatedAtAsc(user.getId()).stream()
                        .map(this::toResponse)
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional
    public Optional<SavedPlaceResponse> create(String email, SavedPlaceRequest request) {
        return userRepository.findByEmail(email).map(user -> {
            ensureUniqueLabel(user, request.label(), null);
            SavedPlace place = new SavedPlace(user.getId(), request.label(), request.address(),
                    request.latitude(), request.longitude());
            return toResponse(savedPlaceRepository.save(place));
        });
    }

    @Transactional
    public Optional<SavedPlaceResponse> update(String email, Long placeId, SavedPlaceRequest request) {
        return userRepository.findByEmail(email).flatMap(user ->
                savedPlaceRepository.findByIdAndUserId(placeId, user.getId()).map(place -> {
                    ensureUniqueLabel(user, request.label(), placeId);
                    place.update(request.label(), request.address(), request.latitude(), request.longitude());
                    return toResponse(savedPlaceRepository.save(place));
                }));
    }

    @Transactional
    public boolean delete(String email, Long placeId) {
        return userRepository.findByEmail(email)
                .flatMap(user -> savedPlaceRepository.findByIdAndUserId(placeId, user.getId()))
                .map(place -> {
                    savedPlaceRepository.delete(place);
                    return true;
                })
                .orElse(false);
    }

    private void ensureUniqueLabel(User user, String label, Long currentId) {
        boolean duplicate = currentId == null
                ? savedPlaceRepository.existsByUserIdAndLabelIgnoreCase(user.getId(), label.trim())
                : savedPlaceRepository.existsByUserIdAndLabelIgnoreCaseAndIdNot(
                        user.getId(), label.trim(), currentId);
        if (duplicate) {
            throw new DuplicateSavedPlaceException();
        }
    }

    private SavedPlaceResponse toResponse(SavedPlace place) {
        return new SavedPlaceResponse(place.getId(), place.getLabel(), place.getAddress(),
                place.getLatitude(), place.getLongitude(), place.getCreatedAt());
    }
}
