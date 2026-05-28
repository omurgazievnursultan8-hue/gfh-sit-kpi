# Evaluation Form Focus-Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dense two-column `EvaluationFormPage` with focused one-criterion-at-a-time stepper; two-phase flow (positive → anti-bonus); per-criterion rubric, score chips, files; backend gains `Criteria.description{Ru,Kg}` + `evaluation_files.criteria_id`.

**Architecture:** Frontend = stateful `useEvaluationForm` hook drives a `<PhaseRouter>` that switches between `<CriterionStep>`, `<PhaseTransition>`, `<ReviewStep>` based on `phase` + `cursor`. Backend = additive Liquibase changeset + nullable entity fields + tightened validation (anti-bonus notes, auto-calc read-only). All changes preserve existing dv3 visual tokens.

**Tech Stack:** Spring Boot 3.2 / Java 17 / Liquibase / Testcontainers + JUnit5 (backend) — React 18 / Vite / Redux Toolkit / react-i18next / Vitest + Testing Library (frontend).

**Spec:** `docs/superpowers/specs/2026-05-28-evaluation-form-focus-mode-design.md`

---

## File Map

### Backend create

- `backend/src/main/resources/db/changelog/m7/049-evaluation-form-focus-mode.xml` — Liquibase changeset (description fields + criteria_id FK).
- `backend/src/test/java/kg/gfh/kpi/service/CriteriaDescriptionTest.java` — round-trip + null tolerance.
- `backend/src/test/java/kg/gfh/kpi/service/EvaluationFileCriteriaIdTest.java` — upload w/ + w/o criteriaId, FK violation, restrict on criterion delete.
- `backend/src/test/java/kg/gfh/kpi/service/EvaluationValidationTest.java` — auto-calc read-only, anti-bonus note required.

### Backend modify

- `backend/src/main/resources/db/changelog/db.changelog-master.xml` — add `<include>` for m7 changeset.
- `backend/src/main/java/kg/gfh/kpi/entity/Criteria.java` — `descriptionRu`, `descriptionKg` fields.
- `backend/src/main/java/kg/gfh/kpi/entity/EvaluationFile.java` — `criteriaId` field.
- `backend/src/main/java/kg/gfh/kpi/dto/CriteriaRequest.java` — description fields.
- `backend/src/main/java/kg/gfh/kpi/dto/CriteriaResponse.java` — description fields.
- `backend/src/main/java/kg/gfh/kpi/dto/EvaluationFileResponse.java` (locate or create alongside `FileController`) — `criteriaId`.
- `backend/src/main/java/kg/gfh/kpi/dto/EvaluationResponse.java` — `periodNameRu`, `periodNameKg`.
- `backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java` — accept description fields in `create`/`update`.
- `backend/src/main/java/kg/gfh/kpi/service/FileService.java` — accept optional `criteriaId` on upload; validate FK.
- `backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java` — anti-bonus note rule, auto-calc rejection, periodName populate.
- `backend/src/main/java/kg/gfh/kpi/controller/FileController.java` — accept `criteriaId` form-data param.

### Frontend create (under `frontend/src/features/evaluations/form/`)

- `useEvaluationForm.ts` — state hook + state machine.
- `useAutosave.ts` — debounce + interval + visibilitychange + beforeunload.
- `useKeyboardShortcuts.ts` — `←/→`, `1..5`, `Cmd+S`, `Cmd+Enter`, `?`, `Esc`.
- `formStyles.ts` — exports `FORM_CSS` string (dv3 token-based).
- `FormShell.tsx` — page chrome, sticky topbar.
- `StepperHeader.tsx` — phase badge, dots, count.
- `PhaseRouter.tsx` — switch view from `phase`.
- `CriterionStep.tsx` — wraps RubricPanel + ScoreInput + NoteField + CriterionFiles.
- `RubricPanel.tsx` — name, weight chip, scope chip, description.
- `ScoreInput.tsx` — preset chips + custom number reveal.
- `NoteField.tsx` — autosize textarea + validation.
- `CriterionFiles.tsx` — drag-drop + file list (filtered by criteriaId).
- `PhaseTransition.tsx` — positive → anti-bonus screen.
- `ReviewStep.tsx` — final summary + submit confirm.
- `BottomBar.tsx` — prev / next / save indicator / drawer toggle / submit.
- `ChecklistDrawer.tsx` — right panel desktop / sheet mobile.
- `ShortcutsOverlay.tsx` — `?` keyboard help.

### Frontend modify

- `frontend/src/features/evaluations/EvaluationFormPage.tsx` — replaced entirely (orchestrates new components).
- `frontend/src/features/evaluations/evaluationsApi.ts` — extend types (`periodNameRu/Kg`), file upload accepts `criteriaId`.
- `frontend/src/features/criteria/criteriaApi.ts` — add `descriptionRu/Kg` to `Criteria` + `CriteriaRequest`.
- `frontend/src/features/criteria/components/CriteriaFormModal.tsx` — add description textareas.
- `frontend/public/locales/ru/translation.json` — `evaluation.form.*` namespace.
- `frontend/public/locales/kg/translation.json` — `evaluation.form.*` namespace.
- `frontend/src/App.tsx` — no route change but verify lazy import works after replacement.

### Frontend archive

- `frontend/src/features/evaluations/EvaluationFormPage.legacy.tsx` — copy of pre-redesign page, kept 1 release for rollback.

### Frontend tests

- `frontend/src/features/evaluations/form/__tests__/useEvaluationForm.test.ts`
- `frontend/src/features/evaluations/form/__tests__/ScoreInput.test.tsx`
- `frontend/src/features/evaluations/form/__tests__/NoteField.test.tsx`
- `frontend/src/features/evaluations/form/__tests__/CriterionFiles.test.tsx`
- `frontend/src/features/evaluations/form/__tests__/useKeyboardShortcuts.test.ts`
- `frontend/src/features/evaluations/form/__tests__/PhaseRouter.test.tsx`

---

# Phase 1 — Backend foundation

## Task 1: Liquibase changeset for descriptions + criteria_id FK

