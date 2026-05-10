# M3-BE-01: DB Schema — Evaluation Periods, Evaluations, Scores, Reactions, Files, Appeals, Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all M3 database tables via Liquibase: `evaluation_periods`, `evaluations`, `evaluation_scores`, `evaluation_reactions`, `evaluation_files`, `appeals`, and `notifications`.

**Architecture:** `evaluation_periods` defines monthly/quarterly/annual evaluation windows with a status FSM (DRAFT → ACTIVE → CLOSED). `evaluations` are per-employee per-period with optimistic locking (`version` column). `evaluation_scores` are the live scores per criteria (distinct from the snapshot history in M2). `appeals` link to an evaluation with an appeal window deadline. `notifications` are per-user event messages with a read flag.

**Tech Stack:** PostgreSQL 15, Liquibase XML.

**Depends on:** m2-criteria/be-04-auto-anti-bonus.md

---

### Task 1: Evaluation periods + evaluations tables

**Files:**
- Create: `backend/src/main/resources/db/changelog/m3/014-create-evaluation-periods.xml`
- Create: `backend/src/main/resources/db/changelog/m3/015-create-evaluations.xml`

- [ ] **Step 1: Create evaluation_periods migration**

`backend/src/main/resources/db/changelog/m3/014-create-evaluation-periods.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="014-create-evaluation-periods" author="gfh">
        <createTable tableName="evaluation_periods">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <!-- MONTHLY, QUARTERLY, ANNUAL -->
            <column name="type" type="VARCHAR(20)">
                <constraints nullable="false"/>
            </column>
            <column name="start_date" type="DATE">
                <constraints nullable="false"/>
            </column>
            <column name="end_date" type="DATE">
                <constraints nullable="false"/>
            </column>
            <!-- Deadline by which evaluators must submit -->
            <column name="submission_deadline" type="TIMESTAMP">
                <constraints nullable="false"/>
            </column>
            <!-- DRAFT → ACTIVE → CLOSED -->
            <column name="status" type="VARCHAR(20)" defaultValue="DRAFT">
                <constraints nullable="false"/>
            </column>
            <!-- True = Quartz created this automatically -->
            <column name="auto_created" type="BOOLEAN" defaultValueBoolean="false">
                <constraints nullable="false"/>
            </column>
            <column name="created_by" type="BIGINT"/>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="closed_at" type="TIMESTAMP"/>
        </createTable>

        <addCheckConstraint
            tableName="evaluation_periods"
            constraintName="chk_period_type"
            checkCondition="type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')"/>

        <addCheckConstraint
            tableName="evaluation_periods"
            constraintName="chk_period_status"
            checkCondition="status IN ('DRAFT', 'ACTIVE', 'CLOSED')"/>

        <addCheckConstraint
            tableName="evaluation_periods"
            constraintName="chk_period_dates"
            checkCondition="end_date >= start_date"/>

        <createIndex tableName="evaluation_periods" indexName="idx_periods_status">
            <column name="status"/>
        </createIndex>
        <createIndex tableName="evaluation_periods" indexName="idx_periods_dates">
            <column name="start_date"/>
            <column name="end_date"/>
        </createIndex>

        <rollback><dropTable tableName="evaluation_periods"/></rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Create evaluations migration**

`backend/src/main/resources/db/changelog/m3/015-create-evaluations.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="015-create-evaluations" author="gfh">
        <createTable tableName="evaluations">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="period_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="evaluatee_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- Resolved evaluator (after resolveEvaluator algorithm) -->
            <column name="evaluator_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- DRAFT | SUBMITTED | ACKNOWLEDGED | APPEALED | CLOSED -->
            <column name="status" type="VARCHAR(20)" defaultValue="DRAFT">
                <constraints nullable="false"/>
            </column>
            <!-- Computed final score (null until submitted) -->
            <column name="final_score" type="NUMERIC(6,2)"/>
            <!-- Optimistic locking version -->
            <column name="version" type="BIGINT" defaultValueNumeric="0">
                <constraints nullable="false"/>
            </column>
            <!-- Employee may add a comment on the draft -->
            <column name="evaluatee_comment" type="TEXT"/>
            <column name="submitted_at" type="TIMESTAMP"/>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="updated_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addCheckConstraint
            tableName="evaluations"
            constraintName="chk_evaluation_status"
            checkCondition="status IN ('DRAFT','SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')"/>

        <addUniqueConstraint
            tableName="evaluations"
            columnNames="period_id, evaluatee_id"
            constraintName="uq_evaluation_period_evaluatee"/>

        <addForeignKeyConstraint
            baseTableName="evaluations" baseColumnNames="period_id"
            referencedTableName="evaluation_periods" referencedColumnNames="id"
            constraintName="fk_evaluations_period" onDelete="RESTRICT"/>

        <addForeignKeyConstraint
            baseTableName="evaluations" baseColumnNames="evaluatee_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_evaluations_evaluatee" onDelete="RESTRICT"/>

        <addForeignKeyConstraint
            baseTableName="evaluations" baseColumnNames="evaluator_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_evaluations_evaluator" onDelete="RESTRICT"/>

        <!-- FK from M2 evaluation_score_history to evaluations -->
        <addForeignKeyConstraint
            baseTableName="evaluation_score_history" baseColumnNames="evaluation_id"
            referencedTableName="evaluations" referencedColumnNames="id"
            constraintName="fk_score_history_evaluation" onDelete="CASCADE"/>

        <createIndex tableName="evaluations" indexName="idx_evaluations_period_id">
            <column name="period_id"/>
        </createIndex>
        <createIndex tableName="evaluations" indexName="idx_evaluations_evaluatee_id">
            <column name="evaluatee_id"/>
        </createIndex>
        <createIndex tableName="evaluations" indexName="idx_evaluations_evaluator_id">
            <column name="evaluator_id"/>
        </createIndex>
        <createIndex tableName="evaluations" indexName="idx_evaluations_status">
            <column name="status"/>
        </createIndex>

        <rollback><dropTable tableName="evaluations"/></rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: Add includes to master changelog**

