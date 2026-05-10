package kg.gfh.kpi.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordPolicyValidatorTest {

    private PasswordPolicyValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PasswordPolicyValidator();
    }

    @Test
    void validPasswordPasses() {
        var result = validator.validate("SecurePass1!", List.of());
        assertThat(result.valid()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"short1!", "nouppercase1!", "NOLOWERCASE1!", "NoSpecial12", "NoDigit!Abc"})
    void weakPasswordFails(String password) {
        var result = validator.validate(password, List.of());
        assertThat(result.valid()).isFalse();
    }

    @Test
    void passwordTooShortFails() {
        var result = validator.validate("Ab1!", List.of());
        assertThat(result.valid()).isFalse();
        assertThat(result.violation()).contains("10");
    }

    @Test
    void passwordInHistoryFails() {
        String oldHash = org.springframework.security.crypto.bcrypt.BCrypt.hashpw("OldPass123!", org.springframework.security.crypto.bcrypt.BCrypt.gensalt());
        var result = validator.validate("OldPass123!", List.of(oldHash));
        assertThat(result.valid()).isFalse();
        assertThat(result.violation()).contains("history");
    }

    @Test
    void dictionaryPasswordFails() {
        var result = validator.validate("Password1!", List.of());
        assertThat(result.valid()).isFalse();
        assertThat(result.violation()).contains("common");
    }
}