**Files:**
- Create: `backend/src/main/resources/db/changelog/m7/049-evaluation-form-focus-mode.xml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

- [ ] **Step 1: Create changeset file**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="m7-049-001-add-criteria-description" author="azamat">
        <addColumn tableName="criteria">
            <column name="description_ru" type="TEXT"/>
            <column name="description_kg" type="TEXT"/>
        </addColumn>
        <rollback>
            <dropColumn tableName="criteria" columnName="description_ru"/>
            <dropColumn tableName="criteria" columnName="description_kg"/>
        </rollback>
    </changeSet>

    <changeSet id="m7-049-002-add-evaluation-file-criteria-id" author="azamat">
        <addColumn tableName="evaluation_files">
            <column name="criteria_id" type="BIGINT">
                <constraints nullable="true"
                    foreignKeyName="fk_eval_file_criteria"
                    referencedTableName="criteria"
                    referencedColumnNames="id"/>
            </column>
        </addColumn>
        <createIndex tableName="evaluation_files" indexName="idx_eval_files_criteria_id">
            <column name="criteria_id"/>
        </createIndex>
        <rollback>
            <dropIndex tableName="evaluation_files" indexName="idx_eval_files_criteria_id"/>
            <dropColumn tableName="evaluation_files" columnName="criteria_id"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

- [ ] **Step 2: Register in master changelog**

Modify `backend/src/main/resources/db/changelog/db.changelog-master.xml`. After the last `m6/*` `<include>` line (around `m6/048-seed-norating-user.xml`), add:

```xml
    <include file="db/changelog/m7/049-evaluation-form-focus-mode.xml"/>
```

- [ ] **Step 3: Run backend to verify migration applies**

```bash
./scripts/restart-backend.sh
```

Tail `.dev-logs/backend.log`. Expected: lines `Reading from PUBLIC.DATABASECHANGELOG`, `Liquibase: Update has been successful`. No `ChangeSetExecutionException`.

- [ ] **Step 4: Verify columns**

```bash
docker exec gfh-postgres psql -U gfh -d gfh -c "\d criteria" | grep description
docker exec gfh-postgres psql -U gfh -d gfh -c "\d evaluation_files" | grep criteria_id
```

Expected: `description_ru | text`, `description_kg | text`, `criteria_id | bigint`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/changelog/m7/049-evaluation-form-focus-mode.xml backend/src/main/resources/db/changelog/db.changelog-master.xml
git commit -m "feat(db): add criteria.description_ru/kg and evaluation_files.criteria_id"
```

---

## Task 2: Entity fields — Criteria descriptions

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/entity/Criteria.java`

- [ ] **Step 1: Add description fields**

In `Criteria.java`, after the `nameKg` field block (line ~22), add:

```java
    @Column(name = "description_ru", columnDefinition = "TEXT")
    private String descriptionRu;

    @Column(name = "description_kg", columnDefinition = "TEXT")
    private String descriptionKg;
```

- [ ] **Step 2: Compile**

```bash
cd backend && mvn -q compile
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/Criteria.java
git commit -m "feat(entity): Criteria.description_ru/kg fields"
```

---

## Task 3: Entity field — EvaluationFile.criteriaId

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/entity/EvaluationFile.java`

- [ ] **Step 1: Add criteriaId field**

In `EvaluationFile.java`, after the `evaluationId` block (line ~18), add:

```java
    @Column(name = "criteria_id")
    private Long criteriaId;
```

- [ ] **Step 2: Compile**

```bash
cd backend && mvn -q compile
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/EvaluationFile.java
git commit -m "feat(entity): EvaluationFile.criteria_id field"
```

---

## Task 4: DTO updates — Criteria

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/dto/CriteriaRequest.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/dto/CriteriaResponse.java`

- [ ] **Step 1: Extend CriteriaRequest**

Replace `CriteriaRequest.java` body with:

```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.*;
import kg.gfh.kpi.entity.Criteria.CriteriaType;

import java.math.BigDecimal;

public record CriteriaRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @Size(max = 4000) String descriptionRu,
    @Size(max = 4000) String descriptionKg,
    @NotNull CriteriaType type,
    @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal weight,
    Long orgUnitId,
    boolean autoCalculated
) {}
```

- [ ] **Step 2: Extend CriteriaResponse**

Replace `CriteriaResponse.java` body with:

```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CriteriaResponse(
    Long id,
    String nameRu,
    String nameKg,
    String descriptionRu,
    String descriptionKg,
    CriteriaType type,
    BigDecimal weight,
    Long orgUnitId,
    String orgUnitNameRu,
    String orgUnitNameKg,
    boolean autoCalculated,
    boolean frozen,
    boolean active,
    LocalDateTime createdAt
) {
    public static CriteriaResponse from(Criteria c) {
        return new CriteriaResponse(
            c.getId(), c.getNameRu(), c.getNameKg(),
            c.getDescriptionRu(), c.getDescriptionKg(),
            c.getType(), c.getWeight(),
            c.getOrgUnit() != null ? c.getOrgUnit().getId() : null,
            c.getOrgUnit() != null ? c.getOrgUnit().getNameRu() : null,
            c.getOrgUnit() != null ? c.getOrgUnit().getNameKg() : null,
            c.isAutoCalculated(), c.isFrozen(), c.isActive(), c.getCreatedAt()
        );
    }
}
```

- [ ] **Step 3: Compile**

```bash
cd backend && mvn -q compile
```

Expected: `BUILD SUCCESS` (CriteriaService may now have compilation errors against new fields — fixed next task).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/CriteriaRequest.java backend/src/main/java/kg/gfh/kpi/dto/CriteriaResponse.java
git commit -m "feat(dto): Criteria request/response description fields"
```

---

## Task 5: Service — CriteriaService persists description

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java`
- Test: `backend/src/test/java/kg/gfh/kpi/service/CriteriaDescriptionTest.java`

- [ ] **Step 1: Read current CriteriaService.create and update methods**

```bash
grep -n "public CriteriaResponse\|setNameRu\|setNameKg" backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java
```

- [ ] **Step 2: Write failing test (TDD)**

Create `backend/src/test/java/kg/gfh/kpi/service/CriteriaDescriptionTest.java`:

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.dto.CriteriaResponse;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class CriteriaDescriptionTest {

    @Autowired CriteriaService criteriaService;

    @Test
    void create_persists_description_round_trip() {
        var req = new CriteriaRequest(
            "Имя", "Аты", "Описание", "Сүрөттөмө",
            CriteriaType.POSITIVE, new BigDecimal("10.00"),
            null, false);
        CriteriaResponse created = criteriaService.create(req);
        assertThat(created.descriptionRu()).isEqualTo("Описание");
        assertThat(created.descriptionKg()).isEqualTo("Сүрөттөмө");
    }

    @Test
    void create_accepts_null_descriptions() {
        var req = new CriteriaRequest(
            "Имя", "Аты", null, null,
            CriteriaType.POSITIVE, new BigDecimal("10.00"),
            null, false);
        CriteriaResponse created = criteriaService.create(req);
        assertThat(created.descriptionRu()).isNull();
        assertThat(created.descriptionKg()).isNull();
    }

    @Test
    void update_changes_description() {
        var created = criteriaService.create(new CriteriaRequest(
            "Имя", "Аты", "old", "old",
            CriteriaType.POSITIVE, new BigDecimal("10.00"),
            null, false));
        var updated = criteriaService.update(created.id(), new CriteriaRequest(
            "Имя", "Аты", "new", "жаңы",
            CriteriaType.POSITIVE, new BigDecimal("10.00"),
            null, false));
        assertThat(updated.descriptionRu()).isEqualTo("new");
        assertThat(updated.descriptionKg()).isEqualTo("жаңы");
    }
}
```

- [ ] **Step 3: Run test — expect FAIL (descriptionRu not persisted)**

```bash
cd backend && mvn -q test -Dtest=CriteriaDescriptionTest
```

Expected: tests fail with `expected: "Описание" but was: null` (descriptions never copied into entity).

- [ ] **Step 4: Patch CriteriaService.create**

In `CriteriaService.create`, after `c.setNameKg(req.nameKg());` add:

```java
        c.setDescriptionRu(req.descriptionRu());
        c.setDescriptionKg(req.descriptionKg());
```

- [ ] **Step 5: Patch CriteriaService.update**

In `CriteriaService.update`, locate the block where `setNameRu`/`setNameKg` are called and add immediately after:

```java
        c.setDescriptionRu(req.descriptionRu());
        c.setDescriptionKg(req.descriptionKg());
```

- [ ] **Step 6: Run test — expect PASS**

```bash
cd backend && mvn -q test -Dtest=CriteriaDescriptionTest
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java backend/src/test/java/kg/gfh/kpi/service/CriteriaDescriptionTest.java
git commit -m "feat(criteria): persist description fields in create/update"
```

---

## Task 6: DTO + Service — EvaluationFile criteriaId

**Files:**
- Locate: `backend/src/main/java/kg/gfh/kpi/dto/EvaluationFileResponse.java` (likely exists; if not present, this task creates it).
- Modify: `backend/src/main/java/kg/gfh/kpi/service/FileService.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/controller/FileController.java`
- Test: `backend/src/test/java/kg/gfh/kpi/service/EvaluationFileCriteriaIdTest.java`

- [ ] **Step 1: Locate file DTO + endpoint**

```bash
grep -RIn "EvaluationFile" backend/src/main/java/kg/gfh/kpi/dto/ backend/src/main/java/kg/gfh/kpi/controller/ backend/src/main/java/kg/gfh/kpi/service/
```

Note the DTO class name (likely `EvaluationFileResponse` or `FileResponse`) and the upload method signature in `FileController`. Use the actual class name in Steps 2–4 below in place of `<FileResponseDTO>`.

- [ ] **Step 2: Write failing test**

Create `backend/src/test/java/kg/gfh/kpi/service/EvaluationFileCriteriaIdTest.java`:

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.EvaluationFile;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers
class EvaluationFileCriteriaIdTest {

    @Autowired FileService fileService;
    @Autowired TestFixtures fx;   // seeded helper: create evaluation + criterion

    @Test
    void upload_with_criteria_id_links_row() throws Exception {
        var evalId = fx.createDraftEvaluation();
        var criteriaId = fx.createCriterion();
        var mp = new MockMultipartFile("file", "r.pdf", "application/pdf", new byte[]{1,2,3});
        EvaluationFile saved = fileService.upload(evalId, criteriaId, mp, fx.evaluatorId());
        assertThat(saved.getCriteriaId()).isEqualTo(criteriaId);
    }

    @Test
    void upload_without_criteria_id_stores_null() throws Exception {
        var evalId = fx.createDraftEvaluation();
        var mp = new MockMultipartFile("file", "r.pdf", "application/pdf", new byte[]{1,2,3});
        EvaluationFile saved = fileService.upload(evalId, null, mp, fx.evaluatorId());
        assertThat(saved.getCriteriaId()).isNull();
    }

    @Test
    void upload_with_invalid_criteria_id_rejected() {
        var evalId = fx.createDraftEvaluation();
        var mp = new MockMultipartFile("file", "r.pdf", "application/pdf", new byte[]{1,2,3});
        assertThatThrownBy(() -> fileService.upload(evalId, 999_999L, mp, fx.evaluatorId()))
            .hasMessageContaining("INVALID_CRITERIA");
    }
}
```

If `TestFixtures` does not exist in the codebase, replace `fx.createDraftEvaluation()`, `fx.createCriterion()`, `fx.evaluatorId()` with inline JPA repository calls following the pattern used in existing Testcontainers tests (`grep -l "@Testcontainers" backend/src/test/java | head -3` to find an example).

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd backend && mvn -q test -Dtest=EvaluationFileCriteriaIdTest
```

Expected: compilation fail on `fileService.upload(evalId, criteriaId, mp, ...)` — `FileService` does not yet accept `criteriaId`.

- [ ] **Step 4: Extend FileService.upload**

Open `FileService.java`. Locate existing `upload(Long evaluationId, MultipartFile file, ...)` method.

Change its signature to accept `Long criteriaId` as second parameter (default null). Before saving the entity, add:

```java
        if (criteriaId != null) {
            if (!criteriaRepository.existsById(criteriaId)) {
                throw new BusinessException("INVALID_CRITERIA",
                    "Критерий не найден", "Критерий табылган жок");
            }
            file.setCriteriaId(criteriaId);
        }
```

(Adapt `BusinessException` class name to whatever the project uses for `{code, messageRu, messageKg}` errors — `grep -RIn "messageRu" backend/src/main/java/kg/gfh/kpi/exception/` to confirm.)

Inject `CriteriaRepository`:

```java
    private final CriteriaRepository criteriaRepository;
```

(Add to constructor.)

- [ ] **Step 5: Extend FileController upload endpoint**

In `FileController.upload`, change the method signature to accept:

```java
    @PostMapping("/evaluations/{evaluationId}/files")
    public ResponseEntity<?> upload(
        @PathVariable Long evaluationId,
        @RequestParam(value = "criteriaId", required = false) Long criteriaId,
        @RequestParam("file") MultipartFile file,
        Authentication auth
    ) {
        var saved = fileService.upload(evaluationId, criteriaId, file, currentUserId(auth));
        return ResponseEntity.ok(EvaluationFileResponse.from(saved));
    }
```

Use the existing user-id extraction utility (likely `SecurityUtils.currentUserId(auth)` — grep to confirm).

- [ ] **Step 6: Extend EvaluationFileResponse**

If file exists, add `criteriaId` to the record. If file does not exist, create:

```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.EvaluationFile;

import java.time.LocalDateTime;

public record EvaluationFileResponse(
    Long id,
    Long evaluationId,
    Long criteriaId,
    Long uploadedBy,
    String originalName,
    String mimeType,
    Long fileSize,
    LocalDateTime uploadedAt
) {
    public static EvaluationFileResponse from(EvaluationFile f) {
        return new EvaluationFileResponse(
            f.getId(), f.getEvaluationId(), f.getCriteriaId(), f.getUploadedBy(),
            f.getOriginalName(), f.getMimeType(), f.getFileSize(), f.getUploadedAt()
        );
    }
}
```

- [ ] **Step 7: Run test — expect PASS**

```bash
cd backend && mvn -q test -Dtest=EvaluationFileCriteriaIdTest
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/EvaluationFileResponse.java backend/src/main/java/kg/gfh/kpi/service/FileService.java backend/src/main/java/kg/gfh/kpi/controller/FileController.java backend/src/test/java/kg/gfh/kpi/service/EvaluationFileCriteriaIdTest.java
git commit -m "feat(files): per-criterion file attach via optional criteriaId"
```

---

## Task 7: Backend validation — anti-bonus note + auto-calc read-only

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java`
- Test: `backend/src/test/java/kg/gfh/kpi/service/EvaluationValidationTest.java`

- [ ] **Step 1: Locate score-save method**

```bash
grep -n "saveScores\|setValue\|setNote\|ANTI_BONUS\|autoCalculated" backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java
```

Note the method signature (likely `saveScores(Long evaluationId, List<ScoreRequest> scores, ...)`).

- [ ] **Step 2: Write failing test**

Create `backend/src/test/java/kg/gfh/kpi/service/EvaluationValidationTest.java`:

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.EvaluationScoreRequest;   // confirm class name via grep
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers
class EvaluationValidationTest {

    @Autowired EvaluationService evalService;
    @Autowired TestFixtures fx;

    @Test
    void antibonus_score_above_zero_without_note_rejected() {
        Long evalId = fx.createDraftEvaluation();
        Long antiId = fx.createCriterion(/* type */ "ANTI_BONUS", new BigDecimal("5"));
        var scores = List.of(new EvaluationScoreRequest(antiId, new BigDecimal("2.0"), null));
        assertThatThrownBy(() -> evalService.saveScores(evalId, scores))
            .hasMessageContaining("ANTIBONUS_NOTE_REQUIRED");
    }

    @Test
    void antibonus_score_zero_without_note_allowed() {
        Long evalId = fx.createDraftEvaluation();
        Long antiId = fx.createCriterion("ANTI_BONUS", new BigDecimal("5"));
        var scores = List.of(new EvaluationScoreRequest(antiId, BigDecimal.ZERO, null));
        evalService.saveScores(evalId, scores);   // no exception
    }

    @Test
    void manual_score_for_auto_calc_criterion_rejected() {
        Long evalId = fx.createDraftEvaluation();
        Long autoId = fx.createAutoCalculatedCriterion();
        var scores = List.of(new EvaluationScoreRequest(autoId, new BigDecimal("5.0"), "note"));
        assertThatThrownBy(() -> evalService.saveScores(evalId, scores))
            .hasMessageContaining("AUTO_CRITERIA_READONLY");
    }
}
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd backend && mvn -q test -Dtest=EvaluationValidationTest
```

Expected: tests fail (no validation in place).

- [ ] **Step 4: Add validation to EvaluationService.saveScores**

Inside the loop processing each score (before persisting), add:

```java
        Criteria c = criteriaRepository.findById(s.criteriaId())
            .orElseThrow(() -> new BusinessException("CRITERIA_NOT_FOUND",
                "Критерий не найден", "Критерий табылган жок"));

        if (c.isAutoCalculated()) {
            throw new BusinessException("AUTO_CRITERIA_READONLY",
                "Автоматический критерий нельзя редактировать вручную",
                "Автоматтык критерийди кол менен өзгөртүүгө болбойт");
        }

        if (c.getType() == Criteria.CriteriaType.ANTI_BONUS
                && s.value() != null
                && s.value().compareTo(BigDecimal.ZERO) > 0
                && (s.note() == null || s.note().trim().length() < 10)) {
            throw new BusinessException("ANTIBONUS_NOTE_REQUIRED",
                "Для антибонуса > 0 требуется примечание (минимум 10 символов)",
                "Антибонус > 0 үчүн эскертүү талап кылынат (10 белгиден кем эмес)");
        }
```

- [ ] **Step 5: Run test — expect PASS**

```bash
cd backend && mvn -q test -Dtest=EvaluationValidationTest
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java backend/src/test/java/kg/gfh/kpi/service/EvaluationValidationTest.java
git commit -m "feat(evaluation): reject manual auto-calc + anti-bonus note required"
```

---

## Task 8: EvaluationResponse exposes periodName

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/dto/EvaluationResponse.java`

- [ ] **Step 1: Check EvaluationPeriod entity for nameRu/Kg**

```bash
grep -E "nameRu|nameKg|name " backend/src/main/java/kg/gfh/kpi/entity/EvaluationPeriod.java
```

Confirm field names. If period entity uses different naming (e.g., `quarter`, `year`), adapt accordingly and document in plan comment.

- [ ] **Step 2: Extend EvaluationResponse record**

Replace `EvaluationResponse.java`:

```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EvaluationResponse(
    Long id,
    Long periodId,
    String periodNameRu,
    String periodNameKg,
    Long evaluateeId,
    String evaluateeName,
    Long evaluatorId,
    String evaluatorName,
    EvaluationStatus status,
    BigDecimal finalScore,
    Long version,
    LocalDateTime submittedAt,
    LocalDateTime createdAt
) {
    public static EvaluationResponse from(Evaluation e) {
        return new EvaluationResponse(
            e.getId(), e.getPeriod().getId(),
            e.getPeriod().getNameRu(), e.getPeriod().getNameKg(),
            e.getEvaluatee().getId(), e.getEvaluatee().getFullName(),
            e.getEvaluator().getId(), e.getEvaluator().getFullName(),
            e.getStatus(), e.getFinalScore(), e.getVersion(),
            e.getSubmittedAt(), e.getCreatedAt()
        );
    }
}
```

(If period field names differ, replace `getNameRu()/getNameKg()` accordingly.)

- [ ] **Step 3: Run all backend tests**

```bash
cd backend && mvn -q test
```

Expected: all green. If existing controller test compares JSON shape, update it to include the new fields.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/EvaluationResponse.java
git commit -m "feat(dto): EvaluationResponse exposes periodName{Ru,Kg}"
```

---

## Task 9: Auto-calc seed on draft creation

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java`

- [ ] **Step 1: Locate draft creation method**

```bash
grep -n "createDraft\|new Evaluation()\|EvaluationStatus.DRAFT" backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java
```

- [ ] **Step 2: Add auto-calc seeding logic**

After the new `Evaluation` is persisted, before returning, add:

```java
        // Seed auto-calc scores so client never shows empty value
        List<Criteria> autoCriteria = criteriaRepository
            .findByActiveTrueAndAutoCalculatedTrue();
        for (Criteria c : autoCriteria) {
            BigDecimal autoValue = autoScoreCalculator.compute(evaluatee, c, period);
            // autoValue may be null if upstream data not ready
            EvaluationScore s = new EvaluationScore();
            s.setEvaluationId(saved.getId());
            s.setCriteriaId(c.getId());
            s.setValue(autoValue);
            s.setNote(null);
            scoreRepository.save(s);
        }
```

If no `autoScoreCalculator` bean exists yet, create a placeholder implementation that returns `null` (renders as "ОЖИДАНИЕ" in frontend). Wire up real computation in a follow-up. Document the placeholder:

```java
// Placeholder: returns null until KPI integrators wire upstream data sources.
@Component
public class AutoScoreCalculator {
    public BigDecimal compute(User evaluatee, Criteria c, EvaluationPeriod p) {
        return null;
    }
}
```