```xml
<include file="db/changelog/m3/014-create-evaluation-periods.xml"/>
<include file="db/changelog/m3/015-create-evaluations.xml"/>
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/changelog/m3/
git commit -m "feat(db): add evaluation_periods and evaluations tables with optimistic locking version column"
```

---

### Task 2: Scores, reactions, files tables

**Files:**
- Create: `backend/src/main/resources/db/changelog/m3/016-create-evaluation-scores.xml`
- Create: `backend/src/main/resources/db/changelog/m3/017-create-reactions-files.xml`

- [ ] **Step 1: Create evaluation_scores migration**

`backend/src/main/resources/db/changelog/m3/016-create-evaluation-scores.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="016-create-evaluation-scores" author="gfh">
        <!--
            Live scores entered by the evaluator during drafting.
            Separate from evaluation_score_history which is the immutable snapshot post-submission.
        -->
        <createTable tableName="evaluation_scores">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="evaluation_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="criteria_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- Raw value entered by evaluator -->
            <column name="value" type="NUMERIC(10,4)">
                <constraints nullable="false"/>
            </column>
            <!-- Optional note per criteria -->
            <column name="note" type="TEXT"/>
            <column name="updated_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addUniqueConstraint
            tableName="evaluation_scores"
            columnNames="evaluation_id, criteria_id"
            constraintName="uq_score_evaluation_criteria"/>

        <addForeignKeyConstraint
            baseTableName="evaluation_scores" baseColumnNames="evaluation_id"
            referencedTableName="evaluations" referencedColumnNames="id"
            constraintName="fk_scores_evaluation" onDelete="CASCADE"/>

        <addForeignKeyConstraint
            baseTableName="evaluation_scores" baseColumnNames="criteria_id"
            referencedTableName="criteria" referencedColumnNames="id"
            constraintName="fk_scores_criteria" onDelete="RESTRICT"/>

        <createIndex tableName="evaluation_scores" indexName="idx_eval_scores_evaluation_id">
            <column name="evaluation_id"/>
        </createIndex>

        <rollback><dropTable tableName="evaluation_scores"/></rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Create reactions + files migration**

`backend/src/main/resources/db/changelog/m3/017-create-reactions-files.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="017-create-reactions-files" author="gfh">
        <!-- Employee's reaction to a submitted evaluation -->
        <createTable tableName="evaluation_reactions">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="evaluation_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- AGREE | DISAGREE -->
            <column name="reaction" type="VARCHAR(10)">
                <constraints nullable="false"/>
            </column>
            <column name="comment" type="TEXT"/>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addCheckConstraint
            tableName="evaluation_reactions"
            constraintName="chk_reaction_type"
            checkCondition="reaction IN ('AGREE','DISAGREE')"/>

        <!-- One reaction per evaluation -->
        <addUniqueConstraint
            tableName="evaluation_reactions"
            columnNames="evaluation_id"
            constraintName="uq_reaction_evaluation"/>

        <addForeignKeyConstraint
            baseTableName="evaluation_reactions" baseColumnNames="evaluation_id"
            referencedTableName="evaluations" referencedColumnNames="id"
            constraintName="fk_reactions_evaluation" onDelete="CASCADE"/>

        <!-- Files attached to evaluations (supporting documents) -->
        <createTable tableName="evaluation_files">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="evaluation_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="uploaded_by" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- Sanitized filename shown to user -->
            <column name="original_name" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <!-- UUID-based path on disk to prevent IDOR -->
            <column name="storage_path" type="VARCHAR(500)">
                <constraints nullable="false" unique="true"/>
            </column>
            <column name="mime_type" type="VARCHAR(100)">
                <constraints nullable="false"/>
            </column>
            <column name="file_size" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="uploaded_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addForeignKeyConstraint
            baseTableName="evaluation_files" baseColumnNames="evaluation_id"
            referencedTableName="evaluations" referencedColumnNames="id"
            constraintName="fk_files_evaluation" onDelete="CASCADE"/>

        <createIndex tableName="evaluation_files" indexName="idx_files_evaluation_id">
            <column name="evaluation_id"/>
        </createIndex>

        <rollback>
            <dropTable tableName="evaluation_files"/>
            <dropTable tableName="evaluation_reactions"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: Add includes to master changelog**

