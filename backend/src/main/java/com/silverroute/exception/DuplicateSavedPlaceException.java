package com.silverroute.exception;

public class DuplicateSavedPlaceException extends RuntimeException {
    public DuplicateSavedPlaceException() {
        super("A saved place with this label already exists");
    }
}
