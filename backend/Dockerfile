FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S kpi && adduser -S kpi -G kpi
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/logs /app/uploads && chown -R kpi:kpi /app
USER kpi
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dfile.encoding=UTF-8", "-Duser.timezone=Asia/Bishkek", "app.jar"]