```xml
<include file="db/changelog/m3/016-create-evaluation-scores.xml"/>
<include file="db/changelog/m3/017-create-reactions-files.xml"/>
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/changelog/m3/016-create-evaluation-scores.xml \
        backend/src/main/resources/db/changelog/m3/017-create-reactions-files.xml \
        backend/src/main/resources/db/changelog/db.changelog-master.xml
git commit -m "feat(db): add evaluation_scores, reactions, and files tables"
```

---

### Task 3: Appeals + notifications tables

**Files:**
- Create: `backend/src/main/resources/db/changelog/m3/018-create-appeals.xml`
- Create: `backend/src/main/resources/db/changelog/m3/019-create-notifications.xml`

- [ ] **Step 1: Create appeals migration**

`backend/src/main/resources/db/changelog/m3/018-create-appeals.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="018-create-appeals" author="gfh">
        <createTable tableName="appeals">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="evaluation_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="appellant_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="reason" type="TEXT">
                <constraints nullable="false"/>
            </column>
            <!-- PENDING | UPHELD | OVERTURNED | AUTO_AGREED -->
            <column name="status" type="VARCHAR(15)" defaultValue="PENDING">
                <constraints nullable="false"/>
            </column>
            <!-- Evaluator's response -->
            <column name="response" type="TEXT"/>
            <column name="responded_by" type="BIGINT"/>
            <!-- Deadline set by system_settings.appeal_deadline_days -->
            <column name="deadline" type="TIMESTAMP">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="resolved_at" type="TIMESTAMP"/>
        </createTable>

        <addCheckConstraint
            tableName="appeals"
            constraintName="chk_appeal_status"
            checkCondition="status IN ('PENDING','UPHELD','OVERTURNED','AUTO_AGREED')"/>

        <!-- One appeal per evaluation -->
        <addUniqueConstraint
            tableName="appeals"
            columnNames="evaluation_id"
            constraintName="uq_appeal_evaluation"/>

        <addForeignKeyConstraint
            baseTableName="appeals" baseColumnNames="evaluation_id"
            referencedTableName="evaluations" referencedColumnNames="id"
            constraintName="fk_appeals_evaluation" onDelete="RESTRICT"/>

        <createIndex tableName="appeals" indexName="idx_appeals_status">
            <column name="status"/>
        </createIndex>
        <createIndex tableName="appeals" indexName="idx_appeals_deadline">
            <column name="deadline"/>
        </createIndex>

        <rollback><dropTable tableName="appeals"/></rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Create notifications migration**

`backend/src/main/resources/db/changelog/m3/019-create-notifications.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="019-create-notifications" author="gfh">
        <createTable tableName="notifications">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="user_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- Event type: NEW_EVALUATION, APPEAL_FILED, APPEAL_RESOLVED, REMINDER, etc. -->
            <column name="type" type="VARCHAR(50)">
                <constraints nullable="false"/>
            </column>
            <column name="title_ru" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="title_kg" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="body_ru" type="TEXT"/>
            <column name="body_kg" type="TEXT"/>
            <!-- Optional link to related entity -->
            <column name="entity_type" type="VARCHAR(50)"/>
            <column name="entity_id" type="BIGINT"/>
            <column name="is_read" type="BOOLEAN" defaultValueBoolean="false">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addForeignKeyConstraint
            baseTableName="notifications" baseColumnNames="user_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_notifications_user" onDelete="CASCADE"/>

        <createIndex tableName="notifications" indexName="idx_notifications_user_unread">
            <column name="user_id"/>
            <column name="is_read"/>
        </createIndex>
        <createIndex tableName="notifications" indexName="idx_notifications_created_at">
            <column name="created_at"/>
        </createIndex>

        <rollback><dropTable tableName="notifications"/></rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: Add includes to master changelog**

```xml
<include file="db/changelog/m3/018-create-appeals.xml"/>
<include file="db/changelog/m3/019-create-notifications.xml"/>
```

- [ ] **Step 4: Run full migration and verify**

```bash
docker compose up -d postgres
sleep 5
cd backend && mvn liquibase:update \
  -Dliquibase.url=jdbc:postgresql://localhost:5432/gfh \
  -Dliquibase.username=${DB_USER} -Dliquibase.password=${DB_PASSWORD}
```

Expected: changesets 014–019 applied successfully (6 new changesets).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/changelog/m3/018-create-appeals.xml \
        backend/src/main/resources/db/changelog/m3/019-create-notifications.xml \
        backend/src/main/resources/db/changelog/db.changelog-master.xml
git commit -m "feat(db): add appeals (with deadline + status FSM) and notifications tables"
```
