# M5-FE-01: Language Switcher (ru/kg, no reload, localStorage) + Complete Translation Files

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a language toggle button to the header that switches between Russian and Kyrgyz without a page reload, persists the choice in localStorage, and complete the `ru.json` and `kg.json` translation files with every key used across all five modules.

**Architecture:** react-i18next was initialized in M1-FE-01. This plan only (1) fills in all translation keys in both locale files, (2) adds a `LanguageSwitcher` component that calls `i18n.changeLanguage()`, and (3) mounts it in the existing `AppHeader` component. No routing changes needed.

**Tech Stack:** React 18, react-i18next, Tailwind CSS, shadcn/ui.

**Depends on:** m4-analytics/fe-05-export-responsive.md

---

### Task 1: Complete Russian translation file

**Files:**
- Modify: `frontend/src/i18n/locales/ru.json`

- [ ] **Step 1: Replace ru.json with complete translations**

`frontend/src/i18n/locales/ru.json`:
```json
{
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "edit": "Редактировать",
    "add": "Добавить",
    "search": "Поиск",
    "filter": "Фильтр",
    "reset": "Сброс",
    "export": "Экспорт",
    "loading": "Загрузка...",
    "noData": "Нет данных",
    "yes": "Да",
    "no": "Нет",
    "confirm": "Подтвердить",
    "close": "Закрыть",
    "back": "Назад",
    "next": "Далее",
    "submit": "Отправить",
    "status": "Статус",
    "actions": "Действия",
    "of": "из",
    "page": "Страница",
    "rowsPerPage": "Строк на странице",
    "total": "Всего"
  },
  "auth": {
    "login": "Войти",
    "logout": "Выйти",
    "email": "Электронная почта",
    "password": "Пароль",
    "currentPassword": "Текущий пароль",
    "newPassword": "Новый пароль",
    "confirmPassword": "Подтвердите пароль",
    "changePassword": "Сменить пароль",
    "changePasswordRequired": "Необходимо сменить пароль",
    "changePasswordHint": "При первом входе необходимо установить новый пароль.",
    "loginTitle": "Вход в систему",
    "loginButton": "Войти",
    "invalidCredentials": "Неверный логин или пароль",
    "accountLocked": "Учётная запись заблокирована. Обратитесь к администратору.",
    "sessionExpired": "Сессия истекла. Пожалуйста, войдите снова."
  },
  "user": {
    "title": "Пользователи",
    "fullName": "ФИО",
    "email": "Email",
    "role": "Роль",
    "orgUnit": "Подразделение",
    "isActive": "Активен",
    "createdAt": "Дата создания",
    "addUser": "Добавить пользователя",
    "editUser": "Редактировать пользователя",
    "deactivate": "Деактивировать",
    "activate": "Активировать",
    "resetPassword": "Сбросить пароль",
    "pdpaConsent": "Согласие на обработку данных",
    "pdpaText": "Я даю согласие на обработку моих персональных данных в соответствии с законодательством Кыргызской Республики.",
    "pdpaAccept": "Принять и продолжить"
  },
  "roles": {
    "ADMIN": "Администратор",
    "CHAIRMAN": "Председатель",
    "DEPUTY_CHAIRMAN": "Заместитель председателя",
    "DEPARTMENT_HEAD": "Начальник отдела",
    "EMPLOYEE": "Сотрудник"
  },
  "org": {
    "title": "Структура организации",
    "unitName": "Название подразделения",
    "parentUnit": "Родительское подразделение",
    "addUnit": "Добавить подразделение",
    "editUnit": "Редактировать подразделение",
    "deleteUnit": "Удалить подразделение",
    "head": "Руководитель",
    "delegations": "Делегирование полномочий",
    "delegate": "Делегировать",
    "delegateTo": "Кому делегировать",
    "delegateFrom": "От кого",
    "delegationPeriod": "Период делегирования",
    "startDate": "Дата начала",
    "endDate": "Дата окончания",
    "addDelegation": "Добавить делегирование",
    "noDelegations": "Делегирований нет"
  },
  "criteria": {
    "title": "Критерии оценки",
    "positive": "Позитивные критерии",
    "antiBonus": "Анти-бонусы",
    "name": "Название критерия",
    "nameRu": "Название (рус.)",
    "nameKg": "Название (кыр.)",
    "description": "Описание",
    "weight": "Вес",
    "maxRawValue": "Максимальное значение",
    "scope": "Применение",
    "scopeAll": "Все",
    "scopeUnit": "По подразделению",
    "isActive": "Активен",
    "isPenalty": "Штрафной",
    "addCriteria": "Добавить критерий",
    "editCriteria": "Редактировать критерий",
    "deactivate": "Деактивировать",
    "reactivate": "Реактивировать",
    "weightSum": "Сумма весов",
    "weightSumError": "Сумма весов позитивных критериев должна равняться 100%",
    "frozenWarning": "Критерий заморожен (имеются оценки). Вес изменить нельзя."
  },
  "evaluation": {
    "title": "Оценки",
    "period": "Период оценки",
    "periodType": "Тип периода",
    "monthly": "Ежемесячный",
    "quarterly": "Ежеквартальный",
    "annual": "Годовой",
    "startDate": "Дата начала",
    "endDate": "Дата окончания",
    "deadline": "Срок оценки",
    "evaluatee": "Оцениваемый",
    "evaluator": "Оценщик",
    "status": "Статус",
    "statusDraft": "Черновик",
    "statusSubmitted": "Отправлена",
    "statusAcknowledged": "Принята",
    "statusDisputed": "Оспорена",
    "statusFinalized": "Завершена",
    "score": "Баллы",
    "finalScore": "Итоговый балл",
    "rawValue": "Значение",
    "comment": "Комментарий",
    "files": "Прикреплённые файлы",
    "attachFile": "Прикрепить файл",
    "submitEvaluation": "Отправить оценку",
    "saveDraft": "Сохранить черновик",
    "draftSaved": "Черновик сохранён",
    "submittedSuccess": "Оценка успешно отправлена",
    "myEvaluations": "Мои оценки",
    "toEvaluate": "К оценке",
    "noPendingEvaluations": "Нет оценок для выполнения"
  },
  "appeal": {
    "title": "Апелляция",
    "reaction": "Реакция на оценку",
    "agree": "Согласен",
    "disagree": "Не согласен",
    "appealReason": "Причина апелляции",
    "submitAppeal": "Подать апелляцию",
    "appealSubmitted": "Апелляция подана",
    "statusOpen": "На рассмотрении",
    "statusUpheld": "Удовлетворена",
    "statusOverturned": "Отклонена",
    "statusAutoClosed": "Закрыта автоматически",
    "reviewDecision": "Решение по апелляции",
    "upheld": "Апелляция удовлетворена",
    "overturned": "Апелляция отклонена",
    "decisionComment": "Комментарий к решению"
  },
  "notification": {
    "title": "Уведомления",
    "markRead": "Отметить как прочитанное",
    "markAllRead": "Прочитать все",
    "noNotifications": "Уведомлений нет",
    "newEvaluation": "Новая оценка для выполнения",
    "evaluationSubmitted": "Оценка отправлена",
    "appealReceived": "Получена апелляция",
    "appealDecided": "Решение по апелляции",
    "deadlineReminder": "Напоминание о дедлайне"
  },
  "analytics": {
    "title": "Аналитика",
    "personalDashboard": "Личный кабинет",
    "managerDashboard": "Панель руководителя",
    "hierarchicalAnalytics": "Иерархическая аналитика",
    "antiBonusAnalytics": "Аналитика анти-бонусов",
    "currentScore": "Текущий балл",
    "departmentAvg": "Среднее по подразделению",
    "companyAvg": "Среднее по организации",
    "dynamics": "Динамика",
    "periods": "Периоды",
    "top3": "Топ-3",
    "bottom3": "Антирейтинг",
    "pendingEvaluations": "Оценок к выполнению",
    "completedEvaluations": "Завершённых оценок",
    "exportExcel": "Экспорт Excel",
    "exportPdf": "Экспорт PDF",
    "viewMode": "Режим отображения",
    "table": "Таблица",
    "chart": "График",
    "tree": "Дерево",
    "heatmap": "Тепловая карта",
    "drillDown": "Детализация",
    "compareWith": "Сравнить с",
    "top10AntiBonus": "Топ-10 по анти-бонусам",
    "distribution": "Распределение",
    "incidents": "Инцидентов"
  },
  "admin": {
    "title": "Администрирование",
    "users": "Пользователи",
    "orgStructure": "Структура",
    "criteria": "Критерии",
    "periods": "Периоды",
    "delegations": "Делегирование",
    "settings": "Настройки",
    "calendar": "Производственный календарь",
    "auditLog": "Журнал аудита",
    "monitoring": "Мониторинг",
    "stats": "Статистика системы",
    "quartzJobs": "Запланированные задачи",
    "errorLogs": "Журнал ошибок",
    "systemSettings": "Настройки системы",
    "ratingFormula": "Формула расчёта рейтинга",
    "formula1": "Формула 1: Позитив − Анти-бонус",
    "formula2": "Формула 2: Позитив × (1 − доля анти-бонуса)",
    "formula3": "Формула 3: Позитив − (Анти-бонус / макс.анти-бонус)",
    "formula4": "Формула 4: Взвешенное среднее",
    "calendarYear": "Год",
    "calendarMonth": "Месяц",
    "workingDays": "Рабочих дней",
    "addCalendarEntry": "Добавить запись"
  },
  "audit": {
    "actor": "Пользователь",
    "action": "Действие",
    "entityType": "Тип объекта",
    "entityId": "ID объекта",
    "details": "Детали",
    "ipAddress": "IP-адрес",
    "timestamp": "Время",
    "filterFrom": "С",
    "filterTo": "По",
    "exportAudit": "Экспорт аудита"
  },
  "monitoring": {
    "jobName": "Задача",
    "jobGroup": "Группа",
    "cronExpression": "Расписание",
    "lastFire": "Последний запуск",
    "nextFire": "Следующий запуск",
    "state": "Состояние",
    "errorLog": "Последние ошибки"
  },
  "nav": {
    "home": "Главная",
    "myEvaluation": "Моя оценка",
    "tasks": "Задачи",
    "analytics": "Аналитика",
    "admin": "Администрирование",
    "profile": "Профиль"
  },
  "settings": {
    "language": "Язык",
    "ru": "Русский",
    "kg": "Кыргызча"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/i18n/locales/ru.json
git commit -m "feat(i18n): complete Russian translation file with all module keys"
```

