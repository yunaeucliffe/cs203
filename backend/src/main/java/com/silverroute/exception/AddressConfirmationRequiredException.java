package com.silverroute.exception;

import com.silverroute.api.LocationResult;
import java.util.List;

public class AddressConfirmationRequiredException extends RuntimeException {
    private final String query;
    private final List<LocationResult> suggestions;

    public AddressConfirmationRequiredException(String query, List<LocationResult> suggestions) {
        super("We could not match the full address. Did you mean one of these addresses?");
        this.query = query;
        this.suggestions = List.copyOf(suggestions);
    }

    public String query() { return query; }
    public List<LocationResult> suggestions() { return suggestions; }
}
