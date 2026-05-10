package kg.gfh.kpi.security;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class PasswordPolicyValidator {

    private final Set<String> dictionary;

    public PasswordPolicyValidator() {
        var rawStream = getClass().getResourceAsStream("/password-dictionary.txt");
        if (rawStream == null) {
            throw new RuntimeException("password-dictionary.txt not found on classpath");
        }
        try (var reader = new BufferedReader(new InputStreamReader(rawStream))) {
            this.dictionary = reader.lines()
                    .map(String::toLowerCase)
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            throw new RuntimeException("Failed to load password dictionary", e);
        }
    }

    public record ValidationResult(boolean valid, String violation) {}

    public ValidationResult validate(String password, List<String> passwordHistory) {
        if (password == null || password.length() < 10) {
            return new ValidationResult(false, "Password must be at least 10 characters");
        }
        if (!password.matches(".*[A-Z].*")) {
            return new ValidationResult(false, "Password must contain at least one uppercase letter");
        }
        if (!password.matches(".*[a-z].*")) {
            return new ValidationResult(false, "Password must contain at least one lowercase letter");
        }
        if (!password.matches(".*\\d.*")) {
            return new ValidationResult(false, "Password must contain at least one digit");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            return new ValidationResult(false, "Password must contain at least one special character");
        }
        if (dictionary.contains(password.toLowerCase())) {
            return new ValidationResult(false, "Password is too common — choose something less obvious");
        }
        for (String hash : passwordHistory) {
            if (BCrypt.checkpw(password, hash)) {
                return new ValidationResult(false, "Password was used recently — cannot reuse last 5 passwords in history");
            }
        }
        return new ValidationResult(true, null);
    }
}
