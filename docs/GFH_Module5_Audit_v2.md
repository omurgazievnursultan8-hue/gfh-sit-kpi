# Система оценки эффективности сотрудников ГФХ
### Промпт-пакет для AI-разработчика | v4.0

> **Правило:** этот файл передаётся AI-разработчику **вместе с файлом `GFH_Part1_General.md`** как контекст. Без Части I модуль не является самодостаточным.

---

## МОДУЛЬ 5 — Аудит, локализация, администрирование и эксплуатация

**Предусловие:** Модули 1–4 реализованы
**Стек:** Spring Boot + Spring AOP + PostgreSQL trigger + react-i18next + React.js + Docker Compose + NGINX

---

### Задача
Реализуй детальный журнал аудита, двуязычный интерфейс (ru/kg), полнофункциональную административную панель и обвязку для эксплуатации on-premise.

---

### Журнал аудита

#### Запись
- Spring AOP (`@AfterReturning` на сервисных методах)
- Таблица `audit_log` — append-only
- **PostgreSQL триггер** запрещает `UPDATE` и `DELETE` на `audit_log`:

```sql
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Modification of audit_log is not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

#### Просмотр и экспорт
- Фильтры в UI: по дате, пользователю, типу события, сущности
- Просмотр: только `ADMIN` и `CHAIRMAN`
- Экспорт в Excel: только `ADMIN`
- Пагинация: offset-based (`?page=0&size=50`)

#### Охват аудита

| Категория | Примеры событий |
|---|---|
| Аутентификация | Вход, выход, неудача, блокировка, смена пароля, сброс пароля, истечение пароля |
| Пользователи | Создание, редактирование, деактивация, реактивация |
| Оргструктура | CRUD подразделений, переназначение руководителя |
| Критерии | Создание, редактирование, деактивация, реактивация, заморозка `is_penalty`, изменение веса |
| Оценки | Выставление, редактирование, автооценка (AUTO), переназначение оценщика при переводе |
| История score | Каждое изменение `score` до дедлайна |
| Апелляции | Создание, решение (UPHELD/OVERTURNED) |
| Антибонусы | Ручные (как обычные оценки), автоматические (с причиной, AUTO) |
| Настройки | Любое изменение `system_settings` |
| Периоды | Создание, открытие, закрытие, принудительное закрытие (с флагом `force_closed`) |
| Экспорт | Кто, когда, какой отчёт, параметры |
| resolveEvaluator | Применение Шагов 4–5, UNEVALUABLE-оценки, переназначение |
| Делегирование | Создание, отмена, активация, цепочка |
| Файлы | Загрузка, скачивание, удаление |
| Календарь | Изменения производственного календаря |
| Сессии | Автовыход по бездействию, принудительный выход ADMIN-ом |
| dry_run | Все события в dry_run-периоде помечаются флагом |

---

### Двуязычность (i18n)

- **Язык по умолчанию при первом входе:** русский
- Переключатель ru/kg в шапке — без перезагрузки страницы
- Выбранный язык сохраняется в `localStorage` (ключ `gfh_lang`)
- Backend: ошибки API содержат `message_ru` и `message_kg` (стандарт из Модуля 1)
- Frontend: `react-i18next`, файлы переводов в `public/locales/ru/translation.json` и `public/locales/kg/translation.json`
- Все статичные строки переведены на оба языка
- Кыргызский — кириллица: корректное отображение символов `ң`, `ү`, `ө`, `ё`
- Двуязычные поля в БД: `name_ru` / `name_kg`, `description_ru` / `description_kg`, `title_ru` / `title_kg`, `body_ru` / `body_kg`

---

### Административная панель (только ADMIN)

#### Управление пользователями
- Список с пагинацией, поиском, фильтрами (роль, подразделение, статус)
- Создание, редактирование, деактивация, **реактивация**, сброс пароля

#### Управление оргструктурой
- Дерево с CRUD-операциями
- Визуальная индикация ациклизма (предупреждение при попытке создать цикл)

#### Управление критериями
- Все критерии всех уровней, фильтры по scope и `is_penalty`
- Автоматические критерии (`is_system=true`) — read-only
- **Реактивация** деактивированных критериев

#### Системные настройки
- Редактирование всех параметров `system_settings`
- История изменений каждого параметра

#### Производственный календарь
- CRUD дней (праздники, переносы рабочих дней)

#### Управление периодами
- Ручное создание, изменение дедлайна
- Принудительное закрытие с двойным подтверждением (показывает количество незавершённых оценок)
- `dry_run` режим при создании периода

#### Управление делегированиями
- CRUD, поддержка цепочки (A→B→C)

#### Журнал аудита
- Полные фильтры, экспорт в Excel

#### Статистика системы
- Активные пользователи / всего пользователей
- Активные циклы (по типам периодов)
- Незакрытые апелляции
- UNEVALUABLE-оценки
- Количество замороженных критериев-антибонусов
- Количество деактивированных (но не удалённых) критериев

#### Мониторинг
- Ссылка на `/actuator/health` с отображением статуса (UP/DOWN)
- Последние 20 строк из лог-файла (ERROR-уровень)
- Статус Quartz-джобов: список джобов, время последнего запуска, статус (OK/FAILED)

---

### Эксплуатация on-premise

#### Docker Compose структура

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/var/www/gfh/dist
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on: [spring-boot]

  spring-boot:
    build: ./backend
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gfh
      - SPRING_DATASOURCE_USERNAME=${DB_USER}
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on: [postgres]

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=gfh
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Бэкап

```bash
# pg_dump — ежедневно в 02:00 (cron)
0 2 * * * pg_dump -U $DB_USER gfh | gzip > /backups/gfh_$(date +\%Y\%m\%d).sql.gz

