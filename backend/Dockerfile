# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /build

# Copy only what the Maven Wrapper needs first so dependency resolution
# is cached as its own layer and isn't invalidated by source changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -ntp -Dmaven.test.skip=true clean package \
    && mv target/*.jar target/app.jar

# ---- Runtime stage ----------------------------------------------------------
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --from=build /build/target/app.jar app.jar

# Vercel's container runtime defaults to port 80 and lets the PORT env var
# override it; the Spring Boot app reads the same PORT variable
# (server.port=${PORT:8081} in application.properties) so no extra wiring
# is needed here. 8081 stays the documented local-dev default.
EXPOSE 8081

USER app

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
