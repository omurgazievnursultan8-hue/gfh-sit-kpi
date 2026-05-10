# Система оценки эффективности сотрудников ГФХ
### Промпт-пакет для AI-разработчика | v4.0

> **Правило:** этот файл передаётся AI-разработчику **вместе с файлом `GFH_Part1_General.md`** как контекст. Без Части I модуль не является самодостаточным.

---

## МОДУЛЬ 2 — Критерии оценки, антибонусы и расчёт рейтинга

**Предусловие:** Модуль 1 реализован
**Стек:** Spring Boot + React.js + PostgreSQL + Spring Cache (Caffeine)

---

### Задача
Реализуй гибкую систему критериев оценки с поддержкой антибонусов, динамическими весами и движок расчёта итогового рейтинга с каскадным обновлением по иерархии.

---

### Требования

#### Создание критериев
- Критерий создаётся с указанием `scope`, `scope_entity_id` и флага `is_penalty`
- Антибонус можно создать для любого scope (`GLOBAL` / `BLOCK` / `DEPARTMENT` / `UNIT` / `INDIVIDUAL`)
- Руководитель может создавать критерии только в рамках своего уровня иерархии
- Критерии (и положительные, и антибонусы) наследуются вниз по иерархии
- При создании антибонуса в UI отображается текущий суммарный анти-вес для затрагиваемых сотрудников (информационно, без ограничения)
- Одни и те же критерии используются для всех типов периодов (`MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL`)

#### Заморозка `is_penalty`
- Как только в `evaluation_scores` появляется хотя бы одна запись по критерию — `flag_frozen` выставляется в `true` (через сервисный слой или триггер)
- При попытке изменить `is_penalty` на критерии с `flag_frozen=true` — API возвращает ошибку
- Поля `name_ru`, `name_kg`, `description_ru`, `description_kg`, `weight` можно редактировать после заморозки (с записью в `audit_log`); `is_penalty` — нельзя

#### Удаление и деактивация
- Критерий без истории (`flag_frozen=false`) можно удалить физически
- Критерий с историей (`flag_frozen=true`) можно только деактивировать (`is_active=false`)
- **Реактивация:** деактивированный критерий может быть повторно активирован ADMIN-ом
- Деактивированный критерий не применяется в новых периодах, но виден в истории и аналитике

#### Валидация весов
- Сумма весов **положительных** критериев (`is_penalty=false`) для конкретного сотрудника должна строго равняться 100%
- Веса антибонусов (`is_penalty=true`) в сумму не входят, ограничений нет
- При несоответствии суммы положительных — API возвращает ошибку с текущей суммой и разницей
- Фронт отображает визуальный индикатор (зелёный при 100%, красный при отклонении)

#### Изменение веса в ходе активного периода
- Изменение `weight` у критерия во время активного периода **немедленно** пересчитывает рейтинги всех затронутых сотрудников
- Пересчёт инициируется через `RatingService.recalculateAffected(criteriaId)`
- Все изменения весов фиксируются в `audit_log`

---

### Формулы расчёта рейтинга (раздел 4.5 GFH_Part1_General.md)

#### Обычный сотрудник
```
own_criteria_rating = Σ (score_i × weight_i / 100)
anti_bonus_penalty  = Σ (score_j × weight_j / 100)
final_rating        = MAX(0, own_criteria_rating - anti_bonus_penalty)
```

#### Руководитель
```
final_rating = MAX(0, own_criteria_rating × W1 + avg_subordinate_rating × W2 - anti_bonus_penalty)
```
- `W1`, `W2` — веса из `system_settings` (`manager_own_weight`, `manager_subordinate_weight`)
- `W1 + W2 = 1`
- `avg_subordinate_rating` — среднее `final_rating` всех прямых подчинённых за данный период

#### Председатель
```
final_rating = MAX(0, avg_subordinate_rating - anti_bonus_penalty)
```

#### MANAGER без подчинённых (новый отдел)
```
final_rating = MAX(0, own_criteria_rating - anti_bonus_penalty)
```
Оценивается как обычный сотрудник — `avg_subordinate` не участвует.

#### Общее правило
- `final_rating` не может быть отрицательным: `MAX(0, ...)`
- Пересчёт рейтинга выполняется **в реальном времени** после каждой выставленной оценки (не только при закрытии периода)
- Уволенные сотрудники включаются в `avg_subordinate` только за периоды, где они были активны

---

### Автоматические антибонусы
- `AutoAntiBonusService.applyForMissedEvaluation(managerUserId, periodId)` — создаёт авто-антибонусы руководителю и всем вверх по иерархии
- `AutoAntiBonusService.applyForMissedReaction(userId, periodId)` — создаёт авто-антибонус сотруднику
- Автоматический антибонус = системный критерий: `is_penalty=true`, `is_system=true`, `scope=INDIVIDUAL`, вес из `system_settings`
- Автозапись в `evaluation_scores` со `score=100`, `is_auto=true`

---

### История изменений оценки

Каждое изменение `score` по критерию (до дедлайна) фиксируется в отдельной таблице:

```sql
evaluation_score_history (
  id, evaluation_score_id, old_score, new_score,
  changed_by, changed_at, reason
)
```

- История доступна ADMIN и CHAIRMAN в детальном просмотре оценки
- Первичная запись (создание) тоже фиксируется (old_score = NULL)

---

### Настройки системы

ADMIN управляет всеми ключами через UI. Ключи `system_settings`:

