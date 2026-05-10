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
        return fileService.upload(evaluationId, resolveUserId(auth), file);
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
