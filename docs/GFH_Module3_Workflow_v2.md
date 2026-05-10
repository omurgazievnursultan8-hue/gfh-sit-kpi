# Система оценки эффективности сотрудников ГФХ
### Промпт-пакет для AI-разработчика | v4.0

> **Правило:** этот файл передаётся AI-разработчику **вместе с файлом `GFH_Part1_General.md`** как контекст. Без Части I модуль не является самодостаточным.

---

## МОДУЛЬ 3 — Workflow оценки, апелляции и уведомления

**Предусловие:** Модули 1 и 2 реализованы
**Стек:** Spring Boot + Quartz Scheduler + WebSocket (STOMP) + React.js

---

### Задача
Реализуй полный жизненный цикл цикла оценки: автозапуск, выставление оценок (включая антибонусы), реакция сотрудника, апелляции, утверждение, автоматические антибонусы, уведомления и планировщик.

---

### Требования

#### Уведомления
- **Только in-app** уведомления (без Email и SMS)
- Доставка через **WebSocket** (STOMP over SockJS) — реальное время
- JWT-авторизация в WebSocket handshake (через cookie)
- Счётчик непрочитанных в шапке, обновляется в реальном времени
- Таблица `notifications` — персональная лента

#### Автозапуск циклов
- Квартальный, полугодовой, годовой — по календарному расписанию
- Месячный — в первый рабочий день каждого месяца (по `production_calendar`)
- При старте цикла: для каждого активного сотрудника вызывается `resolveEvaluator`, создаются записи в `evaluations`
- Сотрудники без оценщика и без подчинённых → статус `UNEVALUABLE`, ADMIN уведомляется
- **Параллельные периоды разных типов допустимы** (одновременно может быть активен MONTHLY + QUARTERLY)
- Задачи на оценку группируются по типу периода в UI

#### Перевод сотрудника в ходе активного периода
- При переводе сотрудника (`unit_id` / `manager_id` меняется) в ходе активного периода:
  - Уже выставленные оценки сохраняются
  - Незавершённая оценка переназначается новому руководителю
  - `resolveEvaluator` перевычисляется для данного периода
  - Факт переназначения фиксируется в `audit_log`

#### Увольнение в ходе активного периода
- При деактивации сотрудника (`is_active=false`):
  - Текущий цикл оценки завершается (статус `CLOSED`)
  - Результат фиксируется с текущими данными
  - Новые циклы для уволенного не создаются

#### Выставление оценок
- Руководитель видит все применимые критерии подчинённого, разделённые на секции «Положительные» и «Антибонусы»
- По каждому критерию: `score` (0–100) + комментарий + файл (опционально)
- **Комментарий обязателен** если `score < comment_required_below_score` (порог из `system_settings`)
- До дедлайна оценку можно редактировать; каждое изменение `score` фиксируется в `evaluation_score_history`
- После дедлайна — редактирование заблокировано
- **Автосейв черновика:** фронт сохраняет незавершённую форму в `localStorage` каждые 30 секунд (draft по ключу `evaluation_draft_{evaluationId}`)
- **Прогресс на дашборде руководителя:** «X из N оценено» + прогресс-бар, отдельно по типам периодов
- **Видимость:** сотрудник видит только свои оценки; оценки коллег недоступны
- **Имя оценщика** видно сотруднику (прозрачность)
- Загрузка файлов: до **5 файлов** на один критерий, до **10 МБ** каждый
- Разрешённые типы: `PDF`, `.docx`, `.xlsx`, `jpg`, `png`
- Обязательная проверка файлов: magic bytes + MIME + санитация имён
- Хранение файлов: локальная файловая система сервера (вне веб-корня)

#### Пересчёт рейтинга
- После каждой сохранённой оценки: `RatingService.calculateRating(evaluateeId, periodId)` вызывается **в реальном времени**
- `final_rating` обновляется немедленно — на дашборде видно актуальное значение

#### Автоматические антибонусы и автооценка
- Если руководитель не выставил оценки до дедлайна: `auto_score_default` по всем положительным критериям + авто-антибонус всем руководителям вверх по иерархии (`AutoAntiBonusService`)
- Если сотрудник не отреагировал в срок: автоматически `AGREE` по всем критериям + авто-антибонус сотруднику
- Всё фиксируется в `audit_log` с пометкой `AUTO`

