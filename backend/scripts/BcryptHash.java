import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BcryptHash {
    public static void main(String[] args) {
        String password = args.length > 0 ? args[0] : "Test123!@#";
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder(12);
        System.out.println(enc.encode(password));
    }
}
