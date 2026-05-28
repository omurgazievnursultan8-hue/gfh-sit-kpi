package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.EvaluationFile;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.CriteriaRepository;
import kg.gfh.kpi.repository.EvaluationFileRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB
    private static final int MAX_FILES_PER_EVALUATION = 10;

    private static final Map<String, byte[]> ALLOWED_MAGIC_BYTES = Map.of(
        "application/pdf",  new byte[]{0x25, 0x50, 0x44, 0x46},
        "image/png",        new byte[]{(byte)0x89, 0x50, 0x4E, 0x47},
        "image/jpeg",       new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF},
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            new byte[]{0x50, 0x4B, 0x03, 0x04}
    );

    @Value("${app.upload-dir:/app/uploads}")
    private String uploadDir;

    private final EvaluationFileRepository fileRepository;
    private final EvaluationRepository evaluationRepository;
    private final CriteriaRepository criteriaRepository;
    private final AuditService auditService;

    @Transactional
    public EvaluationFile upload(Long evaluationId, Long uploaderId, MultipartFile file) {
        return upload(evaluationId, null, uploaderId, file);
    }

    @Transactional
    public EvaluationFile upload(Long evaluationId, Long criteriaId, Long uploaderId, MultipartFile file) {
        validateAccess(evaluationId, uploaderId);

        if (criteriaId != null && !criteriaRepository.existsById(criteriaId)) {
            throw new ApiException("INVALID_CRITERIA",
                "Критерий не найден", "Критерий табылган жок");
        }

        if (fileRepository.countByEvaluationId(evaluationId) >= MAX_FILES_PER_EVALUATION) {
            throw new ApiException("FILE_LIMIT_EXCEEDED",
                "Максимальное количество файлов на оценку: " + MAX_FILES_PER_EVALUATION,
                "Бир баалоо үчүн максималдуу файл саны: " + MAX_FILES_PER_EVALUATION);
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException("FILE_TOO_LARGE",
                "Файл превышает 10 МБ", "Файл 10 МБдан ашат");
        }

        String detectedMime = detectMimeByMagicBytes(file);
        if (!ALLOWED_MAGIC_BYTES.containsKey(detectedMime)) {
            throw new ApiException("UNSUPPORTED_FILE_TYPE",
                "Допустимые форматы: PDF, PNG, JPEG, DOCX",
                "Уруксат берилген форматтар: PDF, PNG, JPEG, DOCX");
        }

        String sanitizedName = sanitizeFilename(file.getOriginalFilename());
        String uuid = UUID.randomUUID().toString();
        Path dir = Paths.get(uploadDir, "evaluations", evaluationId.toString());
        Path dest = dir.resolve(uuid);

        try {
            Files.createDirectories(dir);
            Files.write(dest, file.getBytes());
        } catch (IOException e) {
            throw new ApiException("FILE_STORAGE_ERROR",
                "Ошибка при сохранении файла", "Файлды сактоодо ката кетти");
        }

        EvaluationFile record = new EvaluationFile();
        record.setEvaluationId(evaluationId);
        record.setCriteriaId(criteriaId);
        record.setUploadedBy(uploaderId);
        record.setOriginalName(sanitizedName);
        record.setStoragePath(dest.toString());
        record.setMimeType(detectedMime);
        record.setFileSize(file.getSize());
        return fileRepository.save(record);
    }

    public byte[] download(Long fileId, Long requesterId) {
        EvaluationFile fileRecord = fileRepository.findById(fileId)
            .orElseThrow(() -> new ApiException("FILE_NOT_FOUND",
                "Файл не найден", "Файл табылган жок"));

        validateAccess(fileRecord.getEvaluationId(), requesterId);

        try {
            byte[] data = Files.readAllBytes(Paths.get(fileRecord.getStoragePath()));
            auditService.logFileDownload(requesterId, fileId, fileRecord.getOriginalName());
            return data;
        } catch (IOException e) {
            throw new ApiException("FILE_READ_ERROR",
                "Не удалось прочитать файл", "Файлды окуу мүмкүн болгон жок");
        }
    }

    public List<EvaluationFile> listFiles(Long evaluationId) {
        return fileRepository.findByEvaluationId(evaluationId);
    }

    @Transactional
    public void delete(Long fileId, Long requesterId) {
        EvaluationFile fileRecord = fileRepository.findById(fileId)
            .orElseThrow(() -> new ApiException("FILE_NOT_FOUND",
                "Файл не найден", "Файл табылган жок"));
        validateAccess(fileRecord.getEvaluationId(), requesterId);

        try {
            Files.deleteIfExists(Paths.get(fileRecord.getStoragePath()));
        } catch (IOException e) {
            log.warn("Could not delete file from disk: {}", fileRecord.getStoragePath());
        }
        fileRepository.delete(fileRecord);
    }

    private String detectMimeByMagicBytes(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = is.readNBytes(8);
            for (Map.Entry<String, byte[]> entry : ALLOWED_MAGIC_BYTES.entrySet()) {
                if (startsWith(header, entry.getValue())) return entry.getKey();
            }
        } catch (IOException e) {
            throw new ApiException("FILE_READ_ERROR", "Ошибка чтения файла", "Файлды окуу катасы");
        }
        return "application/octet-stream";
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "file";
        String sanitized = name.replaceAll("[^a-zA-Z0-9._\\-]", "_")
                               .replaceAll("\\.{2,}", ".");
        return sanitized.substring(0, Math.min(sanitized.length(), 200));
    }

    private void validateAccess(Long evaluationId, Long userId) {
        Evaluation eval = evaluationRepository.findById(evaluationId)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
        if (!eval.getEvaluator().getId().equals(userId) &&
            !eval.getEvaluatee().getId().equals(userId)) {
            throw new ApiException("ACCESS_DENIED",
                "Нет доступа к этой оценке", "Бул баалоого жетүү жок");
        }
    }
}
