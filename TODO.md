# Frankenstein — Трекер задач

Проект: hermes-web-ui-ru (форк hermes-web-ui v0.6.7)
Репо: https://github.com/dmantipinai-hash/hermes-web-ui-ru
Рабочая директория: ~/Desktop/hermes-web-ui
Полный план: PROJECT-PLAN.md (в корне проекта)

## Текущий статус

### ФАЗА 1: Русификация (i18n)

- [>] **1.1** Создать ru.ts — полный русский перевод en.ts (~1550 строк)
  - Файл: `packages/client/src/i18n/locales/ru.ts`
  - Исходник: `packages/client/src/i18n/locales/en.ts`
  - **Прогресс: ~70% готово (1250+ строк из 1550)**
  - Уже переведены: login, users, common, mcp, sidebar, performance, drawer, chat, kanban, jobs, skills, plugins, memory, models, gateways, profiles, logs, settings, githubPreview, codingAgents
  - **ОСТАЛОСЬ ДОБАВИТЬ 8 секций + закрывающую скобку `}`:**
    - `platform` (строки 1222-1296 в en.ts — настройки каналов Telegram/Discord/WeChat/QQ)
    - `language` (строки 1298-1303)
    - `terminal` (строки 1305-1316)
    - `groupChat` (строки 1318-1372)
    - `usage` (строки 1374-1395)
    - `skillsUsage` (строки 1396-1416)
    - `files` (строки 1418-1467)
    - `download` (строки 1468-1481)
    - `changelog` (строки 1483-1549 — можно оставить на английском, это технические заметки)
  - **Хвост файла сейчас:** заканчивается на секции `codingAgents` без закрывающей `}`

- [ ] **1.2** Зарегистрировать ru в messages.ts
  - Файл: `packages/client/src/i18n/messages.ts`
  - Что сделать: import ru, добавить 'ru' в supportedLocales, добавить ru в rawMessages

- [ ] **1.3** pnpm install + запустить dev + проверить русский
  - `cd ~/Desktop/hermes-web-ui && pnpm install`
  - `pnpm dev`
  - Проверить что русский язык отображается в UI

- [ ] **1.4** Баг-лист жёстко зашитых строк (не через i18n)
  - Найти строки в .vue компонентах, которые не проходят через i18n

### ФАЗА 2: Workflow бэкенд

- [ ] **2.1** SQLite таблицы: workflows, workflow_runs, workflow_steps_log
- [ ] **2.2** workflowService.ts — CRUD + run + stop + history
- [ ] **2.3** API-роуты workflows.ts (REST)
- [ ] **2.4** Подключить роуты к серверу + curl тесты

### ФАЗА 3: Целевая система

- [ ] **3.0** Goal Panel — глобальная цель в UI + Socket.IO
- [ ] **3.1** Sync Канбан ↔ Таск-трекер Локи (одна БД)
- [ ] **3.2** Затраченное время на задачи
- [ ] **3.3** Activity Feed — живая лента
- [ ] **3.4** API двусторонней связи (/api/goal + WebSocket)

### ФАЗА 4: Workflow UI

- [ ] **4** Workflow UI (store + views + editor + runs + kanban)

### ФАЗА 5: Интеграция

- [ ] **5** Интеграция + тестирование + документация

---

## Контекст для продолжения

- Git: main ветка, 1 коммит (`Начало: форк hermes-web-ui v0.6.7 + план проекта Frankenstein`)
- origin: https://github.com/dmantipinai-hash/hermes-web-ui-ru.git
- Auth: `gh auth setup-git` (HTTPS + OAuth)
- .github/workflows удалены (OAuth scope issue)
- Каждый этап коммитить в git для возможности отката
