package com.silverroute.controller;

import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.silverroute.dto.CategoryRequest;
import com.silverroute.dto.CategoryResponse;
import com.silverroute.service.CategoryService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users/me/categories")
public class CategoryController {
    private final CategoryService service;

    public CategoryController(CategoryService service) { this.service = service; }

    @GetMapping
    public List<CategoryResponse> getAll(Authentication authentication) {
        return service.getAll(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(Authentication authentication,
            @Valid @RequestBody CategoryRequest request) {
        CategoryResponse category = service.create(authentication.getName(), request);
        return ResponseEntity.created(URI.create("/api/users/me/categories/" + category.id())).body(category);
    }

    @PutMapping("/{categoryId}")
    public CategoryResponse update(Authentication authentication, @PathVariable Long categoryId,
            @Valid @RequestBody CategoryRequest request) {
        return service.update(authentication.getName(), categoryId, request);
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long categoryId) {
        service.delete(authentication.getName(), categoryId);
        return ResponseEntity.noContent().build();
    }
}
