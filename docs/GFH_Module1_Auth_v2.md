# Система оценки эффективности сотрудников ГФХ
### Промпт-пакет для AI-разработчика | v4.0

> **Правило:** этот файл передаётся AI-разработчику **вместе с файлом `GFH_Part1_General.md`** как контекст. Без Части I модуль не является самодостаточным.

---

## МОДУЛЬ 1 — Роли, иерархия и аутентификация

**Предусловие:** нет (первый модуль)
**Стек:** Spring Boot + Spring Security + JWT (httpOnly cookie) + React.js + Vite + PostgreSQL + NGINX + Liquibase

---

### Задача
Спроектируй и реализуй систему управления пользователями, ролями, иерархией и безопасной аутентификации.

---

### Стек фронтенда (единый для всех модулей)

| Инструмент | Решение |
|---|---|
| Бандлер | Vite |
| Роутер | React Router v6 |
| UI-библиотека | Tailwind CSS + shadcn/ui |
| Графики | Recharts |
| Глобальное состояние | Redux Toolkit |
| Структура папок | Feature-based: `src/features/auth/`, `src/features/users/`, `src/features/org/` и т.д. |
| Локализация | react-i18next, файлы в `public/locales/ru/` и `public/locales/kg/` |

---

### Инфраструктура (единая для всего проекта)

| Компонент | Решение |
|---|---|
| Развёртывание | On-premise на серверах ГФХ |
| Упаковка | Docker + Docker Compose |
| Reverse proxy | NGINX (раздача статики фронта, проксирование на Spring Boot, SSL-терминация) |
| SSL | Let's Encrypt (автообновление через certbot) |
| HTTP security headers | Настраиваются в NGINX: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` |
| Миграции БД | Liquibase (XML/SQL чейнджсеты с поддержкой роллбэка) |
| CI/CD | Без автоматического CI/CD — ручная сборка: `docker build` + `docker compose up` |
| Логи | Logback в файл + ротация (по размеру и дате) |
| Мониторинг | Spring Boot Actuator: только `/actuator/health` и `/actuator/info` доступны наружу |

---

### Требования

#### Управление пользователями
- Пользователи создаются вручную ADMIN-ом (нет интеграции с AD/LDAP)
- ADMIN задаёт: ФИО, должность, email, роль, подразделение, непосредственный руководитель
- ADMIN может редактировать и деактивировать пользователей
- **Реактивация:** ADMIN может повторно активировать деактивированного пользователя
- Деактивированный пользователь: вход заблокирован, refresh tokens отозваны, исторические данные сохраняются
- Если сотрудник **увольняется во время активного периода оценки** — оценка завершается, результат фиксируется, `is_active=false`

#### Организационная структура
- Дерево: Организация → Блоки → Департаменты → Отделы → Сотрудники
- Каждая единица имеет руководителя (FK на `users`)
- ADMIN управляет структурой через UI (CRUD)
- Каждый пользователь привязан к одному подразделению
- **Валидация ациклизма:** при каждом изменении `parent_id` или `manager_id` сервисный слой проверяет отсутствие цикла обходом графа вверх

#### Роли (ENUM)
```
ADMIN, CHAIRMAN, BLOCK_HEAD, DEPARTMENT_HEAD, UNIT_HEAD, EMPLOYEE
```
- `BLOCK_HEAD`, `DEPARTMENT_HEAD`, `UNIT_HEAD` — руководители соответствующих уровней иерархии
- **MANAGER без подчинённых** (новый отдел): оценивается как обычный `EMPLOYEE` — без avg_subordinate в формуле

#### Аутентификация
- **JWT хранение:** access token в `httpOnly` cookie (`SameSite=Strict`), refresh token в отдельном `httpOnly` cookie
- **CSRF-защита:** Double Submit Cookie pattern (CSRF-токен в обычной cookie + заголовке `X-CSRF-TOKEN`)
- Access token: 15 минут; refresh token: 7 дней с ротацией
- **Автообновление:** при истечении access token — фронт автоматически вызывает `/api/v1/auth/refresh` в фоне, пользователь не замечает
- **Автовыход по бездействию:** после N минут неактивности (N настраивается в `system_settings`, ключ `session_idle_timeout_minutes`)
- Политика паролей: ≥ 10 символов, верхний/нижний регистр, цифра, спецсимвол, проверка по словарю
- **Принудительная смена пароля:** каждые 90 дней (настраивается в `system_settings`, ключ `password_expiry_days`). При входе с истёкшим паролем — редирект на страницу смены
- Хранение паролей: bcrypt (cost ≥ 12) или argon2id
- Rate limiting: 5 попыток / 15 минут с IP (Bucket4j)
- Блокировка аккаунта: после 5 неудач подряд на 30 минут
- Самостоятельный сброс пароля по email (одноразовая ссылка, 30 минут)
- Принудительный сброс ADMIN-ом
- История последних 5 паролей

#### Версионирование API
Все эндпоинты имеют префикс `/api/v1/`. Пример: `/api/v1/auth/login`.

#### Формат ошибок API (стандарт для всех модулей)
```json
{
  "code": "USER_NOT_FOUND",
  "message_ru": "Пользователь не найден",
  "message_kg": "Колдонуучу табылган жок",
  "details": { "userId": 42 }
}
```

#### Swagger UI
- Доступен всем авторизованным пользователям по адресу `/swagger-ui.html`
- На проде не отключается

#### Резолв оценщика
- `UserService.resolveEvaluator(userId, periodId)` согласно алгоритму из раздела 3.4
- Учёт активных делегирований
- **Цепочка делегирований допустима** (A→B→C): если B также делегировал — берётся конечный активный делегат
- Логирование Шагов 4–5 в `audit_log`

#### Делегирование
- ADMIN через UI создаёт делегирование: кого заменяет, на кого, с какой даты по какую, причина
- Делегат может сам делегировать полномочия дальше (цепочка A→B→C)

#### PDPA-согласие
- Показывается однократно при первом входе
- Версия согласия фиксируется в `pdpa_consents`
- При обновлении политики (новая версия) — запрашивается повторно

---

### Схема БД

```sql
users (
  id, full_name, email, password_hash, role,
  position, unit_id, manager_id, is_active,
  password_updated_at, password_history JSONB,
  created_at, updated_at
)