---

### Task 2: Complete Kyrgyz translation file

**Files:**
- Modify: `frontend/src/i18n/locales/kg.json`

- [ ] **Step 1: Replace kg.json with complete translations**

`frontend/src/i18n/locales/kg.json`:
```json
{
  "common": {
    "save": "Сактоо",
    "cancel": "Жокко чыгаруу",
    "delete": "Жок кылуу",
    "edit": "Өзгөртүү",
    "add": "Кошуу",
    "search": "Издөө",
    "filter": "Чыпкалоо",
    "reset": "Баштапкы абалга келтирүү",
    "export": "Экспорт",
    "loading": "Жүктөлүүдө...",
    "noData": "Маалымат жок",
    "yes": "Ооба",
    "no": "Жок",
    "confirm": "Ырастоо",
    "close": "Жабуу",
    "back": "Артка",
    "next": "Кийинки",
    "submit": "Жөнөтүү",
    "status": "Абалы",
    "actions": "Аракеттер",
    "of": "дан",
    "page": "Бет",
    "rowsPerPage": "Беттеги саптар",
    "total": "Бардыгы"
  },
  "auth": {
    "login": "Кирүү",
    "logout": "Чыгуу",
    "email": "Электрондук почта",
    "password": "Сырсөз",
    "currentPassword": "Учурдагы сырсөз",
    "newPassword": "Жаңы сырсөз",
    "confirmPassword": "Сырсөздү ырастаңыз",
    "changePassword": "Сырсөздү өзгөртүү",
    "changePasswordRequired": "Сырсөздү өзгөртүү зарыл",
    "changePasswordHint": "Биринчи жолу киргенде жаңы сырсөз белгилөө керек.",
    "loginTitle": "Системага кирүү",
    "loginButton": "Кирүү",
    "invalidCredentials": "Логин же сырсөз туура эмес",
    "accountLocked": "Каттоо эсеби бекитилген. Администраторго кайрылыңыз.",
    "sessionExpired": "Сессия аяктады. Кайра кириңиз."
  },
  "user": {
    "title": "Колдонуучулар",
    "fullName": "Аты-жөнү",
    "email": "Email",
    "role": "Ролу",
    "orgUnit": "Бөлүм",
    "isActive": "Активдүү",
    "createdAt": "Түзүлгөн күнү",
    "addUser": "Колдонуучу кошуу",
    "editUser": "Колдонуучуну өзгөртүү",
    "deactivate": "Өчүрүү",
    "activate": "Активдештирүү",
    "resetPassword": "Сырсөздү баштапкы абалга келтирүү",
    "pdpaConsent": "Маалыматтарды иштетүүгө макулдук",
    "pdpaText": "Кыргыз Республикасынын мыйзамдарына ылайык жеке маалыматтарымды иштетүүгө макулдук берем.",
    "pdpaAccept": "Макулмун жана улантам"
  },
  "roles": {
    "ADMIN": "Администратор",
    "CHAIRMAN": "Төрага",
    "DEPUTY_CHAIRMAN": "Төраганын орун басары",
    "DEPARTMENT_HEAD": "Бөлүм башчысы",
    "EMPLOYEE": "Кызматкер"
  },
  "org": {
    "title": "Уюмдун түзүмү",
    "unitName": "Бөлүмдүн аталышы",
    "parentUnit": "Жогорку бөлүм",
    "addUnit": "Бөлүм кошуу",
    "editUnit": "Бөлүмдү өзгөртүү",
    "deleteUnit": "Бөлүмдү жок кылуу",
    "head": "Жетекчи",
    "delegations": "Ыйгарым укуктарды өткөрүп берүү",
    "delegate": "Өткөрүп берүү",
    "delegateTo": "Кимге өткөрүп берүү",
    "delegateFrom": "Кимден",
    "delegationPeriod": "Өткөрүп берүү мезгили",
    "startDate": "Башталган күнү",
    "endDate": "Аяктаган күнү",
    "addDelegation": "Өткөрүп берүү кошуу",
    "noDelegations": "Өткөрүп берүүлөр жок"
  },
  "criteria": {
    "title": "Баалоо критерийлери",
    "positive": "Позитивдүү критерийлер",
    "antiBonus": "Анти-бонустар",
    "name": "Критерийдин аталышы",
    "nameRu": "Аталышы (орусча)",
    "nameKg": "Аталышы (кыргызча)",
    "description": "Сүрөттөмө",
    "weight": "Салмагы",
    "maxRawValue": "Максималдуу мааниси",
    "scope": "Колдонуу чөйрөсү",
    "scopeAll": "Бардыгы",
    "scopeUnit": "Бөлүм боюнча",
    "isActive": "Активдүү",
    "isPenalty": "Айып",
    "addCriteria": "Критерий кошуу",
    "editCriteria": "Критерийди өзгөртүү",
    "deactivate": "Өчүрүү",
    "reactivate": "Кайра активдештирүү",
    "weightSum": "Салмактардын суммасы",
    "weightSumError": "Позитивдүү критерийлердин салмактарынын суммасы 100% болушу керек",
    "frozenWarning": "Критерий музданган (баалоолор бар). Салмакты өзгөртүүгө болбойт."
  },
  "evaluation": {
    "title": "Баалоолор",
    "period": "Баалоо мезгили",
    "periodType": "Мезгилдин түрү",
    "monthly": "Айлык",
    "quarterly": "Чейректик",
    "annual": "Жылдык",
    "startDate": "Башталган күнү",
    "endDate": "Аяктаган күнү",
    "deadline": "Жеткирүү мөөнөтү",
    "evaluatee": "Бааланган",
    "evaluator": "Баалоочу",
    "status": "Абалы",
    "statusDraft": "Долбоор",
    "statusSubmitted": "Жөнөтүлдү",
    "statusAcknowledged": "Кабыл алынды",
    "statusDisputed": "Талашылууда",
    "statusFinalized": "Аяктады",
    "score": "Упай",
    "finalScore": "Жыйынтык упай",
    "rawValue": "Мааниси",
    "comment": "Комментарий",
    "files": "Тиркелген файлдар",
    "attachFile": "Файл тиркөө",
    "submitEvaluation": "Баалоону жөнөтүү",
    "saveDraft": "Долбоорду сактоо",
    "draftSaved": "Долбоор сакталды",
    "submittedSuccess": "Баалоо ийгиликтүү жөнөтүлдү",
    "myEvaluations": "Менин баалоолорум",
    "toEvaluate": "Баалоо үчүн",
    "noPendingEvaluations": "Аткарыла турган баалоолор жок"
  },
  "appeal": {
    "title": "Даттануу",
    "reaction": "Баалоого реакция",
    "agree": "Макулмун",
    "disagree": "Макул эмесмин",
    "appealReason": "Даттануунун себеби",
    "submitAppeal": "Даттануу берүү",
    "appealSubmitted": "Даттануу берилди",
    "statusOpen": "Каралууда",
    "statusUpheld": "Канааттандырылды",
    "statusOverturned": "Четке кагылды",
    "statusAutoClosed": "Автоматтык жабылды",
    "reviewDecision": "Даттануу боюнча чечим",
    "upheld": "Даттануу канааттандырылды",
    "overturned": "Даттануу четке кагылды",
    "decisionComment": "Чечимге комментарий"
  },
  "notification": {
    "title": "Билдирмелер",
    "markRead": "Окулду деп белгилөө",
    "markAllRead": "Баарын окулду деп белгилөө",
    "noNotifications": "Билдирмелер жок",
    "newEvaluation": "Жаңы баалоо тапшырмасы",
    "evaluationSubmitted": "Баалоо жөнөтүлдү",
    "appealReceived": "Даттануу келди",
    "appealDecided": "Даттануу боюнча чечим",
    "deadlineReminder": "Мөөнөт эскертүүсү"
  },
  "analytics": {
    "title": "Аналитика",
    "personalDashboard": "Жеке кабинет",
    "managerDashboard": "Жетекчинин панели",
    "hierarchicalAnalytics": "Иерархиялык аналитика",
    "antiBonusAnalytics": "Анти-бонус аналитикасы",
    "currentScore": "Учурдагы упай",
    "departmentAvg": "Бөлүм боюнча орточо",
    "companyAvg": "Уюм боюнча орточо",
    "dynamics": "Динамика",
    "periods": "Мезгилдер",
    "top3": "Топ-3",
    "bottom3": "Антирейтинг",
    "pendingEvaluations": "Аткарыла турган баалоолор",
    "completedEvaluations": "Аяктаган баалоолор",
    "exportExcel": "Excel экспорт",
    "exportPdf": "PDF экспорт",
    "viewMode": "Көрсөтүү режими",
    "table": "Таблица",
    "chart": "Диаграмма",
    "tree": "Дарак",
    "heatmap": "Жылуулук картасы",
    "drillDown": "Деталдаштыруу",
    "compareWith": "Салыштыруу",
    "top10AntiBonus": "Анти-бонус боюнча топ-10",
    "distribution": "Бөлүштүрүү",
    "incidents": "Инциденттер"
  },
  "admin": {
    "title": "Администрирование",
    "users": "Колдонуучулар",
    "orgStructure": "Түзүм",
    "criteria": "Критерийлер",
    "periods": "Мезгилдер",
    "delegations": "Өткөрүп берүү",
    "settings": "Жөндөөлөр",
    "calendar": "Өндүрүштүк календарь",
    "auditLog": "Аудит журналы",
    "monitoring": "Мониторинг",
    "stats": "Системанын статистикасы",
    "quartzJobs": "Пландаштырылган тапшырмалар",
    "errorLogs": "Каталар журналы",
    "systemSettings": "Системанын жөндөөлөрү",
    "ratingFormula": "Рейтинг эсептөө формуласы",
    "formula1": "Формула 1: Позитив − Анти-бонус",
    "formula2": "Формула 2: Позитив × (1 − анти-бонус үлүшү)",
    "formula3": "Формула 3: Позитив − (Анти-бонус / макс.анти-бонус)",
    "formula4": "Формула 4: Салмактуу орточо",
    "calendarYear": "Жыл",
    "calendarMonth": "Ай",
    "workingDays": "Жумуш күндөрү",
    "addCalendarEntry": "Жазуу кошуу"
  },
  "audit": {
    "actor": "Колдонуучу",
    "action": "Аракет",
    "entityType": "Объект түрү",
    "entityId": "Объект ID",
    "details": "Деталдар",
    "ipAddress": "IP-дарек",
    "timestamp": "Убактысы",
    "filterFrom": "Баштап",
    "filterTo": "Чейин",
    "exportAudit": "Аудитти экспорттоо"
  },
  "monitoring": {
    "jobName": "Тапшырма",
    "jobGroup": "Топ",
    "cronExpression": "Жадыбал",
    "lastFire": "Акыркы иш",
    "nextFire": "Кийинки иш",
    "state": "Абалы",
    "errorLog": "Акыркы каталар"
  },
  "nav": {
    "home": "Башкы бет",
    "myEvaluation": "Менин баалоом",
    "tasks": "Тапшырмалар",
    "analytics": "Аналитика",
    "admin": "Администрирование",
    "profile": "Профиль"
  },
  "settings": {
    "language": "Тил",
    "ru": "Орусча",
    "kg": "Кыргызча"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/i18n/locales/kg.json
git commit -m "feat(i18n): complete Kyrgyz translation file with all module keys"
```