# Синхронизация на резервный сервер
0 3 * * * rsync -avz /backups/ backup-server:/backups/gfh/

# Очистка резервных копий старше 90 дней
0 4 * * * find /backups/ -name "*.sql.gz" -mtime +90 -delete
```

#### Логи (Logback)

```xml
<!-- logback-spring.xml -->
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
  <file>/app/logs/gfh.log</file>
  <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
    <fileNamePattern>/app/logs/gfh-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
    <maxFileSize>50MB</maxFileSize>
    <maxHistory>30</maxHistory>
  </rollingPolicy>
</appender>
```

#### SSL (Let's Encrypt)

```bash
# Первичное получение сертификата
certbot certonly --standalone -d gfh.internal

# Автообновление (cron)
0 0 1 * * certbot renew --quiet && docker compose restart nginx
```

#### Первичный запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/gfh/evaluation-system.git

# 2. Создать .env файл
cp .env.example .env
# Заполнить DB_USER, DB_PASSWORD, JWT_SECRET

# 3. Собрать фронтенд
cd frontend && npm install && npm run build

# 4. Запустить
docker compose up -d

# 5. Liquibase миграции запускаются автоматически при старте Spring Boot

# 6. Создать первого ADMIN через SQL (bootstrap)
docker compose exec postgres psql -U $DB_USER -d gfh -c "INSERT INTO users ..."
```

---

### Мониторинг (Spring Boot Actuator)

Наружу выставляются только:
- `/actuator/health` — статус приложения (UP/DOWN, БД, диск)
- `/actuator/info` — версия приложения, дата сборки

Остальные endpoints Actuator доступны только изнутри Docker-сети (не проксируются NGINX).

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized
```

---

### API endpoints (Модуль 5)

| Метод | Endpoint | Доступ |
|---|---|---|
| GET | `/api/v1/audit?page=0&size=50&from=&to=&userId=&action=&entityType=` | ADMIN, CHAIRMAN |
| GET | `/api/v1/audit/export?format=excel&...` | ADMIN |
| GET | `/api/v1/admin/stats` | ADMIN |
| GET | `/api/v1/admin/jobs` | ADMIN (статус Quartz-джобов) |
| GET | `/api/v1/admin/logs/errors` | ADMIN (последние ERROR-логи) |

---

### Ожидаемый результат
- Spring AOP конфигурация для автоматической записи в `audit_log`
- PostgreSQL триггер, запрещающий `UPDATE`/`DELETE` на `audit_log`
- Файлы переводов `ru/translation.json` и `kg/translation.json` для всех строк интерфейса
- Компонент переключателя языка (без перезагрузки, с сохранением в `localStorage`)
- React.js (Vite + Redux Toolkit + React Router v6 + Tailwind + shadcn/ui):
  - Полная административная панель с навигацией
  - Страница журнала аудита с фильтрами (дата, пользователь, тип, сущность) и экспортом Excel
  - Статус Quartz-джобов в панели мониторинга
  - Страница системных настроек (все ключи `system_settings`)
  - Индикаторы здоровья (`/actuator/health`) в админ-панели
- Docker Compose (`nginx`, `spring-boot`, `postgres`)
- NGINX конфигурация: SSL (Let's Encrypt), security headers, статика фронта, WebSocket proxy
- Logback конфигурация с ротацией логов
- README с разделами:
  - Первичный запуск (пошагово)
  - Настройка бэкапов (pg_dump + rsync + cron)
  - Обновление сертификата SSL
  - Обновление приложения (`docker compose pull && up -d`)
  - Структура логов
  - Описание переменных окружения (`.env.example`)

---