#### Реакция сотрудника
- `AGREE` / `DISAGREE` по каждому критерию отдельно (включая антибонусы)
- При `DISAGREE`: обоснование + файлы-доказательства
- После реакции по всем критериям → статус `RESPONDED`
- **Срок подачи апелляции:** фиксированный срок в рабочих днях из `system_settings` (`appeal_deadline_days`) после получения оценки

#### Утверждение и апелляции
- Руководитель отправляет на утверждение после реакции всех подчинённых (или истечения срока реакции)
- Вышестоящий видит: оценки (обычные и антибонусы), комментарии, апелляции, доказательства
- Решение: `UPHELD` / `OVERTURNED` (при OVERTURNED — новый score + комментарий)
- Решение окончательное, повторная апелляция невозможна
- Если оценщик = Председатель — у сотрудника нет кнопки «оспорить», только комментарий без последствий
- Апелляция на автоматический антибонус рассматривается руководителем уровнем выше «виновника»

#### Принудительное закрытие периода
- ADMIN может принудительно закрыть период с незавершёнными оценками
- Перед закрытием: UI показывает предупреждение с количеством незавершённых оценок
- ADMIN должен подтвердить действие (диалог с двойным подтверждением)
- После подтверждения: незавершённые оценки сохраняются как есть, период переходит в `CLOSED`
- Факт принудительного закрытия + имя ADMIN + количество незавершённых оценок → `audit_log`

#### Пересчёт рейтингов после закрытия периода
- При переходе в `CLOSED`: `RatingService.calculateAllRatings(periodId)` в порядке топологической сортировки снизу вверх
- Финальная аналитика обновляется

---

### Схема БД

```sql
evaluation_periods (
  id, type ENUM('MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL'),
  start_date, deadline, status, dry_run BOOLEAN DEFAULT FALSE,
  created_at, closed_at, closed_by BIGINT REFERENCES users(id),
  force_closed BOOLEAN DEFAULT FALSE
)

evaluations (
  id, period_id, evaluator_id, evaluatee_id,
  status ENUM('PENDING','IN_PROGRESS','RESPONDED','APPROVED','CLOSED','UNEVALUABLE'),
  final_rating DECIMAL(6,2),
  own_criteria_rating DECIMAL(5,2),
  avg_subordinate_rating DECIMAL(5,2),
  anti_bonus_penalty DECIMAL(5,2),
  submitted_at, approved_at, approved_by,
  version BIGINT NOT NULL DEFAULT 0  -- для optimistic locking
)

evaluation_scores (
  id, evaluation_id, criteria_id, score DECIMAL(5,2),
  comment VARCHAR(2000), file_id, is_auto BOOLEAN DEFAULT FALSE,
  created_at, updated_at,
  version BIGINT NOT NULL DEFAULT 0
)

evaluation_score_history (
  id, evaluation_score_id, old_score, new_score,
  changed_by, changed_at, reason
)

employee_reactions (
  id, evaluation_id, criteria_id,
  reaction ENUM('AGREE','DISAGREE'), justification,
  is_auto BOOLEAN DEFAULT FALSE, created_at
)

reaction_files (id, reaction_id, file_id, created_at)

files (
  id, uuid, original_name, stored_path,
  mime_type, size_bytes, uploaded_by, uploaded_at
)

file_access_log (
  id, file_id, accessed_by, accessed_at, ip_address, action
)

appeals (
  id, evaluation_id, criteria_id,
  decision ENUM('UPHELD','OVERTURNED'), new_score,
  reviewer_comment, reviewed_by, reviewed_at
)

notifications (
  id, user_id, type, title_ru, title_kg,
  body_ru, body_kg, is_read, created_at
)
```

#### Индексы
```sql
-- evaluation_periods
CREATE INDEX idx_periods_status ON evaluation_periods(status);
CREATE INDEX idx_periods_type_status ON evaluation_periods(type, status);

-- evaluations
CREATE INDEX idx_evaluations_period_evaluatee ON evaluations(period_id, evaluatee_id);
CREATE INDEX idx_evaluations_evaluator_period ON evaluations(evaluator_id, period_id);
CREATE INDEX idx_evaluations_status ON evaluations(status);

-- evaluation_scores
CREATE INDEX idx_eval_scores_evaluation_id ON evaluation_scores(evaluation_id, criteria_id);
CREATE INDEX idx_eval_scores_criteria_id ON evaluation_scores(criteria_id);

-- evaluation_score_history
CREATE INDEX idx_score_history_score_id ON evaluation_score_history(evaluation_score_id);

-- notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- files
CREATE UNIQUE INDEX idx_files_uuid ON files(uuid);

-- appeals
CREATE INDEX idx_appeals_evaluation_id ON appeals(evaluation_id);
```

