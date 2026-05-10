package kg.gfh.kpi.exception;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {
    private final String code;
    private final String messageRu;
    private final String messageKg;

    public ApiException(String code, String messageRu, String messageKg) {
        super(messageRu);
        this.code = code;
        this.messageRu = messageRu;
        this.messageKg = messageKg;
    }
}
