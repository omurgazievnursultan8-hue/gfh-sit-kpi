package kg.gfh.kpi.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Value("${LOGIN_RATE_LIMIT_ENABLED:true}")
    private boolean enabled;

    public boolean tryConsume(String ip) {
        if (!enabled) return true;
        return buckets.computeIfAbsent(ip, k -> newBucket()).tryConsume(1);
    }

    /** Test/admin hook: clear all in-memory buckets. */
    public void reset() {
        buckets.clear();
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(5)
                .refillGreedy(5, Duration.ofMinutes(15))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
