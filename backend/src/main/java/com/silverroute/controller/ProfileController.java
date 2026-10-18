package com.silverroute.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.silverroute.dto.ProfileResponse;
import com.silverroute.dto.UpdatePreferencesRequest;
import com.silverroute.service.ProfileService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me/profile")
    public ResponseEntity<ProfileResponse> getCurrentProfile(Authentication authentication) {
        return profileService.getProfileByEmail(authentication.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/me/preferences")
    public ResponseEntity<ProfileResponse> updateCurrentPreferences(
            Authentication authentication,
            @Valid @RequestBody UpdatePreferencesRequest request) {
        return profileService.updatePreferences(authentication.getName(), request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteCurrentAccount(
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response) {
        // Log out only after the deletion succeeds; if it throws, the user stays signed in to retry.
        profileService.deleteAccount(authentication.getName());
        new SecurityContextLogoutHandler().logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<ProfileResponse> getProfile(
            @PathVariable Long userId,
            Authentication authentication) {
        return profileService.getProfileByEmail(authentication.getName())
                .map(profile -> profile.id().equals(userId)
                        ? ResponseEntity.ok(profile)
                        : ResponseEntity.status(HttpStatus.FORBIDDEN).<ProfileResponse>build())
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
