package com.silverroute.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.silverroute.dto.SavedPlaceRequest;
import com.silverroute.dto.SavedPlaceResponse;
import com.silverroute.service.SavedPlaceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users/me/saved-places")
public class SavedPlaceController {

    private final SavedPlaceService savedPlaceService;

    public SavedPlaceController(SavedPlaceService savedPlaceService) {
        this.savedPlaceService = savedPlaceService;
    }

    @GetMapping
    public List<SavedPlaceResponse> getAll(Authentication authentication) {
        return savedPlaceService.getAll(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<SavedPlaceResponse> create(
            Authentication authentication,
            @Valid @RequestBody SavedPlaceRequest request) {
        return savedPlaceService.create(authentication.getName(), request)
                .map(place -> ResponseEntity.created(
                        URI.create("/api/users/me/saved-places/" + place.id())).body(place))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{placeId}")
    public ResponseEntity<SavedPlaceResponse> update(
            Authentication authentication,
            @PathVariable Long placeId,
            @Valid @RequestBody SavedPlaceRequest request) {
        return savedPlaceService.update(authentication.getName(), placeId, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{placeId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long placeId) {
        return savedPlaceService.delete(authentication.getName(), placeId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