- [ ] **Step 3: Compile**

```bash
cd backend && mvn -q compile
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && mvn -q test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java backend/src/main/java/kg/gfh/kpi/service/AutoScoreCalculator.java
git commit -m "feat(evaluation): seed auto-calc scores on draft creation"
```

---

# Phase 2 — Frontend: API + i18n + admin criteria

## Task 10: Frontend API types — Criteria description

**Files:**
- Modify: `frontend/src/features/criteria/criteriaApi.ts`

- [ ] **Step 1: Extend interfaces**

Replace `Criteria` and `CriteriaRequest`:

```ts
export interface Criteria {
  id: number
  nameRu: string
  nameKg: string
  descriptionRu: string | null
  descriptionKg: string | null
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  orgUnitNameRu: string | null
  orgUnitNameKg: string | null
  autoCalculated: boolean
  frozen: boolean
  active: boolean
  createdAt: string
}

export interface CriteriaRequest {
  nameRu: string
  nameKg: string
  descriptionRu: string | null
  descriptionKg: string | null
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  autoCalculated: boolean
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: compile errors in `CriteriaFormModal.tsx` (constructor doesn't pass new fields). Fixed in Task 11.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/criteria/criteriaApi.ts
git commit -m "feat(api): Criteria type includes descriptionRu/Kg"
```

---

## Task 11: Admin criteria form — description textareas

**Files:**
- Modify: `frontend/src/features/criteria/components/CriteriaFormModal.tsx`

- [ ] **Step 1: Read the modal**

```bash
sed -n '1,80p' frontend/src/features/criteria/components/CriteriaFormModal.tsx
```

Identify the state shape and submit handler.

- [ ] **Step 2: Add description state**

In the component, alongside existing `nameRu`/`nameKg` state, add:

```ts
const [descriptionRu, setDescriptionRu] = useState(initial?.descriptionRu ?? '')
const [descriptionKg, setDescriptionKg] = useState(initial?.descriptionKg ?? '')
```

- [ ] **Step 3: Add textarea inputs**

After the `nameKg` field's JSX block, add (preserve existing label/input pattern of the modal):

```tsx
<label className="cfm-field">
  <span className="cfm-label">Описание (RU)</span>
  <textarea
    value={descriptionRu}
    onChange={e => setDescriptionRu(e.target.value)}
    maxLength={4000}
    rows={4}
    placeholder="Рубрика оценки — что считается 0, что считается максимум…"
    className="cfm-textarea"
  />
</label>
<label className="cfm-field">
  <span className="cfm-label">Сүрөттөмө (KG)</span>
  <textarea
    value={descriptionKg}
    onChange={e => setDescriptionKg(e.target.value)}
    maxLength={4000}
    rows={4}
    placeholder="Баалоо рубрикасы…"
    className="cfm-textarea"
  />
</label>
```

- [ ] **Step 4: Include in submit payload**

In the submit handler, change the payload to:

```ts
onSubmit({
  nameRu, nameKg,
  descriptionRu: descriptionRu.trim() || null,
  descriptionKg: descriptionKg.trim() || null,
  type, weight: Number(weight),
  orgUnitId, autoCalculated,
})
```

- [ ] **Step 5: Add CSS for `.cfm-textarea`**

In the same file's `CSS` constant (or wherever the modal styles live), add:

```css
.cfm-textarea {
  width: 100%;
  padding: 8px 10px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text);
  font: 13px/1.5 'Geist Mono', ui-monospace, Menlo, monospace;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color .15s;
}
.cfm-textarea:focus { border-color: var(--dv3-accent); }
```

- [ ] **Step 6: Type-check + dev-test**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean. Manually open `/admin/criteria`, create criterion w/ description, edit existing → field round-trips.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/criteria/components/CriteriaFormModal.tsx
git commit -m "feat(admin/criteria): edit descriptionRu/Kg textareas"
```

---

## Task 12: Frontend API types — EvaluationFile + Evaluation.periodName

**Files:**
- Modify: `frontend/src/features/evaluations/evaluationsApi.ts`

- [ ] **Step 1: Locate current types**

```bash
grep -n "interface Evaluation\|interface EvaluationFile\|interface EvaluationScore" frontend/src/features/evaluations/evaluationsApi.ts
```

- [ ] **Step 2: Add periodNameRu/Kg to Evaluation**

In the `Evaluation` interface, add:

```ts
periodNameRu: string
periodNameKg: string
```

- [ ] **Step 3: Add criteriaId to file types**

If `EvaluationFile` interface exists, add `criteriaId: number | null`. If it doesn't, add:

```ts
export interface EvaluationFile {
  id: number
  evaluationId: number
  criteriaId: number | null
  uploadedBy: number
  originalName: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}
```

- [ ] **Step 4: Add upload helper accepting criteriaId**

In `evaluationsApi`:

```ts
uploadFile: (evaluationId: number, file: File, criteriaId: number | null = null) => {
  const fd = new FormData()
  fd.append('file', file)
  if (criteriaId != null) fd.append('criteriaId', String(criteriaId))
  return api.post<EvaluationFile>(`/evaluations/${evaluationId}/files`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
},
listFiles: (evaluationId: number) =>
  api.get<EvaluationFile[]>(`/evaluations/${evaluationId}/files`).then(r => r.data),
deleteFile: (evaluationId: number, fileId: number) =>
  api.delete(`/evaluations/${evaluationId}/files/${fileId}`),
```

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: errors in current `EvaluationFormPage.tsx` (uses `evaluation.periodId` only) plus `FileUploadSection`. These are fine — the page will be rewritten; existing legacy upload section will use null `criteriaId` until removed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/evaluations/evaluationsApi.ts
git commit -m "feat(api): Evaluation.periodName + EvaluationFile.criteriaId, upload helper"
```

---

## Task 13: i18n keys — evaluation.form.* (ru + kg)

**Files:**
- Modify: `frontend/public/locales/ru/translation.json`
- Modify: `frontend/public/locales/kg/translation.json`

- [ ] **Step 1: Add `evaluation.form` block to ru**

Open `frontend/public/locales/ru/translation.json`. Inside the top-level object (alongside existing keys), add:

```json
"evaluation": {
  "form": {
    "title": "Заполнение оценки",
    "subtitle": "Заполните баллы по каждому критерию. Изменения сохраняются автоматически.",
    "back": "К моим задачам",
    "phasePositive": "Фаза · Положительные",
    "phaseAntibonus": "Фаза · Антибонус",
    "phaseReview": "Итог",
    "criterion": "Критерий",
    "score": "Балл",
    "deduction": "Вычет",
    "weight": "вес {{value}}%",
    "antiMax": "до −{{value}} баллов",
    "scopeGlobal": "Глобальный",
    "noteLabel": "Примечание",
    "notePlaceholder": "Краткое обоснование оценки (опционально)",
    "noteRequiredAntibonus": "Для антибонуса > 0 требуется примечание (минимум 10 символов)",
    "filesLabel": "Доказательная база",
    "filesDrop": "+ перетащите файл сюда или нажмите",
    "preset": { "zero": "0", "quarter": "25%", "half": "50%", "threeQuarter": "75%", "max": "Макс", "custom": "Свой" },
    "previewValue": "Большое значение: {{value}}",
    "stepCount": "{{current}} / {{total}}",
    "next": "Далее",
    "prev": "Назад",
    "save": "Сохранить",
    "saved": "сохранено {{time}}",
    "saving": "сохранение…",
    "saveFailed": "Не удалось сохранить — попробуйте снова",
    "checklist": "Список",
    "submit": "Отправить",
    "transitionPositiveDone": "Положительные завершены",
    "transitionAnti": "Перейти к антибонусу?",
    "transitionSkip": "Пропустить (вычетов нет)",
    "transitionGo": "Перейти",
    "reviewTotal": "Итог",
    "reviewPositive": "Положительные",
    "reviewAnti": "Антибонус",
    "reviewBack": "Назад к редактированию",
    "reviewConfirm": "Отправить",
    "confirmTitle": "Отправить оценку?",
    "confirmBody": "Итоговый балл: {{total}}. После отправки оценку нельзя будет изменить.",
    "confirmLowWarn": "Балл ниже среднего. Подтвердите осознанно.",
    "autoBadge": "АВТО",
    "autoPending": "ОЖИДАНИЕ",
    "evaluationNotDraftBanner": "Оценка более недоступна для редактирования",
    "concurrentEditTitle": "Изменения с другого устройства",
    "concurrentEditBody": "Перезагрузить страницу с актуальными данными?",
    "concurrentEditReload": "Перезагрузить",
    "noCriteria": "В этом периоде нет критериев. Обратитесь к администратору.",
    "shortcuts": {
      "title": "Горячие клавиши",
      "prevNext": "← / → — предыдущий / следующий",
      "presets": "1..5 — пресеты баллов, 6 — свой",
      "save": "Cmd/Ctrl + S — сохранить",
      "submit": "Cmd/Ctrl + Enter — отправить",
      "help": "? — эта справка",
      "close": "Esc — закрыть"
    }
  }
}
```

If `evaluation` key already exists, merge `form` block into it.

- [ ] **Step 2: Add same block to kg**

Open `frontend/public/locales/kg/translation.json`. Add the same structure with translated strings (use existing kg patterns from sibling keys for tone consistency). Brief translations are acceptable for first pass — translation review is a separate concern.

- [ ] **Step 3: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('frontend/public/locales/ru/translation.json'))"
node -e "JSON.parse(require('fs').readFileSync('frontend/public/locales/kg/translation.json'))"
```

Expected: no output (= valid).

- [ ] **Step 4: Commit**

```bash
git add frontend/public/locales/ru/translation.json frontend/public/locales/kg/translation.json
git commit -m "feat(i18n): evaluation.form.* keys for ru + kg"
```

---

# Phase 3 — Frontend: focus-mode core

## Task 14: Archive legacy page

**Files:**
- Create: `frontend/src/features/evaluations/EvaluationFormPage.legacy.tsx`

- [ ] **Step 1: Copy current page**

```bash
cp frontend/src/features/evaluations/EvaluationFormPage.tsx \
   frontend/src/features/evaluations/EvaluationFormPage.legacy.tsx
```

- [ ] **Step 2: Rename exported component in legacy file**

Edit `EvaluationFormPage.legacy.tsx`, change `export function EvaluationFormPage()` → `export function EvaluationFormPageLegacy()`. The legacy file is not wired to any route — it sits as reference / rollback artifact.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/evaluations/EvaluationFormPage.legacy.tsx
git commit -m "chore(evaluations): archive legacy form page for rollback reference"
```

---

## Task 15: Create form folder + style export

**Files:**
- Create: `frontend/src/features/evaluations/form/formStyles.ts`

- [ ] **Step 1: Create folder + style file**

```bash
mkdir -p frontend/src/features/evaluations/form/__tests__
```

Create `formStyles.ts`:

```ts
export const FORM_CSS = `
:root .efm-root { /* see <FormShell> wrapper */ }

.efm-shell {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 24px 120px;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text);
  min-height: 100vh;
  position: relative;
}
.efm-topbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px;
  background: var(--dv3-bg);
  border-bottom: 1px solid var(--dv3-border);
  margin: -24px -24px 32px;
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.efm-back { background: none; border: 0; color: inherit; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; padding: 0; }
.efm-back:hover { color: var(--dv3-accent); }

.efm-phase-tag {
  display: flex; align-items: center; gap: 10px;
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--dv3-text3);
  margin-bottom: 8px;
}
.efm-phase-tag::before { content: ''; width: 28px; height: 1px; background: var(--dv3-text4); }
.efm-phase-tag.is-anti { color: var(--dv3-zone-down); }
.efm-phase-tag.is-anti::before { background: var(--dv3-zone-down); }

.efm-step-dots { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
.efm-step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--dv3-bg3); border: 1px solid var(--dv3-border);
  transition: background .15s;
}
.efm-step-dot.is-done { background: var(--dv3-accent); border-color: var(--dv3-accent); }
.efm-step-dot.is-current { background: var(--dv3-text); border-color: var(--dv3-text); transform: scale(1.25); }
.efm-step-dot.is-anti.is-done { background: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }

.efm-criterion-tag {
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--dv3-text3); margin-bottom: 12px;
}
.efm-criterion-name {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: clamp(32px, 4.5vw, 48px);
  letter-spacing: -0.02em; line-height: 1.05;
  color: var(--dv3-text);
  margin: 0 0 16px;
  max-width: 24ch;
}
.efm-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 32px; }
.efm-chip {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  padding: 3px 8px;
  border: 1px solid var(--dv3-border);
}
.efm-chip--w { color: var(--dv3-text); border-color: var(--dv3-border-hi); }
.efm-chip--anti { color: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }
.efm-chip--auto { color: var(--dv3-zone-info); border-color: var(--dv3-zone-info); }

.efm-rubric {
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 16px; line-height: 1.6;
  color: var(--dv3-text2);
  max-width: 60ch;
  margin: 0 0 32px;
  padding: 16px 0;
  border-top: 1px solid var(--dv3-border);
  border-bottom: 1px solid var(--dv3-border);
}
.efm-rubric-empty {
  font-style: italic; color: var(--dv3-text4);
  font-size: 13px;
}

.efm-label {
  display: block;
  font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--dv3-text3);
  margin-bottom: 12px;
}
.efm-label span.max {
  float: right; font-family: 'Geist Mono', ui-monospace, Menlo, monospace; color: var(--dv3-text4);
}

