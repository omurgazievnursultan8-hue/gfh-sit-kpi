package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AuditLogResponse;
import kg.gfh.kpi.entity.AuditLog;
import kg.gfh.kpi.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public Page<AuditLogResponse> search(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20, sort = "timestamp",
                direction = Sort.Direction.DESC) Pageable pageable
    ) {
        LocalDateTime fromBound = from != null ? from : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime toBound   = to   != null ? to   : LocalDateTime.of(9999, 1, 1, 0, 0);
        return auditLogRepository.search(actorId, action, entityType, fromBound, toBound, pageable)
                .map(this::toResponse);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) throws IOException {
        LocalDateTime fromBound = from != null ? from : LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime toBound   = to   != null ? to   : LocalDateTime.of(9999, 1, 1, 0, 0);
        List<AuditLog> rows = auditLogRepository
                .search(actorId, action, entityType, fromBound, toBound, Pageable.ofSize(10_000))
                .getContent();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Аудит");

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {"ID", "Actor ID", "Email", "Action", "Entity Type",
                    "Entity ID", "Details", "IP Address", "Timestamp"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (AuditLog entry : rows) {
                Row r = sheet.createRow(rowNum++);
                r.createCell(0).setCellValue(entry.getId() != null ? entry.getId() : 0);
                r.createCell(1).setCellValue(entry.getUserId() != null ? entry.getUserId() : 0);
                r.createCell(2).setCellValue(entry.getUserName() != null ? entry.getUserName() : "");
                r.createCell(3).setCellValue(entry.getAction());
                r.createCell(4).setCellValue(entry.getEntityType() != null ? entry.getEntityType() : "");
                if (entry.getEntityId() != null) r.createCell(5).setCellValue(entry.getEntityId());
                r.createCell(6).setCellValue(entry.getNewValue() != null ? entry.getNewValue() : "");
                r.createCell(7).setCellValue(entry.getIpAddress() != null ? entry.getIpAddress() : "");
                r.createCell(8).setCellValue(entry.getTimestamp().toString());
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-log.xlsx\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }

    private AuditLogResponse toResponse(AuditLog entry) {
        return new AuditLogResponse(
                entry.getId(),
                entry.getUserId(),
                entry.getUserName(),
                entry.getAction(),
                entry.getEntityType(),
                entry.getEntityId(),
                entry.getNewValue(),
                entry.getIpAddress(),
                entry.getTimestamp()
        );
    }
}
