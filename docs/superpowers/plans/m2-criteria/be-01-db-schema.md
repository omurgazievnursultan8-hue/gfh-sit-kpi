# M2-BE-01: DB Schema — Criteria, System Settings, Production Calendar, Score History

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all M2 database tables via Liquibase: `criteria`, `system_settings`, `production_calendar`, and `evaluation_score_history`. These tables support the criteria/rating engine.

**Architecture:** Liquibase XML changelogs in sequential order (010–013). `criteria` is self-referencing (positive/anti-bonus, scoped to org_unit or global). `system_settings` is a simple key-value store. `production_calendar` stores working-day counts per month. `evaluation_score_history` stores per-criteria score snapshots per evaluation.

**Tech Stack:** PostgreSQL 15, Liquibase XML.

**Depends on:** m1-auth/be-06-infra-setup.md (all M1 tables + Liquibase master)

---

### Task 1: Criteria table

**Files:**
- Create: `backend/src/main/resources/db/changelog/m2/010-create-criteria.xml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

- [ ] **Step 1: Create criteria migration**

`backend/src/main/resources/db/changelog/m2/010-create-criteria.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="010-create-criteria" author="gfh">
        <createTable tableName="criteria">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="name_ru" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="name_kg" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <!-- POSITIVE or ANTI_BONUS -->
            <column name="type" type="VARCHAR(20)">
                <constraints nullable="false"/>
            </column>
            <!-- Weight in percentage (0.00–100.00) -->
            <column name="weight" type="NUMERIC(5,2)">
                <constraints nullable="false"/>
            </column>
            <!-- null = global (applies to all org units) -->
            <column name="org_unit_id" type="BIGINT"/>
            <!-- For ANTI_BONUS: auto-populated from production calendar -->
            <column name="is_auto_calculated" type="BOOLEAN" defaultValueBoolean="false">
                <constraints nullable="false"/>
            </column>
            <!-- Once scores exist, is_penalty criteria cannot change weight -->
            <column name="is_frozen" type="BOOLEAN" defaultValueBoolean="false">
                <constraints nullable="false"/>
            </column>
            <column name="is_active" type="BOOLEAN" defaultValueBoolean="true">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="updated_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addCheckConstraint
            tableName="criteria"
            constraintName="chk_criteria_type"
            checkCondition="type IN ('POSITIVE', 'ANTI_BONUS')"/>

        <addCheckConstraint
            tableName="criteria"
            constraintName="chk_criteria_weight_range"
            checkCondition="weight >= 0 AND weight &lt;= 100"/>

        <addForeignKeyConstraint
            baseTableName="criteria"
            baseColumnNames="org_unit_id"
            referencedTableName="org_units"
            referencedColumnNames="id"
            constraintName="fk_criteria_org_unit"
            onDelete="SET NULL"/>

        <createIndex tableName="criteria" indexName="idx_criteria_org_unit_id">
            <column name="org_unit_id"/>
        </createIndex>
        <createIndex tableName="criteria" indexName="idx_criteria_type_active">
            <column name="type"/>
            <column name="is_active"/>
        </createIndex>

        <rollback>
            <dropTable tableName="criteria"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Add include to master changelog**

In `backend/src/main/resources/db/changelog/db.changelog-master.xml`, add:
```xml
<include file="db/changelog/m2/010-create-criteria.xml"/>
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/changelog/m2/010-create-criteria.xml \
        backend/src/main/resources/db/changelog/db.changelog-master.xml
git commit -m "feat(db): add criteria table with type/weight/scope/freeze support"
```

---

### Task 2: System settings + production calendar tables

**Files:**
- Create: `backend/src/main/resources/db/changelog/m2/011-create-system-settings.xml`
- Create: `backend/src/main/resources/db/changelog/m2/012-create-production-calendar.xml`

- [ ] **Step 1: Create system_settings migration**