org_units (
  id, name_ru, name_kg, type ENUM('BLOCK','DEPARTMENT','UNIT'),
  parent_id, head_user_id, created_at
)

refresh_tokens (
  id, user_id, token_hash, issued_at, expires_at,
  used_at, revoked_at, user_agent, ip_address
)

login_attempts (
  id, email, ip_address, success, attempted_at, user_agent
)

password_reset_tokens (
  id, user_id, token_hash, issued_at, expires_at, used_at
)

evaluator_delegations (
  id, evaluatee_id, original_evaluator_id, delegated_to_id,
  valid_from, valid_to, reason,
  created_by, created_at, is_active
)

audit_log (
  id, user_id, action, entity_type, entity_id,
  old_value JSONB, new_value JSONB,
  ip_address, user_agent, timestamp
)

pdpa_consents (
  id, user_id, accepted_at, version, ip_address
)
```

#### Индексы (обязательные)
```sql
-- users
CREATE INDEX idx_users_unit_id ON users(unit_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- org_units
CREATE INDEX idx_org_units_parent_id ON org_units(parent_id);
CREATE INDEX idx_org_units_head_user_id ON org_units(head_user_id);

-- refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- login_attempts
CREATE INDEX idx_login_attempts_email_attempted ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip_attempted ON login_attempts(ip_address, attempted_at);

-- evaluator_delegations
CREATE INDEX idx_delegations_evaluatee_id ON evaluator_delegations(evaluatee_id);
CREATE INDEX idx_delegations_delegated_to ON evaluator_delegations(delegated_to_id);
CREATE INDEX idx_delegations_valid_range ON evaluator_delegations(valid_from, valid_to, is_active);

-- audit_log
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
```

> Все изменения в `users`, `org_units`, `evaluator_delegations` пишутся в `audit_log` автоматически через Spring AOP.

---

### API endpoints

| Метод | Endpoint | Доступ |
|---|---|---|
| POST | `/api/v1/auth/login` | Все |
| POST | `/api/v1/auth/refresh` | Все |
| POST | `/api/v1/auth/logout` | Авторизованные |
| POST | `/api/v1/auth/password/forgot` | Все |
| POST | `/api/v1/auth/password/reset` | Все (по токену) |
| POST | `/api/v1/auth/password/change` | Авторизованные |
| POST | `/api/v1/auth/pdpa/accept` | Авторизованные |
| GET | `/api/v1/users?page=0&size=20` | ADMIN |
| POST | `/api/v1/users` | ADMIN |
| PUT | `/api/v1/users/{id}` | ADMIN |
| PUT | `/api/v1/users/{id}/deactivate` | ADMIN (soft delete) |
| PUT | `/api/v1/users/{id}/activate` | ADMIN (реактивация) |
| POST | `/api/v1/users/{id}/reset-password` | ADMIN |
| GET | `/api/v1/org/structure` | ADMIN, CHAIRMAN |
| POST | `/api/v1/org/units` | ADMIN |
| PUT | `/api/v1/org/units/{id}` | ADMIN |
| DELETE | `/api/v1/org/units/{id}` | ADMIN |
| GET | `/api/v1/users/subordinates` | Руководители |
| GET | `/api/v1/users/{id}/evaluator` | ADMIN |
| GET | `/api/v1/delegations?page=0&size=20` | ADMIN |
| POST | `/api/v1/delegations` | ADMIN |
| DELETE | `/api/v1/delegations/{id}` | ADMIN |
| GET | `/api/v1/me/export` | Авторизованные (PDF со всеми оценками за все периоды) |

#### Пагинация (стандарт для всех модулей)
Все списочные эндпоинты поддерживают offset-based пагинацию:
- Параметры: `?page=0&size=20`
- Ответ включает: `content`, `totalElements`, `totalPages`, `number`, `size`

---

### NGINX конфигурация (основные блоки)

```nginx
server {
    listen 443 ssl;
    server_name gfh.internal;

    ssl_certificate /etc/letsencrypt/live/gfh.internal/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gfh.internal/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;

    # Фронтенд (статика Vite build)
    location / {
        root /var/www/gfh/dist;
        try_files $uri $uri/ /index.html;
    }

    # Бэкенд API
    location /api/ {
        proxy_pass http://spring-boot:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (уведомления)
    location /ws/ {
        proxy_pass http://spring-boot:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Actuator (только health и info)
    location /actuator/health { proxy_pass http://spring-boot:8080; }
    location /actuator/info   { proxy_pass http://spring-boot:8080; }
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

### Ожидаемый результат
- Spring Boot проект: Spring Security, JWT (httpOnly cookie + CSRF), ролевая авторизация
- JPA-сущности для всех таблиц с `@Version` на `users` и `org_units` (optimistic locking)
- Liquibase миграции (включая все индексы)
- REST API с Bean Validation, единый формат ошибок `{ code, message_ru, message_kg, details }`
- Все эндпоинты с префиксом `/api/v1/`
- Offset-based пагинация на всех списочных эндпоинтах
- `UserService.resolveEvaluator(userId, periodId)` с поддержкой цепочки делегирований, unit-тесты на все 5 случаев
- Валидация ациклизма оргструктуры на сервисном слое
- `PasswordPolicyValidator` с проверкой по словарю + принудительная смена каждые 90 дней
- Rate limiter на login endpoint (Bucket4j)
- Автоматический выход по бездействию (настраивается в `system_settings`)
- NGINX конфигурация с SSL (Let's Encrypt) и security headers
- Docker Compose файл: `nginx`, `spring-boot`, `postgres`
- Logback конфигурация с ротацией логов
- React.js (Vite + Redux Toolkit + React Router v6 + Tailwind + shadcn/ui):
  - Feature-based структура папок (`src/features/auth/`, `src/features/users/`, `src/features/org/`)
  - Форма входа с автообновлением токена в фоне
  - Страница принудительной смены пароля (при истечении 90 дней)
  - Сброс пароля, смена пароля
  - Управление пользователями (с реактивацией)
  - Оргструктура
  - Управление делегированиями (с поддержкой цепочки)
  - Страница PDPA-согласия
  - Язык по умолчанию: русский; переключатель ru/kg в шапке (без перезагрузки)
- Swagger/OpenAPI документация (доступна всем авторизованным)
- Unit-тесты: resolveEvaluator (5 сценариев), валидация ациклизма, политика паролей
- Интеграционные тесты на API (Testcontainers + PostgreSQL)

---
