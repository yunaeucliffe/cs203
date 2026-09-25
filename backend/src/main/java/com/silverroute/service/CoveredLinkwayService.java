package com.silverroute.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.geotools.api.data.DataStore;
import org.geotools.api.data.FeatureSource;
import org.geotools.api.data.Query;
import org.geotools.api.feature.simple.SimpleFeature;
import org.geotools.api.feature.simple.SimpleFeatureType;
import org.geotools.api.feature.type.AttributeDescriptor;
import org.geotools.api.referencing.crs.CoordinateReferenceSystem;
import org.geotools.data.shapefile.ShapefileDataStoreFactory;
import org.geotools.referencing.CRS;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryCollection;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.MultiLineString;
import org.locationtech.jts.geom.MultiPoint;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.geotools.geometry.jts.JTS;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class CoveredLinkwayService {

    private static final long MAX_UNZIPPED_BYTES = 50L * 1024 * 1024;
    private final LtaDataMallService ltaDataMallService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CoveredLinkwayService(LtaDataMallService ltaDataMallService) {
        this.ltaDataMallService = ltaDataMallService;
    }

    /** Fetches LTA's SHP ZIP, converts it to WGS84 GeoJSON, and returns it. */
    public String getGeoJson() throws Exception {
        byte[] archive = ltaDataMallService.getCoveredLinkwayShapefile();
        Path tempDirectory = Files.createTempDirectory("covered-linkways-");
        try {
            extractArchive(archive, tempDirectory);
            Path shapefile = findShapefile(tempDirectory);
            return convertShapefile(shapefile);
        } finally {
            deleteRecursively(tempDirectory);
        }
    }

    private void extractArchive(byte[] archive, Path destination) throws IOException {
        long expandedBytes = 0;
        try (ZipInputStream zip = new ZipInputStream(new java.io.ByteArrayInputStream(archive))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                Path output = destination.resolve(entry.getName()).normalize();
                if (!output.startsWith(destination) || entry.getName().isBlank()) {
                    throw new IOException("Unsafe path in LTA shapefile archive");
                }
                if (entry.isDirectory()) {
                    Files.createDirectories(output);
                } else {
                    Files.createDirectories(output.getParent());
                    try (var out = Files.newOutputStream(output)) {
                        byte[] buffer = new byte[8192];
                        int count;
                        while ((count = zip.read(buffer)) != -1) {
                            expandedBytes += count;
                            if (expandedBytes > MAX_UNZIPPED_BYTES) {
                                throw new IOException("LTA shapefile archive exceeds the extraction size limit");
                            }
                            out.write(buffer, 0, count);
                        }
                    }
                }
                zip.closeEntry();
            }
        }
    }

    private Path findShapefile(Path directory) throws IOException {
        try (var paths = Files.walk(directory)) {
            return paths.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".shp"))
                    .findFirst()
                    .orElseThrow(() -> new IOException("No .shp file found in LTA archive"));
        }
    }

    private String convertShapefile(Path shapefile) throws Exception {
        var params = new java.util.HashMap<String, Object>();
        params.put("url", shapefile.toUri().toURL());
        params.put("charset", java.nio.charset.StandardCharsets.UTF_8.name());
        DataStore store = new ShapefileDataStoreFactory().createDataStore(params);
        if (store == null) {
            throw new IOException("Could not open LTA shapefile");
        }
        try {
            String typeName = store.getTypeNames()[0];
            FeatureSource<?, ?> source = store.getFeatureSource(typeName);
            SimpleFeatureType schema = (SimpleFeatureType) source.getSchema();
            String geometryName = schema.getGeometryDescriptor().getLocalName();
            CoordinateReferenceSystem sourceCrs = schema.getCoordinateReferenceSystem();
            if (sourceCrs == null) {
                throw new IOException("LTA shapefile is missing its coordinate reference system");
            }
            CoordinateReferenceSystem wgs84 = CRS.decode("EPSG:4326", true);
            var transform = CRS.findMathTransform(sourceCrs, wgs84, true);

            ObjectNode collection = objectMapper.createObjectNode();
            collection.put("type", "FeatureCollection");
            ArrayNode features = collection.putArray("features");
            try (SimpleFeatureIterator iterator = (SimpleFeatureIterator) source.getFeatures(Query.ALL).features()) {
                while (iterator.hasNext()) {
                    SimpleFeature feature = iterator.next();
                    ObjectNode outputFeature = features.addObject();
                    outputFeature.put("type", "Feature");
                    outputFeature.put("id", feature.getID());
                    Object geometryAttribute = feature.getAttribute(geometryName);
                    if (!(geometryAttribute instanceof Geometry geometry)) {
                        outputFeature.putNull("geometry");
                    } else {
                        Geometry projected = JTS.transform(geometry, transform);
                        outputFeature.set("geometry", geometryToJson(projected));
                    }

                    ObjectNode properties = outputFeature.putObject("properties");
                    for (AttributeDescriptor descriptor : schema.getAttributeDescriptors()) {
                        String name = descriptor.getLocalName();
                        if (!name.equals(geometryName)) {
                            properties.set(name, objectMapper.valueToTree(feature.getAttribute(name)));
                        }
                    }
                }
            }
            return objectMapper.writeValueAsString(collection);
        } finally {
            store.dispose();
        }
    }

    private JsonNode geometryToJson(Geometry geometry) {
        ObjectNode result = objectMapper.createObjectNode();
        if (geometry instanceof Point point) {
            result.put("type", "Point");
            result.set("coordinates", coordinate(point.getCoordinate().x, point.getCoordinate().y));
        } else if (geometry instanceof MultiPoint points) {
            result.put("type", "MultiPoint");
            ArrayNode coordinates = result.putArray("coordinates");
            for (int i = 0; i < points.getNumGeometries(); i++) {
                var point = (Point) points.getGeometryN(i);
                coordinates.add(coordinate(point.getX(), point.getY()));
            }
        } else if (geometry instanceof LineString line) {
            result.put("type", "LineString");
            result.set("coordinates", lineCoordinates(line));
        } else if (geometry instanceof MultiLineString lines) {
            result.put("type", "MultiLineString");
            ArrayNode coordinates = result.putArray("coordinates");
            for (int i = 0; i < lines.getNumGeometries(); i++) {
                coordinates.add(lineCoordinates((LineString) lines.getGeometryN(i)));
            }
        } else if (geometry instanceof Polygon polygon) {
            result.put("type", "Polygon");
            result.set("coordinates", polygonCoordinates(polygon));
        } else if (geometry instanceof MultiPolygon polygons) {
            result.put("type", "MultiPolygon");
            ArrayNode coordinates = result.putArray("coordinates");
            for (int i = 0; i < polygons.getNumGeometries(); i++) {
                coordinates.add(polygonCoordinates((Polygon) polygons.getGeometryN(i)));
            }
        } else if (geometry instanceof GeometryCollection collection) {
            result.put("type", "GeometryCollection");
            ArrayNode geometries = result.putArray("geometries");
            for (int i = 0; i < collection.getNumGeometries(); i++) {
                geometries.add(geometryToJson(collection.getGeometryN(i)));
            }
        } else {
            throw new IllegalArgumentException("Unsupported geometry type: " + geometry.getGeometryType());
        }
        return result;
    }

    private ArrayNode polygonCoordinates(Polygon polygon) {
        ArrayNode rings = objectMapper.createArrayNode();
        rings.add(lineCoordinates(polygon.getExteriorRing()));
        for (int i = 0; i < polygon.getNumInteriorRing(); i++) {
            rings.add(lineCoordinates(polygon.getInteriorRingN(i)));
        }
        return rings;
    }

    private ArrayNode lineCoordinates(LineString line) {
        ArrayNode coordinates = objectMapper.createArrayNode();
        for (var coordinate : line.getCoordinates()) {
            coordinates.add(coordinate(coordinate.x, coordinate.y));
        }
        return coordinates;
    }

    private ArrayNode coordinate(double longitude, double latitude) {
        ArrayNode coordinate = objectMapper.createArrayNode();
        coordinate.add(longitude);
        coordinate.add(latitude);
        return coordinate;
    }

    private void deleteRecursively(Path directory) throws IOException {
        if (!Files.exists(directory)) {
            return;
        }
        try (var paths = Files.walk(directory)) {
            for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }
}
