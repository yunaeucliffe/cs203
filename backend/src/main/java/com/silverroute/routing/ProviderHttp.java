package com.silverroute.routing;

import java.time.Duration;
import java.net.http.HttpClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

public final class ProviderHttp {
    private ProviderHttp() {}
    public static RestClient client(String baseUrl, int readSeconds) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(readSeconds));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }
}