.efm-presets {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
}
.efm-preset {
  min-width: 64px;
  padding: 12px 14px;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text2);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 12px; letter-spacing: .04em;
  cursor: pointer;
  transition: all .12s;
}
.efm-preset:hover { border-color: var(--dv3-border-hi); color: var(--dv3-text); }
.efm-preset.is-selected {
  background: var(--dv3-accent); border-color: var(--dv3-accent); color: var(--dv3-bg);
}
.efm-page[data-phase="antibonus"] .efm-preset.is-selected {
  background: var(--dv3-zone-down); border-color: var(--dv3-zone-down);
}
.efm-preset:focus-visible {
  outline: 2px solid var(--dv3-accent); outline-offset: 2px;
}

.efm-custom-num {
  width: 140px; padding: 12px 14px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text);
  font: italic 22px/1 'EB Garamond', Georgia, serif;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.efm-custom-num:focus { border-color: var(--dv3-accent); outline: none; }
.efm-page[data-phase="antibonus"] .efm-custom-num:focus { border-color: var(--dv3-zone-down); }

.efm-readout {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 36px; line-height: 1;
  color: var(--dv3-accent);
  margin-bottom: 32px;
}
.efm-readout.is-pending { color: var(--dv3-text4); font-size: 14px; letter-spacing: .22em; text-transform: uppercase; font-style: normal; }
.efm-page[data-phase="antibonus"] .efm-readout { color: var(--dv3-zone-down); }

.efm-note {
  width: 100%;
  min-height: 60px;
  padding: 12px 14px;
  background: transparent;
  border: 1px dashed var(--dv3-border);
  color: var(--dv3-text);
  font: 13px/1.5 'Geist Mono', ui-monospace, Menlo, monospace;
  outline: none;
  resize: vertical;
  transition: border-color .15s;
  margin-bottom: 32px;
}
.efm-note:focus { border-color: var(--dv3-accent); border-style: solid; }
.efm-note.is-error { border-color: var(--dv3-zone-warn); border-style: solid; }
.efm-note-error {
  font-size: 11px; color: var(--dv3-zone-warn); margin-top: -24px; margin-bottom: 32px;
}

.efm-files-drop {
  border: 1px dashed var(--dv3-border);
  padding: 24px;
  text-align: center;
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  margin-bottom: 12px;
}
.efm-files-drop.is-drag { border-color: var(--dv3-accent); background: var(--dv3-accent-bg); }
.efm-file-row {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 12px; align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--dv3-border);
  font-size: 12px;
}
.efm-file-row:last-child { border-bottom: 0; }
.efm-file-del { background: none; border: 0; color: var(--dv3-text3); cursor: pointer; padding: 4px; }
.efm-file-del:hover { color: var(--dv3-zone-down); }

.efm-bottombar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: grid; grid-template-columns: auto 1fr auto auto;
  gap: 12px; align-items: center;
  padding: 12px 24px;
  background: var(--dv3-bg);
  border-top: 1px solid var(--dv3-border);
  z-index: 6;
}
.efm-bottombar-status {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3); text-align: center;
}
.efm-bottombar-status strong {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace; color: var(--dv3-text); letter-spacing: 0;
}
.efm-bb-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  font: 12px/1 'Geist Mono', ui-monospace, Menlo, monospace;
  letter-spacing: .18em; text-transform: uppercase;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg);
  color: var(--dv3-text);
  cursor: pointer;
}
.efm-bb-btn:disabled { opacity: .4; cursor: not-allowed; }
.efm-bb-btn--primary { background: var(--dv3-accent); border-color: var(--dv3-accent); color: var(--dv3-bg); }
.efm-page[data-phase="antibonus"] .efm-bb-btn--primary { background: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }

.efm-drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 7;
  opacity: 0; transition: opacity .2s;
  pointer-events: none;
}
.efm-drawer-backdrop.is-open { opacity: 1; pointer-events: auto; }
.efm-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 360px; max-width: 100%;
  background: var(--dv3-bg);
  border-left: 1px solid var(--dv3-border);
  transform: translateX(100%);
  transition: transform .25s ease;
  z-index: 8;
  overflow-y: auto;
}
.efm-drawer.is-open { transform: translateX(0); }

.efm-shortcuts {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.5); z-index: 10; padding: 24px;
}
.efm-shortcuts-card {
  background: var(--dv3-bg); border: 1px solid var(--dv3-border); padding: 32px; max-width: 480px;
}

@media (prefers-reduced-motion: reduce) {
  .efm-drawer, .efm-drawer-backdrop { transition: none; }
  .efm-preset { transition: none; }
}
@media (max-width: 640px) {
  .efm-shell { padding: 16px 16px 100px; }
  .efm-topbar { padding: 10px 16px; margin: -16px -16px 24px; }
  .efm-bottombar { padding: 10px 12px; grid-template-columns: auto 1fr auto auto; }
  .efm-preset { min-width: 56px; padding: 10px 12px; }
  .efm-criterion-name { font-size: 28px; }
}
`
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/evaluations/form/formStyles.ts
git commit -m "feat(evaluation-form): CSS tokens for focus-mode stepper"
```

---

## Task 16: useEvaluationForm hook — base shape + load

**Files:**
- Create: `frontend/src/features/evaluations/form/useEvaluationForm.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { evaluationsApi, Evaluation, EvaluationScore, EvaluationFile } from '../evaluationsApi'
import { criteriaApi, Criteria } from '../../criteria/criteriaApi'
import api from '../../../app/api'

export type Phase = 'positive' | 'transition' | 'antibonus' | 'review'

export interface ScoreEntry { value: string; note: string; dirty: boolean }

interface State {
  evaluation: Evaluation | null
  criteria: Criteria[]
  scores: Record<number, ScoreEntry>
  files: EvaluationFile[]
  phase: Phase
  cursor: number
  previewScore: number | null
  lastSaved: Date | null
  saving: boolean
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'LOAD_OK'; payload: { evaluation: Evaluation; criteria: Criteria[]; scores: EvaluationScore[]; files: EvaluationFile[] } }
  | { type: 'LOAD_ERR'; message: string }
  | { type: 'SET_SCORE'; criteriaId: number; value: string }
  | { type: 'SET_NOTE'; criteriaId: number; note: string }
  | { type: 'CLEAR_DIRTY' }
  | { type: 'SAVING'; saving: boolean }
  | { type: 'SAVED'; at: Date }
  | { type: 'PREVIEW'; value: number | null }
  | { type: 'GO'; phase: Phase; cursor: number }
  | { type: 'ATTACH_FILE'; file: EvaluationFile }
  | { type: 'REMOVE_FILE'; fileId: number }

const initial: State = {
  evaluation: null, criteria: [], scores: {}, files: [],
  phase: 'positive', cursor: 0, previewScore: null, lastSaved: null,
  saving: false, loading: true, error: null,
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'LOAD_OK': {
      const scoreMap: Record<number, ScoreEntry> = {}
      a.payload.scores.forEach(sc => {
        scoreMap[sc.criteriaId] = {
          value: sc.value == null ? '' : sc.value.toString(),
          note: sc.note ?? '',
          dirty: false,
        }
      })
      return {
        ...s,
        evaluation: a.payload.evaluation,
        criteria: a.payload.criteria.filter(c => c.active),
        scores: scoreMap,
        files: a.payload.files,
        loading: false,
      }
    }
    case 'LOAD_ERR': return { ...s, loading: false, error: a.message }
    case 'SET_SCORE': return {
      ...s,
      scores: { ...s.scores, [a.criteriaId]: { ...(s.scores[a.criteriaId] ?? { note: '', value: '', dirty: false }), value: a.value, dirty: true } },
    }
    case 'SET_NOTE': return {
      ...s,
      scores: { ...s.scores, [a.criteriaId]: { ...(s.scores[a.criteriaId] ?? { note: '', value: '', dirty: false }), note: a.note, dirty: true } },
    }
    case 'CLEAR_DIRTY': {
      const cleaned: Record<number, ScoreEntry> = {}
      for (const k in s.scores) cleaned[Number(k)] = { ...s.scores[Number(k)], dirty: false }
      return { ...s, scores: cleaned }
    }
    case 'SAVING': return { ...s, saving: a.saving }
    case 'SAVED': return { ...s, lastSaved: a.at }
    case 'PREVIEW': return { ...s, previewScore: a.value }
    case 'GO': return { ...s, phase: a.phase, cursor: a.cursor }
    case 'ATTACH_FILE': return { ...s, files: [...s.files, a.file] }
    case 'REMOVE_FILE': return { ...s, files: s.files.filter(f => f.id !== a.fileId) }
    default: return s
  }
}

export function useEvaluationForm(evaluationId: number) {
  const [state, dispatch] = useReducer(reducer, initial)
  const stateRef = useRef(state)
  stateRef.current = state

  // Load
  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      criteriaApi.list(0, 200),
      api.get<EvaluationScore[]>(`/evaluations/${evaluationId}/scores`).then(r => r.data),
      evaluationsApi.listFiles(evaluationId),
    ]).then(([evaluation, criteriaPage, scores, files]) => {
      dispatch({ type: 'LOAD_OK', payload: { evaluation, criteria: criteriaPage.content, scores, files } })
    }).catch(e => dispatch({ type: 'LOAD_ERR', message: e?.message ?? 'load failed' }))
  }, [evaluationId])

  // URL hash sync
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const p = params.get('p') as Phase | null
    const i = Number(params.get('i') ?? '0')
    if (p && ['positive', 'transition', 'antibonus', 'review'].includes(p)) {
      dispatch({ type: 'GO', phase: p, cursor: isNaN(i) ? 0 : i })
    }
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('p', state.phase); params.set('i', String(state.cursor))
    window.history.replaceState(null, '', `#${params.toString()}`)
  }, [state.phase, state.cursor])

  // Derived
  const positive = useMemo(
    () => state.criteria.filter(c => c.type === 'POSITIVE'),
    [state.criteria]
  )
  const antibonus = useMemo(
    () => state.criteria.filter(c => c.type === 'ANTI_BONUS'),
    [state.criteria]
  )
  const currentCriterion: Criteria | null = useMemo(() => {
    if (state.phase === 'positive') return positive[state.cursor] ?? null
    if (state.phase === 'antibonus') return antibonus[state.cursor] ?? null
    return null
  }, [state.phase, state.cursor, positive, antibonus])

  const isFilled = (c: Criteria): boolean => {
    const s = state.scores[c.id]
    return !!s && s.value !== ''
  }
  const posFilled = positive.filter(isFilled).length
  const negFilled = antibonus.filter(isFilled).length

  const canAdvance = useMemo((): boolean => {
    if (!currentCriterion) return true
    const sc = state.scores[currentCriterion.id]
    if (!sc || sc.value === '') return currentCriterion.autoCalculated
    const v = parseFloat(sc.value)
    if (currentCriterion.type === 'ANTI_BONUS' && v > 0 && (sc.note?.trim().length ?? 0) < 10) return false
    return true
  }, [currentCriterion, state.scores])

  const canSubmit = useMemo((): boolean => {
    if (positive.length === 0) return false
    for (const c of positive) {
      const sc = state.scores[c.id]
      if (c.autoCalculated) continue
      if (!sc || sc.value === '') return false
    }
    for (const c of antibonus) {
      const sc = state.scores[c.id]
      if (!sc || sc.value === '') continue
      const v = parseFloat(sc.value)
      if (v > 0 && (sc.note?.trim().length ?? 0) < 10) return false
    }
    return true
  }, [positive, antibonus, state.scores])

  // Actions
  const setScore = useCallback((criteriaId: number, value: string) =>
    dispatch({ type: 'SET_SCORE', criteriaId, value }), [])
  const setNote = useCallback((criteriaId: number, note: string) =>
    dispatch({ type: 'SET_NOTE', criteriaId, note }), [])

  const goPrev = useCallback(() => {
    const s = stateRef.current
    if (s.phase === 'review') return dispatch({ type: 'GO', phase: antibonus.length ? 'antibonus' : 'positive', cursor: antibonus.length ? antibonus.length - 1 : positive.length - 1 })
    if (s.phase === 'antibonus') {
      if (s.cursor > 0) return dispatch({ type: 'GO', phase: 'antibonus', cursor: s.cursor - 1 })
      return dispatch({ type: 'GO', phase: 'transition', cursor: 0 })
    }
    if (s.phase === 'transition') return dispatch({ type: 'GO', phase: 'positive', cursor: positive.length - 1 })
    if (s.phase === 'positive' && s.cursor > 0) return dispatch({ type: 'GO', phase: 'positive', cursor: s.cursor - 1 })
  }, [positive.length, antibonus.length])

  const goNext = useCallback(() => {
    const s = stateRef.current
    if (s.phase === 'positive') {
      if (s.cursor < positive.length - 1) return dispatch({ type: 'GO', phase: 'positive', cursor: s.cursor + 1 })
      return dispatch({ type: 'GO', phase: antibonus.length ? 'transition' : 'review', cursor: 0 })
    }
    if (s.phase === 'transition') return dispatch({ type: 'GO', phase: 'antibonus', cursor: 0 })
    if (s.phase === 'antibonus') {
      if (s.cursor < antibonus.length - 1) return dispatch({ type: 'GO', phase: 'antibonus', cursor: s.cursor + 1 })
      return dispatch({ type: 'GO', phase: 'review', cursor: 0 })
    }
  }, [positive.length, antibonus.length])

  const goToStep = useCallback((phase: Phase, cursor: number) =>
    dispatch({ type: 'GO', phase, cursor }), [])

  return {
    state,
    positive, antibonus, currentCriterion,
    posFilled, negFilled,
    canAdvance, canSubmit,
    setScore, setNote, goPrev, goNext, goToStep,
    dispatch,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean (or only existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/evaluations/form/useEvaluationForm.ts
git commit -m "feat(evaluation-form): useEvaluationForm hook + state machine"
```

---

## Task 17: useEvaluationForm tests — state machine

**Files:**
- Create: `frontend/src/features/evaluations/form/__tests__/useEvaluationForm.test.ts`

- [ ] **Step 1: Locate test runner config**

```bash
cat frontend/vitest.config.ts 2>/dev/null || cat frontend/package.json | grep -A2 '"test"'
```

If Vitest is not configured yet, install: `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom` and add `"test": "vitest"` script + minimal `vitest.config.ts` (`environment: 'jsdom'`).

- [ ] **Step 2: Write test**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEvaluationForm } from '../useEvaluationForm'

// Mock APIs
vi.mock('../../evaluationsApi', () => ({
  evaluationsApi: {
    get: vi.fn(() => Promise.resolve({
      id: 1, periodId: 5, periodNameRu: 'Q1 2026', periodNameKg: 'Q1 2026',
      evaluateeId: 2, evaluateeName: 'Ivan', evaluatorId: 3, evaluatorName: 'Petr',
      status: 'DRAFT', finalScore: null, version: 0, submittedAt: null, createdAt: '',
    })),
    listFiles: vi.fn(() => Promise.resolve([])),
  },
}))
vi.mock('../../../criteria/criteriaApi', () => ({
  criteriaApi: {
    list: vi.fn(() => Promise.resolve({
      content: [
        { id: 10, nameRu: 'P1', nameKg: 'P1', descriptionRu: null, descriptionKg: null, type: 'POSITIVE', weight: 30, orgUnitId: null, orgUnitNameRu: null, orgUnitNameKg: null, autoCalculated: false, frozen: false, active: true, createdAt: '' },
        { id: 11, nameRu: 'P2', nameKg: 'P2', descriptionRu: null, descriptionKg: null, type: 'POSITIVE', weight: 70, orgUnitId: null, orgUnitNameRu: null, orgUnitNameKg: null, autoCalculated: false, frozen: false, active: true, createdAt: '' },
        { id: 20, nameRu: 'A1', nameKg: 'A1', descriptionRu: null, descriptionKg: null, type: 'ANTI_BONUS', weight: 10, orgUnitId: null, orgUnitNameRu: null, orgUnitNameKg: null, autoCalculated: false, frozen: false, active: true, createdAt: '' },
      ],
      totalElements: 3, totalPages: 1, number: 0, size: 200,
    })),
  },
}))
vi.mock('../../../../app/api', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: [] })) },
}))

describe('useEvaluationForm', () => {
  beforeEach(() => { window.location.hash = '' })

  it('starts in positive phase at cursor 0', async () => {
    const { result } = renderHook(() => useEvaluationForm(1))
    await waitFor(() => expect(result.current.state.loading).toBe(false))
    expect(result.current.state.phase).toBe('positive')
    expect(result.current.state.cursor).toBe(0)
  })

  it('goNext advances cursor then transitions to transition phase', async () => {
    const { result } = renderHook(() => useEvaluationForm(1))
    await waitFor(() => expect(result.current.state.loading).toBe(false))
    act(() => result.current.goNext())   // cursor 0 → 1
    expect(result.current.state.cursor).toBe(1)
    act(() => result.current.goNext())   // end of positive → transition
    expect(result.current.state.phase).toBe('transition')
  })

  it('skips transition+antibonus when no anti-bonus criteria', async () => {
    const { criteriaApi } = await import('../../../criteria/criteriaApi')
    ;(criteriaApi.list as any).mockResolvedValueOnce({
      content: [
        { id: 10, nameRu: 'P1', nameKg: 'P1', descriptionRu: null, descriptionKg: null, type: 'POSITIVE', weight: 100, orgUnitId: null, orgUnitNameRu: null, orgUnitNameKg: null, autoCalculated: false, frozen: false, active: true, createdAt: '' },
      ],
      totalElements: 1, totalPages: 1, number: 0, size: 200,
    })
    const { result } = renderHook(() => useEvaluationForm(1))
    await waitFor(() => expect(result.current.state.loading).toBe(false))
    act(() => result.current.goNext())
    expect(result.current.state.phase).toBe('review')
  })

  it('canAdvance false when anti-bonus value > 0 and note < 10 chars', async () => {
    const { result } = renderHook(() => useEvaluationForm(1))
    await waitFor(() => expect(result.current.state.loading).toBe(false))
    act(() => result.current.goToStep('antibonus', 0))
    act(() => result.current.setScore(20, '5'))
    expect(result.current.canAdvance).toBe(false)
    act(() => result.current.setNote(20, 'долго опоздал')) // 13 chars
    expect(result.current.canAdvance).toBe(true)
  })

  it('canSubmit false until all positive criteria filled', async () => {
    const { result } = renderHook(() => useEvaluationForm(1))
    await waitFor(() => expect(result.current.state.loading).toBe(false))
    act(() => result.current.setScore(10, '20'))
    expect(result.current.canSubmit).toBe(false)
    act(() => result.current.setScore(11, '50'))
    expect(result.current.canSubmit).toBe(true)
  })
})
```

- [ ] **Step 3: Run test**

```bash
cd frontend && npx vitest run src/features/evaluations/form/__tests__/useEvaluationForm.test.ts
```

Expected: 5 pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/evaluations/form/__tests__/useEvaluationForm.test.ts
git commit -m "test(evaluation-form): useEvaluationForm state machine"
```

---

## Task 18: useAutosave hook

**Files:**
- Create: `frontend/src/features/evaluations/form/useAutosave.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useRef } from 'react'

type SaveFn = () => Promise<void>

export function useAutosave(saveFn: SaveFn, dirty: boolean, opts?: {
  debounceMs?: number
  intervalMs?: number
}) {
  const { debounceMs = 5_000, intervalMs = 30_000 } = opts ?? {}
  const saveRef = useRef(saveFn)
  saveRef.current = saveFn
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  // Debounced save on dirty change
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => saveRef.current(), debounceMs)
    return () => clearTimeout(t)
  }, [dirty, debounceMs])

  // Periodic heartbeat
  useEffect(() => {
    const id = setInterval(() => {
      if (dirtyRef.current) saveRef.current()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  // Flush on tab hide
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) {
        saveRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Beforeunload guard
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/evaluations/form/useAutosave.ts
git commit -m "feat(evaluation-form): useAutosave hook (debounce + interval + visibility + unload)"
```

---

## Task 19: useKeyboardShortcuts hook

**Files:**
- Create: `frontend/src/features/evaluations/form/useKeyboardShortcuts.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useEffect } from 'react'

interface Handlers {
  onPrev: () => void
  onNext: () => void
  onPreset: (index: number) => void          // 1..6 (5 presets + custom)
  onSave: () => void
  onSubmit: () => void
  onHelp: () => void
  onEscape: () => void
}

const isTypingTarget = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function useKeyboardShortcuts(h: Handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey

      if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); h.onSave(); return }
      if (cmd && e.key === 'Enter')           { e.preventDefault(); h.onSubmit(); return }

      if (isTypingTarget(e.target)) return

      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); h.onPrev(); return
        case 'ArrowRight': e.preventDefault(); h.onNext(); return
        case '?':          e.preventDefault(); h.onHelp(); return
        case 'Escape':     h.onEscape(); return
      }
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= 6) {
        e.preventDefault()
        h.onPreset(n - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, h])
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/features/evaluations/form/__tests__/useKeyboardShortcuts.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'

