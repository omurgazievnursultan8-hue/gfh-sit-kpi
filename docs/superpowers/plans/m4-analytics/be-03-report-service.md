# M4-BE-03: ReportService — Apache POI Excel + iText PDF, Audit on Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `ReportService` that generates Excel (Apache POI) and PDF (iText) reports for evaluation results. Reports include: period summary (all employees, scores, status), personal history, and anti-bonus breakdown. Every export writes an audit log entry.

**Architecture:** Excel report uses `XSSFWorkbook` with styled header row and data rows. PDF uses `iText 7 PdfDocument`. Both share a common data-gathering service that runs the same query; only the rendering differs. `ReportController` streams the file as an attachment and writes an audit log row via `AuditService`.

**Tech Stack:** Spring Boot 3.x, Apache POI 5.x, iText 7.x, PostgreSQL 15.

**Depends on:** m4-analytics/be-01-hierarchical-analytics.md

---

### Task 1: Add dependencies + ReportService

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/kg/gfh/kpi/service/ReportService.java`

- [ ] **Step 1: Add POI and iText to pom.xml**

In `backend/pom.xml`, add inside `<dependencies>`:
```xml
<!-- Apache POI for Excel reports -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>

<!-- iText 7 for PDF reports -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>7.2.6</version>
    <type>pom</type>
</dependency>
```

- [ ] **Step 2: Create ReportService**

`backend/src/main/java/kg/gfh/kpi/service/ReportService.java`:
```java
package kg.gfh.kpi.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import kg.gfh.kpi.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final JdbcTemplate jdbc;
    private final AuditService auditService;

    public byte[] generatePeriodSummaryExcel(Long periodId, Long requesterId) {
        List<Map<String, Object>> rows = fetchPeriodData(periodId);

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Оценки");

            // Styled header
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {"ФИО", "Подразделение", "Оценщик", "Статус", "Итоговый балл"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }

            // Data rows
            int rowNum = 1;
            for (Map<String, Object> row : rows) {
                Row dataRow = sheet.createRow(rowNum++);
                dataRow.createCell(0).setCellValue(str(row, "evaluatee_name"));
                dataRow.createCell(1).setCellValue(str(row, "org_unit_name"));
                dataRow.createCell(2).setCellValue(str(row, "evaluator_name"));
                dataRow.createCell(3).setCellValue(str(row, "status"));
                Object score = row.get("final_score");
                if (score != null) {
                    dataRow.createCell(4).setCellValue(Double.parseDouble(score.toString()));
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);

            auditService.logExport(requesterId, "PERIOD_SUMMARY_EXCEL", periodId);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException("REPORT_ERROR", "Ошибка при генерации отчёта",
                "Отчёт түзүүдө ката кетти");
        }
    }

    public byte[] generatePeriodSummaryPdf(Long periodId, Long requesterId) {
        List<Map<String, Object>> rows = fetchPeriodData(periodId);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf);

        doc.add(new Paragraph("Отчёт по оценкам — Период #" + periodId)
            .setFontSize(16).setBold());
        doc.add(new Paragraph(" "));

        float[] colWidths = {150f, 120f, 120f, 80f, 60f};
        Table table = new Table(colWidths);

        // Headers
        String[] headers = {"ФИО", "Подразделение", "Оценщик", "Статус", "Балл"};
        for (String h : headers) {
            table.addHeaderCell(new Cell().add(new Paragraph(h).setBold()));
        }

        // Data
        for (Map<String, Object> row : rows) {
            table.addCell(str(row, "evaluatee_name"));
            table.addCell(str(row, "org_unit_name"));
            table.addCell(str(row, "evaluator_name"));
            table.addCell(str(row, "status"));
            Object score = row.get("final_score");
            table.addCell(score != null ? score.toString() : "—");
        }

        doc.add(table);
        doc.close();

        auditService.logExport(requesterId, "PERIOD_SUMMARY_PDF", periodId);
        return out.toByteArray();
    }

    private List<Map<String, Object>> fetchPeriodData(Long periodId) {
        return jdbc.queryForList("""
            SELECT u.full_name as evaluatee_name,
                   ou.name as org_unit_name,
                   ev.full_name as evaluator_name,
                   e.status,
                   e.final_score
            FROM evaluations e
            JOIN users u ON u.id = e.evaluatee_id
            JOIN users ev ON ev.id = e.evaluator_id
            LEFT JOIN org_units ou ON ou.id = u.org_unit_id
            WHERE e.period_id = ?
            ORDER BY ou.name, u.full_name
            """, periodId);
    }

    private String str(Map<String, Object> row, String key) {
        Object val = row.get(key);
        return val != null ? val.toString() : "—";
    }
}
```

- [ ] **Step 3: Create ReportController**

`backend/src/main/java/kg/gfh/kpi/controller/ReportController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    @GetMapping("/periods/{id}/excel")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN','DEPUTY_CHAIRMAN')")
    public ResponseEntity<byte[]> periodExcel(@PathVariable Long id, Authentication auth) {
        Long userId = resolveUserId(auth);
        byte[] data = reportService.generatePeriodSummaryExcel(id, userId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"period-" + id + "-report.xlsx\"")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(data);
    }

    @GetMapping("/periods/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN','DEPUTY_CHAIRMAN')")
    public ResponseEntity<byte[]> periodPdf(@PathVariable Long id, Authentication auth) {
        Long userId = resolveUserId(auth);
        byte[] data = reportService.generatePeriodSummaryPdf(id, userId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"period-" + id + "-report.pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(data);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/pom.xml \
        backend/src/main/java/kg/gfh/kpi/service/ReportService.java \
        backend/src/main/java/kg/gfh/kpi/controller/ReportController.java
git commit -m "feat(reports): add ReportService with Apache POI Excel and iText PDF generation + audit on export"
```