---

### Task 3: LanguageSwitcher component + mount in header

**Files:**
- Create: `frontend/src/components/LanguageSwitcher.tsx`
- Modify: `frontend/src/components/AppHeader.tsx`

- [ ] **Step 1: Create LanguageSwitcher component**

`frontend/src/components/LanguageSwitcher.tsx`:
```tsx
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'ru', label: 'Рус' },
  { code: 'kg', label: 'Кыр' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.split('-')[0]

  const toggle = () => {
    const next = current === 'ru' ? 'kg' : 'ru'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  const currentLabel = LANGUAGES.find(l => l.code === current)?.label ?? 'Рус'
  const nextLabel = LANGUAGES.find(l => l.code !== current)?.label ?? 'Кыр'

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      title={`Switch to ${nextLabel}`}
      aria-label={`Switch to ${nextLabel}`}
    >
      <span>{currentLabel}</span>
      <span className="text-gray-400">/</span>
      <span className="text-gray-400">{nextLabel}</span>
    </button>
  )
}
```

- [ ] **Step 2: Confirm i18n initializes from localStorage**

Open `frontend/src/i18n/index.ts` and verify it initializes with the saved language:

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './locales/ru.json'
import kg from './locales/kg.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kg: { translation: kg },
    },
    lng: localStorage.getItem('lang') ?? 'ru',
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
  })

export default i18n
```

If the file differs, update it to match the above.

- [ ] **Step 3: Mount LanguageSwitcher in AppHeader**

In `frontend/src/components/AppHeader.tsx`, import and render `<LanguageSwitcher />` next to the notification bell and user menu:

```tsx
import { LanguageSwitcher } from './LanguageSwitcher'

// Inside the header JSX, near the right side actions:
<div className="flex items-center gap-3">
  <LanguageSwitcher />
  {/* existing NotificationBell and UserMenu components */}
  <NotificationBell />
  <UserMenu />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/LanguageSwitcher.tsx \
        frontend/src/components/AppHeader.tsx \
        frontend/src/i18n/index.ts
git commit -m "feat(i18n): add LanguageSwitcher component with localStorage persistence mounted in AppHeader"
```
