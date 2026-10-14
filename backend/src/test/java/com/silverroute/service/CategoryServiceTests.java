package com.silverroute.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import com.silverroute.dto.CategoryRequest;
import com.silverroute.model.Category;
import com.silverroute.model.User;
import com.silverroute.repository.CategoryRepository;
import com.silverroute.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTests {
    @Mock CategoryRepository categories;
    @Mock UserRepository users;
    CategoryService service;

    @BeforeEach
    void setUp() {
        service = new CategoryService(categories, users);
        User user = new User("Mary", "mary", "mary@example.com", "unused");
        ReflectionTestUtils.setField(user, "id", 1L);
        when(users.findByEmail("mary@example.com")).thenReturn(Optional.of(user));
    }

    @Test
    void updateChangesNameAndColorWithoutChangingId() {
        Category category = ownedCategory();
        when(categories.saveAndFlush(category)).thenReturn(category);
        var response = service.update("mary@example.com", 5L, new CategoryRequest("  Work  ", "#DCEBFA"));
        assertThat(response.id()).isEqualTo(5L);
        assertThat(response.name()).isEqualTo("Work");
        assertThat(response.color()).isEqualTo("#DCEBFA");
    }

    @Test
    void updateRejectsDuplicateName() {
        ownedCategory();
        when(categories.existsByUserIdAndNameIgnoreCaseAndIdNot(1L, "Work", 5L)).thenReturn(true);
        assertThatThrownBy(() -> service.update("mary@example.com", 5L, new CategoryRequest("Work", "#DCEBFA")))
                .isInstanceOf(ResponseStatusException.class);
        verify(categories, never()).saveAndFlush(any());
    }

    @Test
    void deleteRemovesOwnedCategory() {
        Category category = ownedCategory();
        service.delete("mary@example.com", 5L);
        verify(categories).delete(category);
    }

    @Test
    void otherUsersCategoryCannotBeEditedOrDeleted() {
        assertThatThrownBy(() -> service.update("mary@example.com", 99L, new CategoryRequest("Work", "#DCEBFA")))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.delete("mary@example.com", 99L))
                .isInstanceOf(ResponseStatusException.class);
        verify(categories, never()).saveAndFlush(any());
        verify(categories, never()).delete(any());
    }

    private Category ownedCategory() {
        Category category = new Category(1L, "Home", "#E8DFF5");
        ReflectionTestUtils.setField(category, "id", 5L);
        when(categories.findByIdAndUserId(5L, 1L)).thenReturn(Optional.of(category));
        return category;
    }
}
