package com.silverroute.service;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.silverroute.dto.CategoryRequest;
import com.silverroute.dto.CategoryResponse;
import com.silverroute.model.Category;
import com.silverroute.repository.CategoryRepository;
import com.silverroute.repository.UserRepository;

@Service
public class CategoryService {
    private final CategoryRepository categories;
    private final UserRepository users;

    public CategoryService(CategoryRepository categories, UserRepository users) {
        this.categories = categories;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll(String email) {
        return categories.findByUserIdOrderByIdAsc(userId(email)).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public CategoryResponse create(String email, CategoryRequest request) {
        Long userId = userId(email);
        if (categories.existsByUserIdAndNameIgnoreCase(userId, request.name().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This category already exists.");
        }
        try {
            return toResponse(categories.saveAndFlush(new Category(userId, request.name(), request.color())));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This category already exists.");
        }
    }

    @Transactional
    public CategoryResponse update(String email, Long categoryId, CategoryRequest request) {
        Long userId = userId(email);
        Category category = findCategory(categoryId, userId);
        if (categories.existsByUserIdAndNameIgnoreCaseAndIdNot(userId, request.name().trim(), categoryId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This category already exists.");
        }
        category.update(request.name(), request.color());
        try {
            return toResponse(categories.saveAndFlush(category));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This category already exists.");
        }
    }

    @Transactional
    public void delete(String email, Long categoryId) {
        // The database's ON DELETE SET NULL keeps saved places uncategorised.
        categories.delete(findCategory(categoryId, userId(email)));
    }

    private Category findCategory(Long categoryId, Long userId) {
        return categories.findByIdAndUserId(categoryId, userId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found."));
    }

    private Long userId(String email) {
        return users.findByEmail(email).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.")).getId();
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getColor());
    }
}