---

### Планировщик задач (Quartz, timezone: Asia/Bishkek)

| Задача | Расписание |
|---|---|
| Автосоздание периодов `MONTHLY` | Первый рабочий день месяца в 00:05 |
| Автосоздание периодов `QUARTERLY` | Первый рабочий день квартала |
| Автосоздание периодов `SEMI_ANNUAL` | Первый рабочий день полугодия |
| Автосоздание периодов `ANNUAL` | Первый рабочий день года |
| Напоминание за 1 день до дедлайна | Ежедневно в 08:00 |
| Напоминание за 1 час до дедлайна | Ежечасно |
| Автооценка + авто-антибонус руководителю | Сразу после дедлайна |
| Проверка срока реакции сотрудника | Ежедневно в 09:00 (учёт `production_calendar`) |
| Пересчёт рейтингов | В момент перехода периода в `CLOSED` |

#### `dry_run` режим
- Период с `dry_run=true` создаёт записи в `evaluations`, но не отправляет уведомления и не применяет авто-антибонусы
- Используется для тестирования расписания и логики без последствий
- В `audit_log` помечается как `DRY_RUN`

---

### API endpoints

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/api/v1/periods?type=&status=&page=0&size=20` | Список периодов |
| POST | `/api/v1/periods` | Создать период (ADMIN) |
| PUT | `/api/v1/periods/{id}/close` | Принудительное закрытие (ADMIN, с подтверждением) |
| GET | `/api/v1/evaluations/my?periodType=` | Мои оценки (как оцениваемого) |
| GET | `/api/v1/evaluations/to-do` | Кого мне нужно оценить (группировка по типу периода) |
| POST | `/api/v1/evaluations/{id}/scores` | Выставить оценки |
| PUT | `/api/v1/evaluations/{id}/scores` | Редактировать (до дедлайна) |
| POST | `/api/v1/evaluations/{id}/submit` | Отправить на утверждение |
| GET | `/api/v1/evaluations/{id}/score-history` | История изменений score (ADMIN, CHAIRMAN) |
| POST | `/api/v1/reactions/{evaluationId}` | Реакция сотрудника |
| POST | `/api/v1/appeals/{evaluationId}/{criteriaId}/decide` | Решение по апелляции |
| GET | `/api/v1/notifications?page=0&size=20` | Мои уведомления |
| PUT | `/api/v1/notifications/{id}/read` | Отметить прочитанным |
| PUT | `/api/v1/notifications/read-all` | Отметить все прочитанными |
| POST | `/api/v1/files/upload` | Загрузка файла |
| GET | `/api/v1/files/{id}` | Скачать файл (с проверкой прав) |

#### WebSocket endpoint
```
ws://host/ws/notifications
STOMP subscribe: /user/queue/notifications
STOMP subscribe: /user/queue/notification-count
```

---

### Ожидаемый результат
- Spring Boot: `EvaluationService`, `AppealService`, `NotificationService`, `SchedulerService`, `FileService`, `AutoAntiBonusService`
- `@Version` (optimistic locking) на `evaluations` и `evaluation_scores`
- `EvaluationService.reassignEvaluator(evaluationId, newEvaluatorId)` — для переназначения при переводе
- Quartz-джобы с явной привязкой к `Asia/Bishkek`
- WebSocket (STOMP over SockJS) + авторизация через httpOnly cookie
- Загрузка файлов: multipart/form-data, локальное хранилище вне веб-корня
- `FileService`: magic bytes, MIME, санитация имён, лимит 10 МБ, разрешённые типы
- `dry_run` режим периодов полностью реализован
- Поддержка принудительного закрытия с двойным подтверждением на фронте
- React.js (Vite + Redux Toolkit + React Router v6 + Tailwind + shadcn/ui):
  - Форма оценок с разделением «Положительные» / «Антибонусы»
  - **Автосейв черновика** в localStorage каждые 30 сек
  - Прогресс-бар «X из N оценено» на дашборде руководителя
  - Страница реакции сотрудника (оба раздела видны)
  - Страница апелляций (включая антибонусы)
  - Центр уведомлений с реальным временем (WebSocket)
  - Счётчик непрочитанных в шапке
  - Страница «Кого оценить» — сгруппированная по типам периодов
- Unit-тесты: автооценка, авто-антибонус, переназначение при переводе, dry_run
- Интеграционные тесты (Testcontainers): полный цикл оценки, апелляция, принудительное закрытие

---
