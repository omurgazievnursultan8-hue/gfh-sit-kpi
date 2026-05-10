# M3-BE-04: FileService — Magic Bytes, MIME, Filename Sanitization, IDOR Protection, Audit on Download

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `FileService` for secure file upload/download on evaluations: validate file type via magic bytes (not just extension), sanitize filenames, store files under UUID-based paths to prevent IDOR, limit file size and count per evaluation, and write an audit log entry on every download.

**Architecture:** Files are stored in `${app.upload-dir}/evaluations/{evaluationId}/{uuid}`. The original filename is sanitized and stored in `evaluation_files.original_name`. Download endpoint reads `evaluation_files.storage_path`, checks that the requesting user owns the evaluation (evaluatee or evaluator), streams the file, and writes an `audit_log` entry. Magic byte check reads the first 8 bytes to detect PDF/images/Office docs.

**Tech Stack:** Spring Boot 3.x, Spring Web (MultipartFile), Java NIO.

**Depends on:** m3-workflow/be-02-evaluation-service.md

---

### Task 1: EvaluationFile entity + repository

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/EvaluationFile.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/EvaluationFileRepository.java`

- [ ] **Step 1: Create entity**

`backend/src/main/java/kg/gfh/kpi/entity/EvaluationFile.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_files")
@Getter @Setter
public class EvaluationFile {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false)
    private Long evaluationId;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "storage_path", nullable = false, unique = true, length = 500)
    private String storagePath;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
```

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationFileRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationFileRepository extends JpaRepository<EvaluationFile, Long> {
    List<EvaluationFile> findByEvaluationId(Long evaluationId);
    long countByEvaluationId(Long evaluationId);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/EvaluationFile.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationFileRepository.java
git commit -m "feat(files): add EvaluationFile entity and repository"
```

---

### Task 2: FileService with security checks

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/service/FileService.java`

- [ ] **Step 1: Create FileService**

`backend/src/main/java/kg/gfh/kpi/service/FileService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.EvaluationFile;
import kg.gfh.kpi.exception.ApiException;
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

    // Magic byte signatures: type → first bytes
    private static final Map<String, byte[]> ALLOWED_MAGIC_BYTES = Map.of(
        "application/pdf",  new byte[]{0x25, 0x50, 0x44, 0x46},          // %PDF
        "image/png",        new byte[]{(byte)0x89, 0x50, 0x4E, 0x47},    // PNG
        "image/jpeg",       new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF}, // JPEG
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            new byte[]{0x50, 0x4B, 0x03, 0x04}           // DOCX (ZIP)
    );

    @Value("${app.upload-dir:/app/uploads}")
    private String uploadDir;

    private final EvaluationFileRepository fileRepository;
    private final EvaluationRepository evaluationRepository;
    private final AuditService auditService;

    @Transactional
    public EvaluationFile upload(Long evaluationId, Long uploaderId, MultipartFile file) {
        validateUploader(evaluationId, uploaderId);

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

        validateDownloader(fileRecord.getEvaluationId(), requesterId);

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
        validateUploader(fileRecord.getEvaluationId(), requesterId);

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
                byte[] magic = entry.getValue();
                if (startsWith(header, magic)) return entry.getKey();
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
        // Remove path traversal chars and limit length
        return name.replaceAll("[^a-zA-Z0-9._\\-]", "_")
                   .replaceAll("\\.{2,}", ".")
                   .substring(0, Math.min(name.length(), 200));
    }

    private void validateUploader(Long evaluationId, Long userId) {
        Evaluation eval = evaluationRepository.findById(evaluationId)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
        if (!eval.getEvaluator().getId().equals(userId) &&
            !eval.getEvaluatee().getId().equals(userId)) {
            throw new ApiException("ACCESS_DENIED",
                "Нет доступа к этой оценке", "Бул баалоого жетүү жок");
        }
    }

    private void validateDownloader(Long evaluationId, Long userId) {
        validateUploader(evaluationId, userId); // Same access rules
    }
}
```

- [ ] **Step 2: Create FileController**

`backend/src/main/java/kg/gfh/kpi/controller/FileController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.EvaluationFile;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/evaluations/{evaluationId}/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final UserRepository userRepository;

    @GetMapping
    public List<EvaluationFile> listFiles(@PathVariable Long evaluationId) {
        return fileService.listFiles(evaluationId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EvaluationFile upload(
            @PathVariable Long evaluationId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        return fileService.upload(evaluationId, userId, file);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<byte[]> download(
            @PathVariable Long evaluationId,
            @PathVariable Long fileId,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        byte[] data = fileService.download(fileId, userId);

        EvaluationFile meta = fileService.listFiles(evaluationId).stream()
            .filter(f -> f.getId().equals(fileId))
            .findFirst().orElseThrow();

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + meta.getOriginalName() + "\"")
            .contentType(MediaType.parseMediaType(meta.getMimeType()))
            .body(data);
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long evaluationId,
            @PathVariable Long fileId,
            Authentication auth) {
        fileService.delete(fileId, resolveUserId(auth));
        return ResponseEntity.noContent().build();
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

Add `app.upload-dir` to `application.yml`:
```yaml
app:
  upload-dir: ${UPLOAD_DIR:/app/uploads}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/FileService.java \
        backend/src/main/java/kg/gfh/kpi/controller/FileController.java \
        backend/src/main/resources/application.yml
git commit -m "feat(files): add FileService with magic-byte validation, UUID storage, IDOR protection, and audit on download"
```
