package com.silverroute.controller;

import com.silverroute.service.CoveredLinkwayService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/covered-linkways")
@CrossOrigin(origins = "*")
public class CoveredLinkwayController {

    private final CoveredLinkwayService coveredLinkwayService;

    public CoveredLinkwayController(CoveredLinkwayService coveredLinkwayService) {
        this.coveredLinkwayService = coveredLinkwayService;
    }

    @GetMapping
    public String getCoveredLinkways() throws Exception {
        return coveredLinkwayService.getGeoJson();
    }
}
