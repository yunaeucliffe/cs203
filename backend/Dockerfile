# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
# Uses the image's own Maven rather than ./mvnw so the build does not need to
# download a Maven distribution first.
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build

# Dependency resolution is cached as its own layer and isn't invalidated by
# source changes. lib-repo/ holds the vendored GeoTools artifacts (see pom.xml).
COPY pom.xml ./
COPY lib-repo/ lib-repo/
# go-offline is only a cache warm-up: it is known to fail on plugin-level
# resolution quirks that do not affect packaging, so a failure here must not
# fail the build. A genuinely missing dependency still fails `package` below.
RUN mvn -B -ntp dependency:go-offline || true

COPY src/ src/
RUN mvn -B -ntp -DskipTests package \
    && mv target/*.jar target/app.jar

# ---- Runtime stage ----------------------------------------------------------
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --from=build /build/target/app.jar app.jar

# Container-friendly JVM settings: size the heap from the container memory
# limit and favour fast startup (C1 only, serial GC) so the server binds its
# port well within the platform's startup timeout.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:TieredStopAtLevel=1 -XX:+UseSerialGC"

# Vercel's container runtime injects PORT; 8081 stays the local default.
# application.properties also reads ${PORT:8081}, so this flag is a belt-and-braces
# guarantee that the platform's port wins.
EXPOSE 8081

USER app

CMD ["sh", "-c", "exec java -Dserver.port=${PORT:-8081} -jar app.jar"]