`backend/src/main/resources/db/changelog/m2/011-create-system-settings.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="011-create-system-settings" author="gfh">
        <createTable tableName="system_settings">
            <column name="key" type="VARCHAR(100)">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="value" type="VARCHAR(500)">
                <constraints nullable="false"/>
            </column>
            <column name="description" type="TEXT"/>
            <column name="updated_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <!-- Seed default values -->
        <insert tableName="system_settings">
            <column name="key" value="idle_timeout_minutes"/>
            <column name="value" value="30"/>
            <column name="description" value="Idle timeout in minutes before auto-logout"/>
        </insert>
        <insert tableName="system_settings">
            <column name="key" value="password_expiry_days"/>
            <column name="value" value="90"/>
            <column name="description" value="Number of days before password expires"/>
        </insert>
        <insert tableName="system_settings">
            <column name="key" value="evaluation_period_days"/>
            <column name="value" value="30"/>
            <column name="description" value="Default evaluation period length in days"/>
        </insert>
        <insert tableName="system_settings">
            <column name="key" value="appeal_deadline_days"/>
            <column name="value" value="3"/>
            <column name="description" value="Days employee has to file an appeal after evaluation"/>
        </insert>
        <insert tableName="system_settings">
            <column name="key" value="auto_agree_timeout_hours"/>
            <column name="value" value="72"/>
            <column name="description" value="Hours before unanswered appeal is auto-agreed"/>
        </insert>
        <insert tableName="system_settings">
            <column name="key" value="pdpa_version"/>
            <column name="value" value="1.0"/>
            <column name="description" value="Current PDPA consent version"/>
        </insert>

        <rollback>
            <dropTable tableName="system_settings"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Create production_calendar migration**

`backend/src/main/resources/db/changelog/m2/012-create-production-calendar.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="012-create-production-calendar" author="gfh">
        <createTable tableName="production_calendar">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="year" type="INTEGER">
                <constraints nullable="false"/>
            </column>
            <column name="month" type="INTEGER">
                <constraints nullable="false"/>
            </column>
            <!-- Number of working days in the month -->
            <column name="working_days" type="INTEGER">
                <constraints nullable="false"/>
            </column>
            <column name="created_by" type="BIGINT"/>
            <column name="updated_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addCheckConstraint
            tableName="production_calendar"
            constraintName="chk_calendar_month_range"
            checkCondition="month &gt;= 1 AND month &lt;= 12"/>

        <addCheckConstraint
            tableName="production_calendar"
            constraintName="chk_calendar_working_days"
            checkCondition="working_days &gt;= 0 AND working_days &lt;= 31"/>

        <addUniqueConstraint
            tableName="production_calendar"
            columnNames="year, month"
            constraintName="uq_production_calendar_year_month"/>

        <createIndex tableName="production_calendar" indexName="idx_calendar_year_month">
            <column name="year"/>
            <column name="month"/>
        </createIndex>

        <rollback>
            <dropTable tableName="production_calendar"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: Add includes to master changelog**

```xml
<include file="db/changelog/m2/011-create-system-settings.xml"/>
<include file="db/changelog/m2/012-create-production-calendar.xml"/>
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/changelog/m2/
git commit -m "feat(db): add system_settings (with defaults) and production_calendar tables"
```

---

### Task 3: Evaluation score history table

**Files:**
- Create: `backend/src/main/resources/db/changelog/m2/013-create-score-history.xml`

- [ ] **Step 1: Create score history migration**

`backend/src/main/resources/db/changelog/m2/013-create-score-history.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="013-create-score-history" author="gfh">
        <!--
            Stores a snapshot of each criteria score at the time of evaluation submission.
            Kept separately from evaluations to support historical analytics and recalculation tracking.
        -->
        <createTable tableName="evaluation_score_history">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="evaluation_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="criteria_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <!-- Raw value entered or auto-calculated -->
            <column name="raw_value" type="NUMERIC(10,4)">
                <constraints nullable="false"/>
            </column>
            <!-- Weighted contribution to final score -->
            <column name="weighted_value" type="NUMERIC(10,4)">
                <constraints nullable="false"/>
            </column>
            <!-- Snapshot of weight at time of scoring (criteria weight may change later) -->
            <column name="weight_snapshot" type="NUMERIC(5,2)">
                <constraints nullable="false"/>
            </column>
            <column name="recorded_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <!-- FK to evaluations will be added in M3 when that table exists -->

        <addForeignKeyConstraint
            baseTableName="evaluation_score_history"
            baseColumnNames="criteria_id"
            referencedTableName="criteria"
            referencedColumnNames="id"
            constraintName="fk_score_history_criteria"
            onDelete="RESTRICT"/>

        <createIndex tableName="evaluation_score_history" indexName="idx_score_history_evaluation_id">
            <column name="evaluation_id"/>
        </createIndex>

        <rollback>
            <dropTable tableName="evaluation_score_history"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Add include to master changelog**

```xml
<include file="db/changelog/m2/013-create-score-history.xml"/>
```

- [ ] **Step 3: Run migration to verify**

```bash
cd backend && mvn liquibase:update -Dliquibase.url=jdbc:postgresql://localhost:5432/gfh \
  -Dliquibase.username=${DB_USER} -Dliquibase.password=${DB_PASSWORD}
```

Expected: All 4 M2 changesets apply cleanly.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/changelog/m2/013-create-score-history.xml \
        backend/src/main/resources/db/changelog/db.changelog-master.xml
git commit -m "feat(db): add evaluation_score_history table with weight snapshot for historical analytics"
```
