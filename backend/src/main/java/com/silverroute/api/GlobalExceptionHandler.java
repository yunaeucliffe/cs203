package com.silverroute.api;

import java.time.OffsetDateTime;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.silverroute.exception.AgentLoopLimitException;
import com.silverroute.exception.DuplicateSavedPlaceException;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.exception.UnknownToolException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + " " + error.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining(", "));
        return error(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableRequest(
            HttpMessageNotReadableException exception,
            HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Request body is missing or contains invalid JSON", request);
    }

    @ExceptionHandler(DuplicateSavedPlaceException.class)
    public ResponseEntity<ApiError> handleDuplicateSavedPlace(
            DuplicateSavedPlaceException exception,
            HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, exception.getMessage(), request);
    }

    @ExceptionHandler(RouteDataUnavailableException.class)
    public ResponseEntity<ApiError> handleNoRouteData(
            RouteDataUnavailableException exception,
            HttpServletRequest request) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage(), request);
    }

    @ExceptionHandler({
            ModelAgentException.class,
            UnknownToolException.class,
            AgentLoopLimitException.class
    })
    public ResponseEntity<ApiError> handleAgentFailure(
            RuntimeException exception,
            HttpServletRequest request) {
        return error(HttpStatus.BAD_GATEWAY, exception.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpectedFailure(
            Exception exception,
            HttpServletRequest request) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred", request);
    }

    private ResponseEntity<ApiError> error(
            HttpStatus status,
            String message,
            HttpServletRequest request) {
        ApiError body = new ApiError(
                status.value(),
                message,
                RequestIdFilter.from(request),
                OffsetDateTime.now());
        return ResponseEntity.status(status).body(body);
    }
}
