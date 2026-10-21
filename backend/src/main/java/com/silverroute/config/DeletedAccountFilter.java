package com.silverroute.config;

import java.io.IOException;

import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.filter.OncePerRequestFilter;

import com.silverroute.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

// Deleting an account only logs out the session that asked for it. This filter signs out the
// user's other sessions (other browsers or devices) on their next request. It checks the user id,
// not the email, so an old session cannot attach to a new account registered with the same email.
public class DeletedAccountFilter extends OncePerRequestFilter {

    public static final String USER_ID_ATTRIBUTE = "userId";

    private final UserRepository userRepository;

    public DeletedAccountFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Long userId = (Long) session.getAttribute(USER_ID_ATTRIBUTE);
            if (userId != null && !userRepository.existsById(userId)) {
                new SecurityContextLogoutHandler().logout(request, response, null);
            }
        }
        filterChain.doFilter(request, response);
    }
}
