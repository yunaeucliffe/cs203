package com.silverroute.api;

import java.time.OffsetDateTime;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import com.silverroute.exception.DuplicateSavedPlaceException;
import com.silverroute.exception.ModelAgentException;
import com.silverroute.exception.RouteDataUnavailableException;
import com.silverroute.exception.InvalidAddressException;
import com.silverroute.exception.AddressConfirmationRequiredException;
import com.silverroute.exception.AddressNotFoundException;
import com.silverroute.exception.RegistrationConflictException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

    @ExceptionHandler(RegistrationConflictException.class)
    public ResponseEntity<ApiError> handleRegistrationConflict(
            RegistrationConflictException exception,
            HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, exception.getMessage(), request);
    }

    public record AddressSuggestionError(int status, String message, String requestId,
            OffsetDateTime timestamp, String query, java.util.List<LocationResult> suggestions) {}

    @ExceptionHandler(AddressConfirmationRequiredException.class)
    public ResponseEntity<AddressSuggestionError> handleAddressConfirmation(
            AddressConfirmationRequiredException exception, HttpServletRequest request) {
        return ResponseEntity.status(422).body(new AddressSuggestionError(422, exception.getMessage(),
                RequestIdFilter.from(request), OffsetDateTime.now(), exception.query(), exception.suggestions()));
    }

    @ExceptionHandler(InvalidAddressException.class)
    public ResponseEntity<ApiError> handleInvalidAddress(
            InvalidAddressException exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
    }

    @ExceptionHandler(AddressNotFoundException.class)
    public ResponseEntity<ApiError> handleAddressNotFound(
            AddressNotFoundException exception, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, exception.getMessage(), request);
    }

    @ExceptionHandler(RouteDataUnavailableException.class)
    public ResponseEntity<ApiError> handleNoRouteData(
            RouteDataUnavailableException exception,
            HttpServletRequest request) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage(), request);
    }

    @ExceptionHandler(ModelAgentException.class)
    public ResponseEntity<ApiError> handleAgentFailure(
            RuntimeException exception,
            HttpServletRequest request) {
        // AI errors are technical (e.g. missing API keys), so keep them in the server log only.
        log.warn("Route ranking failed for request {}", RequestIdFilter.from(request), exception);
        return error(HttpStatus.BAD_GATEWAY,
                "We couldn't rank routes for you right now. Please try again in a few minutes.", request);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleInvalidParameter(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException exception,
            HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Invalid request parameter", request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleStatus(ResponseStatusException exception,
            HttpServletRequest request) {
        return error(exception.getStatusCode(),
                exception.getReason() == null ? "Request could not be completed" : exception.getReason(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpectedFailure(
            Exception exception,
            HttpServletRequest request) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred", request);
    }

    private ResponseEntity<ApiError> error(
            HttpStatusCode status,
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
