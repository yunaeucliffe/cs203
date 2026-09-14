package com.silverroute.exception;

public class ModelAgentException extends RuntimeException {

    public ModelAgentException(String message) {
        super(message);
    }

    public ModelAgentException(String message, Throwable cause) {
        super(message, cause);
    }
}
