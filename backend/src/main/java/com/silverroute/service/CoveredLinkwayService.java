package com.silverroute.service;

import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class CoveredLinkwayService {

    public String getGeoJson() throws Exception {

        Path path = Path.of("../data/covered_linkways.geojson");

        return Files.readString(path);
    }
}