| Ключ | Описание |
|---|---|
| `manager_own_weight` | Вес собственной оценки руководителя (W1) |
| `manager_subordinate_weight` | Вес среднего подчинённых (W2) |
| `auto_score_default` | Балл при автооценке (пропуск дедлайна) |
| `auto_anti_bonus_weight` | Вес автоматического антибонуса |
| `appeal_deadline_days` | Срок подачи апелляции (рабочих дней) |
| `password_expiry_days` | Срок действия пароля (по умолчанию 90) |
| `session_idle_timeout_minutes` | Таймаут бездействия |
| `comment_required_below_score` | Порог score, ниже которого комментарий обязателен |
| `rating_color_red_threshold` | Верхняя граница красной зоны рейтинга |
| `rating_color_yellow_threshold` | Верхняя граница жёлтой зоны рейтинга |

---

### Схема БД

```sql
criteria (
  id, name_ru, name_kg, description_ru, description_kg,
  scope ENUM('GLOBAL','BLOCK','DEPARTMENT','UNIT','INDIVIDUAL'),
  scope_entity_id, weight DECIMAL(5,2),
  is_penalty BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  flag_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_by, created_at, updated_at
)

system_settings (
  id, key VARCHAR UNIQUE, value VARCHAR,
  description_ru, description_kg, updated_by, updated_at
)

production_calendar (
  id, date DATE UNIQUE, is_working_day BOOLEAN,
  description_ru, description_kg, created_by, created_at
)

evaluation_score_history (
  id, evaluation_score_id BIGINT NOT NULL REFERENCES evaluation_scores(id),
  old_score DECIMAL(5,2), new_score DECIMAL(5,2) NOT NULL,
  changed_by BIGINT NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason VARCHAR(500)
)
```

#### Индексы
```sql
CREATE INDEX idx_criteria_scope ON criteria(scope, scope_entity_id);
CREATE INDEX idx_criteria_is_active ON criteria(is_active);
CREATE INDEX idx_criteria_is_penalty ON criteria(is_penalty);
CREATE INDEX idx_score_history_score_id ON evaluation_score_history(evaluation_score_id);
CREATE INDEX idx_production_calendar_date ON production_calendar(date);
```

---

### Кеширование (Spring Cache + Caffeine)

| Кеш | Ключ | TTL | Инвалидация |
|---|---|---|---|
| `applicableCriteria` | `userId` | 5 мин | При изменении criteria / org_units |
| `systemSettings` | — | 10 мин | При PUT `/api/v1/settings/{key}` |
| `productionCalendar` | год | 1 час | При изменении calendar |

---

### API endpoints

| Метод | Endpoint | Доступ |
|---|---|---|
| GET | `/api/v1/criteria?scope=&is_penalty=&page=0&size=20` | Все авторизованные (в пределах прав) |
| GET | `/api/v1/criteria/applicable?userId={id}` | Руководители, ADMIN |
| GET | `/api/v1/criteria/anti-bonus-weight?userId={id}` | Руководители, ADMIN |
| POST | `/api/v1/criteria` | По scope |
| PUT | `/api/v1/criteria/{id}` | Создатель / ADMIN |
| DELETE | `/api/v1/criteria/{id}` | Создатель / ADMIN (только если `flag_frozen=false`) |
| PUT | `/api/v1/criteria/{id}/deactivate` | Создатель / ADMIN |
| PUT | `/api/v1/criteria/{id}/activate` | ADMIN (реактивация) |
| GET | `/api/v1/settings` | ADMIN |
| PUT | `/api/v1/settings/{key}` | ADMIN |
| GET | `/api/v1/calendar` | Авторизованные |
| POST | `/api/v1/calendar` | ADMIN |
| DELETE | `/api/v1/calendar/{date}` | ADMIN |

---

### Ожидаемый результат
- JPA-сущности: `Criteria`, `SystemSetting`, `ProductionCalendar`, `EvaluationScoreHistory`
- Сервисы:
  - `CriteriaService` — с полной логикой заморозки, наследования, валидации весов
  - `RatingService` — расчёт по всем формулам, пересчёт в реальном времени, `MAX(0, ...)`, поддержка MANAGER без подчинённых
  - `AutoAntiBonusService` — автоматические антибонусы
  - `RatingService.recalculateAffected(criteriaId)` — пересчёт при изменении веса в ходе периода
- Spring Cache + Caffeine: кеши для `applicableCriteria` и `systemSettings`
- Механизм заморозки `is_penalty` (через сервисный слой)
- Таблица `evaluation_score_history` с записью каждого изменения `score`
- REST API с Bean Validation, формат ошибок `{ code, message_ru, message_kg, details }`, пагинация
- Unit-тесты на формулы рейтинга:
  - Обычный сотрудник без антибонусов
  - Обычный сотрудник с антибонусами (проверка `MAX(0, ...)`)
  - Руководитель с подчинёнными (W1+W2)
  - Председатель (только avg подчинённых)
  - MANAGER без подчинённых (как EMPLOYEE)
  - Пример из раздела 4.6
  - Пересчёт при изменении веса критерия в ходе периода
- Интеграционные тесты (Testcontainers): валидация весов, заморозка, реактивация
- React.js:
  - Страница управления критериями с переключателем «Положительные / Антибонусы»
  - Визуальный индикатор суммы положительных весов
  - Информационный блок «Суммарный анти-вес» при создании антибонуса
  - Страница системных настроек
  - Страница производственного календаря

---
