package kg.gfh.kpi.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
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

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {"ФИО", "Подразделение", "Оценщик", "Статус", "Итоговый балл"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

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

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
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

        String[] headers = {"ФИО", "Подразделение", "Оценщик", "Статус", "Балл"};
        for (String h : headers) {
            table.addHeaderCell(new Cell().add(new Paragraph(h).setBold()));
        }

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
                   ou.name_ru as org_unit_name,
                   ev.full_name as evaluator_name,
                   e.status,
                   e.final_score
            FROM evaluations e
            JOIN users u ON u.id = e.evaluatee_id
            JOIN users ev ON ev.id = e.evaluator_id
            LEFT JOIN org_units ou ON ou.id = u.org_unit_id
            WHERE e.period_id = ?
            ORDER BY ou.name_ru, u.full_name
            """, periodId);
    }

    private String str(Map<String, Object> row, String key) {
        Object val = row.get(key);
        return val != null ? val.toString() : "—";
    }
}