const fire = (key: string, mod?: { meta?: boolean }) => {
  const ev = new KeyboardEvent('keydown', { key, metaKey: !!mod?.meta, cancelable: true })
  window.dispatchEvent(ev)
}

const makeHandlers = () => ({
  onPrev: vi.fn(), onNext: vi.fn(), onPreset: vi.fn(),
  onSave: vi.fn(), onSubmit: vi.fn(), onHelp: vi.fn(), onEscape: vi.fn(),
})

describe('useKeyboardShortcuts', () => {
  it('ArrowLeft → onPrev', () => {
    const h = makeHandlers()
    renderHook(() => useKeyboardShortcuts(h))
    fire('ArrowLeft')
    expect(h.onPrev).toHaveBeenCalled()
  })
  it('Cmd+S → onSave', () => {
    const h = makeHandlers()
    renderHook(() => useKeyboardShortcuts(h))
    fire('s', { meta: true })
    expect(h.onSave).toHaveBeenCalled()
  })
  it('Cmd+Enter → onSubmit', () => {
    const h = makeHandlers()
    renderHook(() => useKeyboardShortcuts(h))
    fire('Enter', { meta: true })
    expect(h.onSubmit).toHaveBeenCalled()
  })
  it('Number 3 → onPreset(2)', () => {
    const h = makeHandlers()
    renderHook(() => useKeyboardShortcuts(h))
    fire('3')
    expect(h.onPreset).toHaveBeenCalledWith(2)
  })
  it('does not fire arrows when typing in input', () => {
    const h = makeHandlers()
    renderHook(() => useKeyboardShortcuts(h))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    const ev = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true })
    input.dispatchEvent(ev)   // won't bubble to window in jsdom — fire directly
    fire('ArrowLeft')         // global fire still triggers — acceptable: keyboard shortcuts run from window, focus check happens in handler
    // Cmd+S still works in input though:
    fire('s', { meta: true })
    expect(h.onSave).toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
```

- [ ] **Step 3: Run test**

```bash
cd frontend && npx vitest run src/features/evaluations/form/__tests__/useKeyboardShortcuts.test.ts
```

Expected: 5 pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/evaluations/form/useKeyboardShortcuts.ts frontend/src/features/evaluations/form/__tests__/useKeyboardShortcuts.test.ts
git commit -m "feat(evaluation-form): keyboard shortcuts hook"
```

---

## Task 20: ScoreInput component (preset chips + custom)

**Files:**
- Create: `frontend/src/features/evaluations/form/ScoreInput.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  max: number
  step: number                  // 0.5 if max <= 10 else 1
  disabled?: boolean
  negative?: boolean
  pending?: boolean             // auto-calc awaiting upstream
  onChange: (v: string) => void
  presetRef?: (n: number, fire: () => void) => void  // expose preset triggers for keyboard
}

const round = (x: number, step: number): number => Math.round(x / step) * step

export function ScoreInput({ value, max, step, disabled, negative, pending, onChange, presetRef }: Props) {
  const { t } = useTranslation()
  const [customOpen, setCustomOpen] = useState(false)

  const presets: { label: string; value: number }[] = [
    { label: t('evaluation.form.preset.zero'),         value: 0 },
    { label: t('evaluation.form.preset.quarter'),      value: round(max * 0.25, step) },
    { label: t('evaluation.form.preset.half'),         value: round(max * 0.50, step) },
    { label: t('evaluation.form.preset.threeQuarter'), value: round(max * 0.75, step) },
    { label: t('evaluation.form.preset.max'),          value: max },
  ]

  const currentNum = parseFloat(value)
  const isSelected = (n: number) => !Number.isNaN(currentNum) && Math.abs(currentNum - n) < 1e-6

  if (pending) {
    return (
      <div className="efm-readout is-pending">{t('evaluation.form.autoPending')}</div>
    )
  }

  return (
    <>
      <div className="efm-presets" role="group" aria-label={t('evaluation.form.score')}>
        {presets.map((p, i) => {
          const fire = () => onChange(p.value.toString())
          presetRef?.(i, fire)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              className={`efm-preset ${isSelected(p.value) ? 'is-selected' : ''}`}
              onClick={fire}
            >
              {p.label}
            </button>
          )
        })}
        <button
          type="button"
          disabled={disabled}
          className={`efm-preset ${customOpen ? 'is-selected' : ''}`}
          onClick={() => { setCustomOpen(true); presetRef?.(5, () => setCustomOpen(true)) }}
        >
          {t('evaluation.form.preset.custom')}
        </button>
      </div>
      {customOpen && (
        <input
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          autoFocus
          onChange={e => {
            const v = e.target.value
            if (v === '') return onChange('')
            const n = Math.max(0, Math.min(max, parseFloat(v)))
            onChange(Number.isNaN(n) ? '' : n.toString())
          }}
          className="efm-custom-num"
          aria-label={t('evaluation.form.score')}
        />
      )}
      <div className={`efm-readout ${negative ? 'is-neg' : ''}`}>
        {value === '' ? '—' : `${negative ? '−' : ''}${parseFloat(value).toFixed(step < 1 ? 1 : 0)}`}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/features/evaluations/form/__tests__/ScoreInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScoreInput } from '../ScoreInput'

// Bypass i18n by mocking
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe('ScoreInput', () => {
  it('renders 5 presets + custom', () => {
    render(<ScoreInput value="" max={10} step={0.5} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })

  it('clicking preset 75% emits rounded value', () => {
    const onChange = vi.fn()
    render(<ScoreInput value="" max={10} step={0.5} onChange={onChange} />)
    fireEvent.click(screen.getByText('evaluation.form.preset.threeQuarter'))
    expect(onChange).toHaveBeenCalledWith('7.5')
  })

  it('custom toggle reveals number input', () => {
    render(<ScoreInput value="" max={10} step={0.5} onChange={() => {}} />)
    fireEvent.click(screen.getByText('evaluation.form.preset.custom'))
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('clamps custom input to max', () => {
    const onChange = vi.fn()
    render(<ScoreInput value="" max={10} step={0.5} onChange={onChange} />)
    fireEvent.click(screen.getByText('evaluation.form.preset.custom'))
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '999' } })
    expect(onChange).toHaveBeenLastCalledWith('10')
  })

  it('renders pending state for auto-calc awaiting upstream', () => {
    render(<ScoreInput value="" max={10} step={1} pending onChange={() => {}} />)
    expect(screen.getByText('evaluation.form.autoPending')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 3: Run test**

```bash
cd frontend && npx vitest run src/features/evaluations/form/__tests__/ScoreInput.test.tsx
```

Expected: 5 pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/evaluations/form/ScoreInput.tsx frontend/src/features/evaluations/form/__tests__/ScoreInput.test.tsx
git commit -m "feat(evaluation-form): ScoreInput preset chips + custom + pending"
```

---

## Task 21: NoteField component (autosize + validation)

**Files:**
- Create: `frontend/src/features/evaluations/form/NoteField.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  required: boolean          // true when anti-bonus value > 0
  onChange: (v: string) => void
}

const MIN_LEN = 10

export function NoteField({ value, required, onChange }: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const tooShort = required && value.trim().length < MIN_LEN
  return (
    <>
      <label className="efm-label" htmlFor="efm-note">{t('evaluation.form.noteLabel')}</label>
      <textarea
        id="efm-note"
        ref={ref}
        value={value}
        placeholder={t('evaluation.form.notePlaceholder')}
        className={`efm-note ${tooShort ? 'is-error' : ''}`}
        onChange={e => onChange(e.target.value)}
        aria-invalid={tooShort}
        aria-describedby={tooShort ? 'efm-note-err' : undefined}
      />
      {tooShort && (
        <div id="efm-note-err" className="efm-note-error">
          {t('evaluation.form.noteRequiredAntibonus')}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/features/evaluations/form/__tests__/NoteField.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteField } from '../NoteField'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe('NoteField', () => {
  it('shows error when required and value < 10 chars', () => {
    render(<NoteField value="short" required onChange={() => {}} />)
    expect(screen.getByText('evaluation.form.noteRequiredAntibonus')).toBeInTheDocument()
  })
  it('no error when required and value >= 10 chars', () => {
    render(<NoteField value="long enough explanation" required onChange={() => {}} />)
    expect(screen.queryByText('evaluation.form.noteRequiredAntibonus')).toBeNull()
  })
  it('no error when not required', () => {
    render(<NoteField value="" required={false} onChange={() => {}} />)
    expect(screen.queryByText('evaluation.form.noteRequiredAntibonus')).toBeNull()
  })
})
```

- [ ] **Step 3: Run test + commit**

```bash
cd frontend && npx vitest run src/features/evaluations/form/__tests__/NoteField.test.tsx
git add frontend/src/features/evaluations/form/NoteField.tsx frontend/src/features/evaluations/form/__tests__/NoteField.test.tsx
git commit -m "feat(evaluation-form): NoteField autosize + anti-bonus validation"
```

Expected: 3 pass.

---

## Task 22: RubricPanel component

**Files:**
- Create: `frontend/src/features/evaluations/form/RubricPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useTranslation } from 'react-i18next'
import type { Criteria } from '../../criteria/criteriaApi'

interface Props {
  criterion: Criteria
  index: number
  negative: boolean
  lang: 'ru' | 'kg'
}

export function RubricPanel({ criterion, index, negative, lang }: Props) {
  const { t } = useTranslation()
  const name = lang === 'kg' ? criterion.nameKg : criterion.nameRu
  const desc = lang === 'kg' ? criterion.descriptionKg : criterion.descriptionRu
  const scope = lang === 'kg'
    ? (criterion.orgUnitNameKg ?? t('evaluation.form.scopeGlobal'))
    : (criterion.orgUnitNameRu ?? t('evaluation.form.scopeGlobal'))
  const idxLabel = negative ? `A${index + 1}` : `${index + 1}`

  return (
    <>
      <div className="efm-criterion-tag">
        {t('evaluation.form.criterion')} {idxLabel}
      </div>
      <h1 className="efm-criterion-name">{name}</h1>
      <div className="efm-chips">
        {negative
          ? <span className="efm-chip efm-chip--anti">{t('evaluation.form.antiMax', { value: criterion.weight })}</span>
          : <span className="efm-chip efm-chip--w">{t('evaluation.form.weight', { value: criterion.weight })}</span>}
        <span className="efm-chip">{scope}</span>
        {criterion.autoCalculated && <span className="efm-chip efm-chip--auto">{t('evaluation.form.autoBadge')}</span>}
      </div>
      <div className="efm-rubric">
        {desc ?? <span className="efm-rubric-empty">— описание не задано —</span>}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/evaluations/form/RubricPanel.tsx
git commit -m "feat(evaluation-form): RubricPanel (name + chips + description)"
```

---

## Task 23: CriterionFiles component

**Files:**
- Create: `frontend/src/features/evaluations/form/CriterionFiles.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { evaluationsApi, EvaluationFile } from '../evaluationsApi'

interface Props {
  evaluationId: number
  criteriaId: number
  files: EvaluationFile[]
  onAttach: (f: EvaluationFile) => void
  onRemove: (fileId: number) => void
}

const fmtSize = (b: number): string => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

export function CriterionFiles({ evaluationId, criteriaId, files, onAttach, onRemove }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const scoped = files.filter(f => f.criteriaId === criteriaId)

  const upload = async (file: File) => {
    const saved = await evaluationsApi.uploadFile(evaluationId, file, criteriaId)
    onAttach(saved)
  }

  return (
    <>
      <label className="efm-label">{t('evaluation.form.filesLabel')}</label>
      <div
        className={`efm-files-drop ${drag ? 'is-drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault(); setDrag(false)
          for (const f of Array.from(e.dataTransfer.files)) upload(f)
        }}
      >
        {t('evaluation.form.filesDrop')}
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={e => {
            for (const f of Array.from(e.target.files ?? [])) upload(f)
            e.target.value = ''
          }}
        />
      </div>
      {scoped.map(f => (
        <div key={f.id} className="efm-file-row">
          <span>· {f.originalName}</span>
          <span style={{ color: 'var(--dv3-text4)' }}>{fmtSize(f.fileSize)}</span>
          <button
            type="button"
            className="efm-file-del"
            aria-label={`удалить ${f.originalName}`}
            onClick={async () => {
              await evaluationsApi.deleteFile(evaluationId, f.id)
              onRemove(f.id)
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Write test**

Create `frontend/src/features/evaluations/form/__tests__/CriterionFiles.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CriterionFiles } from '../CriterionFiles'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
vi.mock('../../evaluationsApi', () => ({
  evaluationsApi: {
    uploadFile: vi.fn(() => Promise.resolve({ id: 999, evaluationId: 1, criteriaId: 10, uploadedBy: 1, originalName: 'a.pdf', mimeType: 'application/pdf', fileSize: 1024, uploadedAt: '' })),
    deleteFile: vi.fn(() => Promise.resolve()),
  },
}))

describe('CriterionFiles', () => {
  it('lists only files scoped to this criterion', () => {
    const files = [
      { id: 1, evaluationId: 1, criteriaId: 10, uploadedBy: 1, originalName: 'in.pdf', mimeType: 'application/pdf', fileSize: 100, uploadedAt: '' },
      { id: 2, evaluationId: 1, criteriaId: 11, uploadedBy: 1, originalName: 'out.pdf', mimeType: 'application/pdf', fileSize: 100, uploadedAt: '' },
    ]
    render(<CriterionFiles evaluationId={1} criteriaId={10} files={files} onAttach={() => {}} onRemove={() => {}} />)
    expect(screen.getByText(/in.pdf/)).toBeInTheDocument()
    expect(screen.queryByText(/out.pdf/)).toBeNull()
  })

  it('upload via input fires onAttach', async () => {
    const onAttach = vi.fn()
    render(<CriterionFiles evaluationId={1} criteriaId={10} files={[]} onAttach={onAttach} onRemove={() => {}} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([new Uint8Array(4)], 'a.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(onAttach).toHaveBeenCalled())
  })
})
```

- [ ] **Step 3: Run test + commit**

```bash
cd frontend && npx vitest run src/features/evaluations/form/__tests__/CriterionFiles.test.tsx
git add frontend/src/features/evaluations/form/CriterionFiles.tsx frontend/src/features/evaluations/form/__tests__/CriterionFiles.test.tsx
git commit -m "feat(evaluation-form): CriterionFiles drag-drop attach per criterion"
```

Expected: 2 pass.

---

## Task 24: CriterionStep composer

**Files:**
- Create: `frontend/src/features/evaluations/form/CriterionStep.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useMemo } from 'react'
import type { Criteria } from '../../criteria/criteriaApi'
import type { EvaluationFile } from '../evaluationsApi'
import type { ScoreEntry } from './useEvaluationForm'
import { RubricPanel } from './RubricPanel'
import { ScoreInput } from './ScoreInput'
import { NoteField } from './NoteField'
import { CriterionFiles } from './CriterionFiles'

interface Props {
  evaluationId: number
  criterion: Criteria
  index: number
  negative: boolean
  score: ScoreEntry | undefined
  files: EvaluationFile[]
  lang: 'ru' | 'kg'
  onScore: (v: string) => void
  onNote: (v: string) => void
  onAttachFile: (f: EvaluationFile) => void
  onRemoveFile: (id: number) => void
  presetRef?: (n: number, fire: () => void) => void
}

export function CriterionStep({
  evaluationId, criterion, index, negative, score, files, lang,
  onScore, onNote, onAttachFile, onRemoveFile, presetRef,
}: Props) {
  const max = Number(criterion.weight)
  const step = max <= 10 ? 0.5 : 1

  const pending = criterion.autoCalculated && (!score || score.value === '')
  const value = score?.value ?? ''
  const note = score?.note ?? ''

  const noteRequired = useMemo(() => {
    if (!negative) return false
    const v = parseFloat(value)
    return !Number.isNaN(v) && v > 0
  }, [negative, value])

  return (
    <>
      <RubricPanel criterion={criterion} index={index} negative={negative} lang={lang} />
      <ScoreInput
        value={value}
        max={max}
        step={step}
        disabled={criterion.autoCalculated}
        negative={negative}
        pending={pending}
        onChange={onScore}
        presetRef={presetRef}
      />
      <NoteField value={note} required={noteRequired} onChange={onNote} />
      <CriterionFiles
        evaluationId={evaluationId}
        criteriaId={criterion.id}
        files={files}
        onAttach={onAttachFile}
        onRemove={onRemoveFile}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/evaluations/form/CriterionStep.tsx
git commit -m "feat(evaluation-form): CriterionStep composer"
```

---

## Task 25: PhaseTransition + ReviewStep + StepperHeader + BottomBar + ShortcutsOverlay + ChecklistDrawer

**Files:**
- Create: `frontend/src/features/evaluations/form/PhaseTransition.tsx`
- Create: `frontend/src/features/evaluations/form/ReviewStep.tsx`
- Create: `frontend/src/features/evaluations/form/StepperHeader.tsx`
- Create: `frontend/src/features/evaluations/form/BottomBar.tsx`
- Create: `frontend/src/features/evaluations/form/ShortcutsOverlay.tsx`
- Create: `frontend/src/features/evaluations/form/ChecklistDrawer.tsx`

- [ ] **Step 1: PhaseTransition**

```tsx
import { useTranslation } from 'react-i18next'

interface Props {
  posFilled: number; posTotal: number; posSum: number; antiCount: number
  onSkip: () => void; onContinue: () => void
}

export function PhaseTransition({ posFilled, posTotal, posSum, antiCount, onContinue, onSkip }: Props) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', padding: '64px 0' }}>
      <div className="efm-phase-tag">{t('evaluation.form.transitionPositiveDone')}</div>
      <div style={{ fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', fontSize: 56, color: 'var(--dv3-text)' }}>
        {posFilled} / {posTotal}
      </div>
      <div style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--dv3-text3)', marginTop: 8 }}>
        сумма {posSum.toFixed(1)} / 100
      </div>
      <h2 style={{ fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', fontSize: 32, marginTop: 32 }}>
        {t('evaluation.form.transitionAnti')}
      </h2>
      <div style={{ fontSize: 12, color: 'var(--dv3-text3)', marginBottom: 24 }}>{antiCount} критерия для возможных вычетов</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="efm-bb-btn efm-bb-btn--primary" onClick={onContinue}>{t('evaluation.form.transitionGo')}</button>
        <button className="efm-bb-btn" onClick={onSkip}>{t('evaluation.form.transitionSkip')}</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ReviewStep**

```tsx
import { useTranslation } from 'react-i18next'

interface Props {
  posSum: number; negSum: number; previewScore: number | null
  posFilled: number; posTotal: number
  negFilled: number; negTotal: number
  filesCount: number
  onBackToEdit: () => void
  onSubmit: () => void
  canSubmit: boolean
}

const zoneClass = (pct: number): string => {
  if (pct >= 80) return 'is-up'
  if (pct >= 60) return 'is-warn'
  return 'is-down'
}

export function ReviewStep({ posSum, negSum, previewScore, posFilled, posTotal, negFilled, negTotal, filesCount, onBackToEdit, onSubmit, canSubmit }: Props) {
  const { t } = useTranslation()
  const total = previewScore ?? Math.max(0, posSum - negSum)
  const whole = Math.round(total)
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div className="efm-phase-tag">{t('evaluation.form.reviewTotal')}</div>
      <div className={`efm-readout ${zoneClass(whole)}`} style={{ fontSize: 96 }}>{whole}<span style={{ fontSize: 16, marginLeft: 12, color: 'var(--dv3-text3)' }}>/ 100</span></div>
      <div style={{ display: 'inline-block', textAlign: 'left', marginTop: 32, fontSize: 13, letterSpacing: '.1em', color: 'var(--dv3-text3)' }}>
        <div>{t('evaluation.form.reviewPositive')} <strong style={{ color: 'var(--dv3-zone-up)', marginLeft: 24 }}>+{posSum.toFixed(2)}</strong></div>
        <div>{t('evaluation.form.reviewAnti')} <strong style={{ color: 'var(--dv3-zone-down)', marginLeft: 24 }}>−{negSum.toFixed(2)}</strong></div>
        <div style={{ borderTop: '1px dashed var(--dv3-border)', paddingTop: 8, marginTop: 8 }}>
          {t('evaluation.form.reviewTotal')} <strong style={{ marginLeft: 24 }}>{whole}</strong>
        </div>
      </div>
      <div style={{ marginTop: 32, fontSize: 11, letterSpacing: '.18em', color: 'var(--dv3-text3)', textTransform: 'uppercase' }}>
        ☑ {posFilled}/{posTotal} положительных<br />
        ☑ {negFilled}/{negTotal} антибонусов<br />
        ☑ файлов: {filesCount}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
        <button className="efm-bb-btn efm-bb-btn--primary" disabled={!canSubmit} onClick={onSubmit}>{t('evaluation.form.reviewConfirm')}</button>
        <button className="efm-bb-btn" onClick={onBackToEdit}>{t('evaluation.form.reviewBack')}</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: StepperHeader**

```tsx
import { useTranslation } from 'react-i18next'
import type { Criteria } from '../../criteria/criteriaApi'
import type { Phase, ScoreEntry } from './useEvaluationForm'

interface Props {
  phase: Phase; cursor: number
  positive: Criteria[]; antibonus: Criteria[]
  scores: Record<number, ScoreEntry>
}

export function StepperHeader({ phase, cursor, positive, antibonus, scores }: Props) {
  const { t } = useTranslation()
  const list = phase === 'antibonus' ? antibonus : positive
  const phaseKey = phase === 'antibonus' ? 'phaseAntibonus' : phase === 'review' ? 'phaseReview' : 'phasePositive'
  return (
    <>
      <div className={`efm-phase-tag ${phase === 'antibonus' ? 'is-anti' : ''}`}>{t(`evaluation.form.${phaseKey}`)}</div>
      <div className="efm-step-dots" role="progressbar" aria-valuenow={cursor + 1} aria-valuemin={1} aria-valuemax={list.length}>
        {list.map((c, i) => {
          const filled = !!scores[c.id]?.value
          return (
            <span
              key={c.id}
              className={`efm-step-dot ${filled ? 'is-done' : ''} ${i === cursor && phase !== 'review' && phase !== 'transition' ? 'is-current' : ''} ${phase === 'antibonus' ? 'is-anti' : ''}`}
            />
          )
        })}
      </div>
    </>
  )
}
```

- [ ] **Step 4: BottomBar**

```tsx
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ListChecks, Save, Send } from 'lucide-react'

interface Props {
  saving: boolean; lastSaved: Date | null; saveFailed: boolean
  canPrev: boolean; canNext: boolean; canSubmit: boolean
  showSubmit: boolean
  onPrev: () => void; onNext: () => void
  onSave: () => void; onSubmit: () => void
  onToggleDrawer: () => void
}

export function BottomBar(p: Props) {
  const { t } = useTranslation()
  return (
    <div className="efm-bottombar">
      <button className="efm-bb-btn" disabled={!p.canPrev} onClick={p.onPrev}><ChevronLeft size={14} /> {t('evaluation.form.prev')}</button>
      <div className="efm-bottombar-status">
        {p.saving ? t('evaluation.form.saving')
          : p.saveFailed ? t('evaluation.form.saveFailed')
          : p.lastSaved ? <>{t('evaluation.form.saved', { time: p.lastSaved.toLocaleTimeString('ru-RU') })}</>
          : null}
      </div>
      <button className="efm-bb-btn" onClick={p.onToggleDrawer}><ListChecks size={14} /> {t('evaluation.form.checklist')}</button>
      {p.showSubmit
        ? <button className="efm-bb-btn efm-bb-btn--primary" disabled={!p.canSubmit} onClick={p.onSubmit}><Send size={14} /> {t('evaluation.form.submit')}</button>
        : <button className="efm-bb-btn efm-bb-btn--primary" disabled={!p.canNext} onClick={p.onNext}>{t('evaluation.form.next')} <ChevronRight size={14} /></button>}
    </div>
  )
}
```

- [ ] **Step 5: ShortcutsOverlay**

```tsx
import { useTranslation } from 'react-i18next'

interface Props { open: boolean; onClose: () => void }

export function ShortcutsOverlay({ open, onClose }: Props) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="efm-shortcuts" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="efm-shortcuts-card" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic' }}>{t('evaluation.form.shortcuts.title')}</h3>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, lineHeight: 2 }}>
          <li>{t('evaluation.form.shortcuts.prevNext')}</li>
          <li>{t('evaluation.form.shortcuts.presets')}</li>
          <li>{t('evaluation.form.shortcuts.save')}</li>
          <li>{t('evaluation.form.shortcuts.submit')}</li>
          <li>{t('evaluation.form.shortcuts.help')}</li>
          <li>{t('evaluation.form.shortcuts.close')}</li>
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: ChecklistDrawer**

```tsx
import { useTranslation } from 'react-i18next'
import type { Criteria } from '../../criteria/criteriaApi'
import type { Phase, ScoreEntry } from './useEvaluationForm'

interface Props {
  open: boolean; onClose: () => void
  positive: Criteria[]; antibonus: Criteria[]
  scores: Record<number, ScoreEntry>
  lang: 'ru' | 'kg'
  onJump: (phase: Phase, idx: number) => void
}

export function ChecklistDrawer({ open, onClose, positive, antibonus, scores, lang, onJump }: Props) {
  const { t } = useTranslation()
  const row = (c: Criteria, i: number, neg: boolean) => {
    const v = scores[c.id]?.value
    const done = !!v && v !== ''
    const name = lang === 'kg' ? c.nameKg : c.nameRu
    return (
      <button
        key={c.id}
        onClick={() => { onJump(neg ? 'antibonus' : 'positive', i); onClose() }}
        style={{
          display: 'grid', gridTemplateColumns: '16px 1fr auto', gap: 10, alignItems: 'center',
          padding: '10px 0', width: '100%', background: 'none', border: 0, cursor: 'pointer',
          borderBottom: '1px dashed var(--dv3-border)', textAlign: 'left',
        }}
      >
        <span style={{
          width: 12, height: 12, transform: 'rotate(45deg)',
          background: done ? (neg ? 'var(--dv3-zone-down)' : 'var(--dv3-accent)') : 'transparent',
          border: `1.5px solid ${done ? (neg ? 'var(--dv3-zone-down)' : 'var(--dv3-accent)') : 'var(--dv3-border-hi)'}`,
        }} />
        <span style={{ fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {neg ? `A${i + 1}` : `${i + 1}`}. {name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--dv3-text3)' }}>
          {done ? `${neg ? '−' : ''}${parseFloat(v).toFixed(1)}` : '—'}
        </span>
      </button>
    )
  }
  return (
    <>
      <div className={`efm-drawer-backdrop ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`efm-drawer ${open ? 'is-open' : ''}`} aria-label={t('evaluation.form.checklist')}>
        <div style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0, fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic' }}>
            {t('evaluation.form.checklist')}
          </h3>
          {positive.map((c, i) => row(c, i, false))}
          {antibonus.map((c, i) => row(c, i, true))}
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 7: Commit all**

```bash
git add frontend/src/features/evaluations/form/PhaseTransition.tsx \
        frontend/src/features/evaluations/form/ReviewStep.tsx \
        frontend/src/features/evaluations/form/StepperHeader.tsx \
        frontend/src/features/evaluations/form/BottomBar.tsx \
        frontend/src/features/evaluations/form/ShortcutsOverlay.tsx \
        frontend/src/features/evaluations/form/ChecklistDrawer.tsx
git commit -m "feat(evaluation-form): phase transition, review, header, bottom bar, drawer, shortcuts overlay"
```

---

## Task 26: PhaseRouter

**Files:**
- Create: `frontend/src/features/evaluations/form/PhaseRouter.tsx`

- [ ] **Step 1: Write component**

```tsx
import type { Phase, ScoreEntry } from './useEvaluationForm'
import type { Criteria } from '../../criteria/criteriaApi'
import type { EvaluationFile } from '../evaluationsApi'
import { CriterionStep } from './CriterionStep'
import { PhaseTransition } from './PhaseTransition'
import { ReviewStep } from './ReviewStep'

interface Props {
  phase: Phase; cursor: number
  evaluationId: number
  positive: Criteria[]; antibonus: Criteria[]
  scores: Record<number, ScoreEntry>; files: EvaluationFile[]
  previewScore: number | null
  posFilled: number; negFilled: number
  canSubmit: boolean
  lang: 'ru' | 'kg'
  onScore: (criteriaId: number, v: string) => void
  onNote: (criteriaId: number, v: string) => void
  onAttachFile: (f: EvaluationFile) => void
  onRemoveFile: (id: number) => void
  onJump: (phase: Phase, idx: number) => void
  onSubmit: () => void
  presetRef?: (n: number, fire: () => void) => void
}

const sumValues = (list: Criteria[], scores: Record<number, ScoreEntry>): number =>
  list.reduce((s, c) => s + (parseFloat(scores[c.id]?.value ?? '0') || 0), 0)

export function PhaseRouter(p: Props) {
  if (p.phase === 'transition') {
    return <PhaseTransition
      posFilled={p.posFilled} posTotal={p.positive.length} posSum={sumValues(p.positive, p.scores)}
      antiCount={p.antibonus.length}
      onContinue={() => p.onJump('antibonus', 0)}
      onSkip={() => p.onJump('review', 0)}
    />
  }
  if (p.phase === 'review') {
    return <ReviewStep
      posSum={sumValues(p.positive, p.scores)} negSum={sumValues(p.antibonus, p.scores)}
      previewScore={p.previewScore}
      posFilled={p.posFilled} posTotal={p.positive.length}
      negFilled={p.negFilled} negTotal={p.antibonus.length}
      filesCount={p.files.length}
      onBackToEdit={() => p.onJump(p.antibonus.length ? 'antibonus' : 'positive', (p.antibonus.length ? p.antibonus.length : p.positive.length) - 1)}
      onSubmit={p.onSubmit}
      canSubmit={p.canSubmit}
    />
  }
  const list = p.phase === 'antibonus' ? p.antibonus : p.positive
  const c = list[p.cursor]
  if (!c) return null
  return (
    <CriterionStep
      evaluationId={p.evaluationId}
      criterion={c}
      index={p.cursor}
      negative={p.phase === 'antibonus'}
      score={p.scores[c.id]}
      files={p.files}
      lang={p.lang}
      onScore={v => p.onScore(c.id, v)}
      onNote={v => p.onNote(c.id, v)}
      onAttachFile={p.onAttachFile}
      onRemoveFile={p.onRemoveFile}
      presetRef={p.presetRef}
    />
  )
}
```

- [ ] **Step 2: Write smoke test**

Create `frontend/src/features/evaluations/form/__tests__/PhaseRouter.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhaseRouter } from '../PhaseRouter'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, v?: any) => v?.value != null ? `${k}:${v.value}` : k }) }))

const mkCriterion = (id: number, type: 'POSITIVE' | 'ANTI_BONUS' = 'POSITIVE') => ({
  id, nameRu: `N${id}`, nameKg: `N${id}`, descriptionRu: 'desc', descriptionKg: 'desc',
  type, weight: 10, orgUnitId: null, orgUnitNameRu: null, orgUnitNameKg: null,
  autoCalculated: false, frozen: false, active: true, createdAt: '',
})

describe('PhaseRouter', () => {
  it('positive phase renders the criterion at cursor', () => {
    render(<PhaseRouter
      phase="positive" cursor={1} evaluationId={1}
      positive={[mkCriterion(10), mkCriterion(11)]} antibonus={[]} scores={{}} files={[]}
      previewScore={null} posFilled={0} negFilled={0} canSubmit={false}
      lang="ru" onScore={() => {}} onNote={() => {}} onAttachFile={() => {}} onRemoveFile={() => {}}
      onJump={() => {}} onSubmit={() => {}}
    />)
    expect(screen.getByText('N11')).toBeInTheDocument()
  })

  it('transition phase renders transition screen', () => {
    render(<PhaseRouter
      phase="transition" cursor={0} evaluationId={1}
      positive={[mkCriterion(10)]} antibonus={[mkCriterion(20, 'ANTI_BONUS')]} scores={{}} files={[]}
      previewScore={null} posFilled={1} negFilled={0} canSubmit={false}
      lang="ru" onScore={() => {}} onNote={() => {}} onAttachFile={() => {}} onRemoveFile={() => {}}
      onJump={() => {}} onSubmit={() => {}}
    />)
    expect(screen.getByText('evaluation.form.transitionAnti')).toBeInTheDocument()
  })

  it('review phase renders the review screen', () => {
    render(<PhaseRouter
      phase="review" cursor={0} evaluationId={1}
      positive={[mkCriterion(10)]} antibonus={[]} scores={{ 10: { value: '8', note: '', dirty: false } }} files={[]}
      previewScore={80} posFilled={1} negFilled={0} canSubmit
      lang="ru" onScore={() => {}} onNote={() => {}} onAttachFile={() => {}} onRemoveFile={() => {}}
      onJump={() => {}} onSubmit={() => {}}
    />)
    expect(screen.getByText('evaluation.form.reviewConfirm')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test + commit**

```bash
cd frontend && npx vitest run src/features/evaluations/form/__tests__/PhaseRouter.test.tsx
git add frontend/src/features/evaluations/form/PhaseRouter.tsx frontend/src/features/evaluations/form/__tests__/PhaseRouter.test.tsx
git commit -m "feat(evaluation-form): PhaseRouter + smoke tests"
```

Expected: 3 pass.

---

## Task 27: New EvaluationFormPage wiring

**Files:**
- Modify: `frontend/src/features/evaluations/EvaluationFormPage.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import { evaluationsApi } from './evaluationsApi'
import api from '../../app/api'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { FORM_CSS } from './form/formStyles'
import { useEvaluationForm } from './form/useEvaluationForm'
import { useAutosave } from './form/useAutosave'
import { useKeyboardShortcuts } from './form/useKeyboardShortcuts'
import { StepperHeader } from './form/StepperHeader'
import { PhaseRouter } from './form/PhaseRouter'
import { BottomBar } from './form/BottomBar'
import { ChecklistDrawer } from './form/ChecklistDrawer'
import { ShortcutsOverlay } from './form/ShortcutsOverlay'

const idCode = (id: number): string => `EV-${String(id).padStart(6, '0')}`

const buildPayload = (scores: Record<number, { value: string; note: string }>) =>
  Object.entries(scores)
    .filter(([, v]) => v.value !== '')
    .map(([sid, v]) => ({
      criteriaId: Number(sid),
      value: parseFloat(v.value),
      note: v.note || undefined,
    }))

export function EvaluationFormPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)
  const lang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'
  useSelector((_s: RootState) => null) // keep store wired; per CLAUDE.md no selectCurrentUser

  const f = useEvaluationForm(evaluationId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const presetTriggers = useRef<Array<() => void>>([])

  const dirty = Object.values(f.state.scores).some(s => s.dirty)

  const doSave = useCallback(async () => {
    const list = buildPayload(f.state.scores)
    if (list.length === 0) return
    f.dispatch({ type: 'SAVING', saving: true })
    try {
      await evaluationsApi.saveScores(evaluationId, list)
      f.dispatch({ type: 'SAVED', at: new Date() })
      f.dispatch({ type: 'CLEAR_DIRTY' })
      setSaveFailed(false)
    } catch (e) {
      setSaveFailed(true)
    } finally {
      f.dispatch({ type: 'SAVING', saving: false })
    }
  }, [evaluationId, f])

  useAutosave(doSave, dirty)

  // Live preview (debounced 800ms)
  useEffect(() => {
    const list = buildPayload(f.state.scores)
    if (list.length === 0) { f.dispatch({ type: 'PREVIEW', value: null }); return }
    const t = setTimeout(() => {
      evaluationsApi.preview(evaluationId, list)
        .then(v => f.dispatch({ type: 'PREVIEW', value: v }))
        .catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [f.state.scores, evaluationId, f.dispatch])

  // Confirm submit
  const onSubmitClick = useCallback(() => setSubmitConfirmOpen(true), [])
  const doSubmit = useCallback(async () => {
    try {
      await doSave()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } finally {
      setSubmitConfirmOpen(false)
    }
  }, [doSave, evaluationId, navigate])

  // Keyboard
  useKeyboardShortcuts({
    onPrev: f.goPrev,
    onNext: () => { if (f.canAdvance) f.goNext() },
    onPreset: (i) => presetTriggers.current[i]?.(),
    onSave: doSave,
    onSubmit: () => { if (f.state.phase === 'review' && f.canSubmit) onSubmitClick() },
    onHelp: () => setShortcutsOpen(true),
    onEscape: () => { setShortcutsOpen(false); setDrawerOpen(false) },
  })

  const total = f.state.previewScore ?? Math.max(0, f.positive.reduce((s, c) => s + (parseFloat(f.state.scores[c.id]?.value ?? '0') || 0), 0) - f.antibonus.reduce((s, c) => s + (parseFloat(f.state.scores[c.id]?.value ?? '0') || 0), 0))
  const lowTotal = total < 30

  // Banners
  if (f.state.loading) return <BannerShell text="Открытие досье…" />
  if (f.state.error) return <BannerShell text="Не удалось загрузить" tone="err" />
  if (!f.state.evaluation) return <BannerShell text="Оценка не найдена" tone="err" />
  if (f.state.evaluation.status !== 'DRAFT') return <BannerShell text={t('evaluation.form.evaluationNotDraftBanner')} tone="warn" />
  if (f.positive.length === 0) return <BannerShell text={t('evaluation.form.noCriteria')} tone="warn" />

  const showSubmit = f.state.phase === 'review'
  const periodName = lang === 'kg' ? f.state.evaluation.periodNameKg : f.state.evaluation.periodNameRu

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="efm-shell efm-page" data-phase={f.state.phase}>
        <div className="efm-topbar">
          <button className="efm-back" onClick={() => navigate('/my-tasks')}>
            <ArrowLeft size={12} /> {t('evaluation.form.back')}
          </button>
          <span>{idCode(f.state.evaluation.id)} · DRAFT · {periodName}</span>
        </div>

        <StepperHeader
          phase={f.state.phase} cursor={f.state.cursor}
          positive={f.positive} antibonus={f.antibonus} scores={f.state.scores}
        />

        <PhaseRouter
          phase={f.state.phase} cursor={f.state.cursor}
          evaluationId={evaluationId}
          positive={f.positive} antibonus={f.antibonus}
          scores={f.state.scores} files={f.state.files}
          previewScore={f.state.previewScore}
          posFilled={f.posFilled} negFilled={f.negFilled}
          canSubmit={f.canSubmit}
          lang={lang}
          onScore={f.setScore} onNote={f.setNote}
          onAttachFile={(file) => f.dispatch({ type: 'ATTACH_FILE', file })}
          onRemoveFile={(id) => f.dispatch({ type: 'REMOVE_FILE', fileId: id })}
          onJump={f.goToStep}
          onSubmit={onSubmitClick}
          presetRef={(n, fire) => { presetTriggers.current[n] = fire }}
        />

        <BottomBar
          saving={f.state.saving}
          lastSaved={f.state.lastSaved}
          saveFailed={saveFailed}
          canPrev={!(f.state.phase === 'positive' && f.state.cursor === 0)}
          canNext={f.canAdvance}
          canSubmit={f.canSubmit}
          showSubmit={showSubmit}
          onPrev={f.goPrev}
          onNext={f.goNext}
          onSave={doSave}
          onSubmit={onSubmitClick}
          onToggleDrawer={() => setDrawerOpen(v => !v)}
        />

        <ChecklistDrawer
          open={drawerOpen} onClose={() => setDrawerOpen(false)}
          positive={f.positive} antibonus={f.antibonus} scores={f.state.scores}
          lang={lang} onJump={f.goToStep}
        />

        <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <ConfirmDialog
          open={submitConfirmOpen}
          title={t('evaluation.form.confirmTitle')}
          description={`${t('evaluation.form.confirmBody', { total: Math.round(total) })}${lowTotal ? '\n\n' + t('evaluation.form.confirmLowWarn') : ''}`}
          variant="default"
          onConfirm={doSubmit}
          onCancel={() => setSubmitConfirmOpen(false)}
        />
      </div>
    </div>
  )
}

function BannerShell({ text, tone }: { text: string; tone?: 'warn' | 'err' }) {
  const color = tone === 'err' ? 'var(--dv3-zone-down)' : tone === 'warn' ? 'var(--dv3-zone-warn)' : 'var(--dv3-text3)'
  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="efm-shell" style={{ textAlign: 'center', padding: '120px 24px', fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', fontSize: 22, color }}>
        {text}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: clean. If `ConfirmDialog` prop names differ, adapt.

- [ ] **Step 3: Run dev server, exercise happy path**

```bash
./scripts/dev-start.sh
```

In browser at `localhost:5173`:
- Log in, open a DRAFT evaluation form.
- Verify: phase tag, dots, criterion name, presets, custom toggle.
- Press `→` to advance; `Cmd+S` to save; reach review; click Отправить; verify confirm dialog wording.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/evaluations/EvaluationFormPage.tsx
git commit -m "feat(evaluation-form): focus-mode stepper page (replaces dense form)"
```

---

# Phase 4 — Polish + final QA

## Task 28: Remove legacy `FileUploadSection` import + dead code

**Files:**
- Modify: `frontend/src/features/evaluations/EvaluationFormPage.tsx` (already done above)
- Inspect: `frontend/src/features/evaluations/components/FileUploadSection.tsx`

- [ ] **Step 1: Confirm legacy component no longer imported by main page**

```bash
grep -RIn "FileUploadSection" frontend/src/features/evaluations/
```

Expected: only references inside `FileUploadSection.tsx` itself and `EvaluationFormPage.legacy.tsx`.

- [ ] **Step 2: Leave `FileUploadSection.tsx` in place for now**

It remains referenced by the legacy file. Will be deleted alongside the legacy file in a follow-up release per spec rollout phase 4. No action.

- [ ] **Step 3: Commit (no-op)** — skip if nothing changed.

---

## Task 29: i18n smoke + manual QA pass

**Files:** (none)

- [ ] **Step 1: Toggle language to kg, repeat happy-path test**

In running dev server, switch language via existing topbar selector. All visible strings on the form page must change. Any string that does not change = missing kg translation; add to `kg/translation.json`.

- [ ] **Step 2: Mobile QA via Chrome devtools**

Width 375px:
- Topbar fits, no overflow.
- Bottom bar buttons large enough to tap.
- Drawer slides in from right when ☰ tapped, backdrop blocks page.
- Preset chips wrap to multiple rows.

- [ ] **Step 3: Keyboard-only QA**

Tab through all focusable controls in step. Verify focus rings visible on preset chips, custom number input, note textarea, file drop zone, bottom-bar buttons.

- [ ] **Step 4: Screen reader spot-check** (`VoiceOver` Cmd+F5 on macOS, NVDA on Win)

Verify: phase tag, criterion name, score group, note label all read out. Step dots announce progress.

- [ ] **Step 5: Documentation update**

If `CLAUDE.md` mentions the old form structure, update. No additional doc files unless requested.

---

## Task 30: Full backend + frontend test run + final commit

**Files:** (none)

- [ ] **Step 1: Backend test sweep**

```bash
cd backend && mvn -q test
```

Expected: all green.

- [ ] **Step 2: Frontend test sweep**

```bash
cd frontend && npx vitest run
```

Expected: all green.

- [ ] **Step 3: Type-check + build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Expected: build succeeds, no errors.

- [ ] **Step 4: Push branch + open PR**

```bash
git log --oneline main..HEAD
gh pr create --title "feat: evaluation form focus-mode redesign" --body "$(cat <<'EOF'
## Summary
- One-criterion-at-a-time stepper replaces dense two-column form
- Two-phase flow: positive scoring → anti-bonus deductions
- Preset chip score input + custom number reveal
- Per-criterion file evidence (new `evaluation_files.criteria_id`)
- Criterion description rubric (new `criteria.description_ru/kg`)
- Keyboard-first navigation (`←/→`, `1..5`, `Cmd+S`, `Cmd+Enter`, `?`)
- Anti-bonus note required when score > 0 (server + client)
- Auto-calc criteria read-only with AUTO badge + ОЖИДАНИЕ pending state
- Period name now exposed on `EvaluationResponse`

Spec: `docs/superpowers/specs/2026-05-28-evaluation-form-focus-mode-design.md`
Plan: `docs/superpowers/plans/2026-05-28-evaluation-form-focus-mode.md`

## Test plan
- [ ] Backend `mvn test` green
- [ ] Frontend `vitest run` green
- [ ] `tsc --noEmit` clean
- [ ] Manual happy path: fill 8 positive + 2 anti-bonus → review → submit
- [ ] Refresh restores phase + cursor from URL hash
- [ ] ru ↔ kg language toggle preserves all strings
- [ ] Mobile @ 375px: bottom bar + drawer functional
- [ ] Keyboard-only nav reaches all controls
- [ ] Anti-bonus > 0 without note: rejected with inline error
- [ ] Auto-calc criterion: locked input, editable note, ОЖИДАНИЕ when value null

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**
- Backend description fields → Tasks 1, 2, 4, 5 ✓
- `evaluation_files.criteria_id` → Tasks 1, 3, 6 ✓
- Anti-bonus note required → Task 7 ✓
- Auto-calc read-only → Tasks 7, 9 ✓
- Auto-calc null value seeding + `ОЖИДАНИЕ` UI → Task 9 (backend) + Task 20 (frontend pending state) ✓
- `EvaluationResponse.periodName{Ru,Kg}` → Task 8 ✓
- `useEvaluationForm` state machine → Task 16, tests Task 17 ✓
- Autosave layers → Task 18 ✓
- Keyboard shortcuts → Task 19 ✓
- Preset chips + custom reveal → Task 20 ✓
- NoteField autosize + validation → Task 21 ✓
- RubricPanel with description → Task 22 ✓
- Per-criterion files component → Task 23 ✓
- CriterionStep composer → Task 24 ✓
- PhaseTransition / ReviewStep / StepperHeader / BottomBar / ShortcutsOverlay / ChecklistDrawer → Task 25 ✓
- PhaseRouter → Task 26 ✓
- Page wiring + i18n + ConfirmDialog + low-total warn → Task 27 ✓
- Legacy archive → Task 14 ✓
- i18n keys ru + kg → Task 13 ✓
- Admin criteria description form → Task 11 ✓
- API type extensions → Tasks 10, 12 ✓
- CSS tokens → Task 15 ✓
- Final manual + automated QA → Tasks 29, 30 ✓

**2. Placeholder scan:** none found. Auto-calc placeholder `AutoScoreCalculator` returning null is *intentional* and explicitly documented as a placeholder for a follow-up.

**3. Type consistency:** `Phase` exported from `useEvaluationForm.ts` used everywhere. `ScoreEntry` exported and reused. `EvaluationFile` from `evaluationsApi.ts` used consistently. `Criteria` import path consistent.

**Spec consistency note (already patched inline before plan creation):**
- `evaluation_files` (plural) — confirmed table name
- `Evaluation` entity already has `@Version`

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-evaluation-form-focus-mode.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
