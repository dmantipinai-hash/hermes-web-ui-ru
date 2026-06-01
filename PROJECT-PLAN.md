# Проект: Frankenstein — Hermes Web UI (Русский + Workflow)

## Цель

Создать собственный учебный проект на базе hermes-web-ui:
- Полностью русифицированный интерфейс
- Workflow-движок для автоматизации задач агента
- Канбан-доска как основа управления задачами (уже есть в hermes-web-ui)

Результат: рабочий дашборд на русском языке, где можно создавать workflow,
запускать их по расписанию или вручную, видеть прогресс на канбан-доске.

## Что уже есть

- ~/Desktop/hermes-agent — форк Hermes v0.15.0 (ядро агента)
- ~/Desktop/hermes-web-ui — клон hermes-web-ui v0.6.7 (Vue 3 + Naive UI + Pinia)
- Канбан-доска: 7 статусов (triage → todo → ready → running → blocked → done → archived)
- 9 локалей, русского нет
- Зависимости НЕ установлены (pnpm install не выполнялся)

## Архитектура

- Frontend: Vue 3.5 + Naive UI + Pinia + Socket.IO
- Backend: Node.js + SQLite (better-sqlite3)
- Сборка: pnpm 9.15+, Node.js 23+
- Порт дашборда: из конфига сервера
- Авторизация: admin/123456 (дефолт)

---

## ФАЗА 1: Русификация (приоритет — видимый результат)

### 1.1 Создать ru.ts локаль
- Файл: packages/client/src/i18n/locales/ru.ts
- Исходник: en.ts (1550 строк)
- Полный перевод 1:1, живой русский
- Секцию changelog НЕ переводить
- Тех. термины (API, CLI, MCP и т.д.) не трогать
- Плейсхолдеры {variable} сохранять

### 1.2 Зарегистрировать ru в i18n
- Файл: packages/client/src/i18n/messages.ts
- import ru, supportedLocales += 'ru', rawMessages += ru
- Проверить: grep 'ru' messages.ts

### 1.3 Установить зависимости и запустить
- pnpm install (в корне monorepo)
- Запустить dev-сервер
- Проверить: переключить язык на русский, увидеть переведённый интерфейс

### 1.4 Доперевести что не покрылось
- Пройти по всем страницам UI
- Найти жёстко зашитые строки (не через i18n)
- Завести баг-лист

---

## ФАЗА 2: Workflow-движок (ядро автоматизации)

Концепция (вдохновлено autosk, своя реализация):
workflow = последовательность шагов, каждый шаг = действие
(prompt к агенту, скрипт, условие). Запускается по триггеру
(ручной, cron, событие канбана).

### 2.1 Спроектировать и создать SQLite-таблицы
- workflows: id, name, description, steps (JSON), trigger_type, trigger_config (JSON), status, created_at, updated_at
- workflow_runs: id, workflow_id, current_step, status (running/paused/completed/failed), result, started_at, completed_at
- workflow_steps_log: id, run_id, step_index, status, input, output, started_at, completed_at

### 2.2 Реализовать сервис (backend)
- Файл: packages/server/src/services/workflowService.ts
- CRUD: create, read, update, delete workflows
- Run: запустить workflow, выполнить шаги последовательно
- Stop: остановить выполнение
- History: получить историю запусков

### 2.3 Реализовать API-роуты
- Файл: packages/server/src/routes/workflows.ts
- GET/POST /api/workflows
- GET/PUT/DELETE /api/workflows/:id
- POST /api/workflows/:id/run
- GET /api/workflows/:id/runs
- POST /api/workflows/runs/:runId/stop

### 2.4 Подключить к серверу
- Зарегистрировать роуты в server entry point
- Протестировать curl-запросами

---

## ФАЗА 3: Целевая система — Локи ↔ Веб-интерфейс (живая связь)

Концепция: Веб-интерфейс = окно в мозг Локи. Дима ставит цель в UI — Локи видит.
Локи ведёт трекер — Дима видит в канбане. Одна правдивая реальность.

### 3.0 Целевая панель (Goal Panel)
- Глобальная цель проекта — editable поле в UI (header/sidebar)
- Локи читает цель при каждом старте сессии
- При изменении цели в UI — Локи получает уведомление (Socket.IO event)
- При изменении цели Локи — UI обновляется в реальном времени

### 3.1 Sync: Канбан ↔ Таск-трекер Локи
- Канбан-задача создана в UI → появляется в todo Локи
- Локи обновил задачу (статус, комментарий) → канбан обновляется
- Два источника правды → одна: SQLite таблица задач (уже есть kanban_tasks)
- Локи пишет в ту же БД через API, UI читает из той же БД

### 3.2 Затраченное время
- Каждая задача трекает: created_at, started_at, completed_at
- Автоматический расчёт: сколько в статусе running, сколько всего
- Отображение в карточке задачи и в дашборде

### 3.3 Activity Feed — живая лента
- Лента событий: цель изменена, задача создана, статус обновлён, комментарий добавлен
- Socket.IO push в реальном времени
- Локи и Дима видят одну ленту

### 3.4 API для двусторонней связи
- GET/POST /api/goal — текущая глобальная цель
- WebSocket event: goal:updated — рассылка при изменении
- Канбан API уже есть — Локи использует тот же endpoint
- POST /api/tasks/:id/time — логирование времени

---

## ФАЗА 4: Workflow UI (визуальное управление)

### 4.1 Pinia store для workflows
- Файл: packages/client/src/stores/hermes/workflows.ts
- State: workflows[], currentWorkflow, runs[]
- Actions: fetch, create, update, delete, run, stop

### 4.2 WorkflowView.vue — список workflows
- Таблица: название, триггер, статус, последний запуск
- Кнопки: создать, редактировать, удалить, запустить

### 4.3 WorkflowEditor.vue — создание/редактирование
- Форма: название, описание
- Редактор шагов: добавить/удалить/переставить шаги
- Типы шагов: prompt, script, condition
- Настройки триггера: ручной, cron, событие канбана

### 4.4 WorkflowRuns.vue — история запусков
- Список запусков с статусами
- Детали: лог каждого шага, вход/выход, время выполнения

### 4.5 Интеграция с канбаном
- При создании задачи в канбане можно привязать workflow
- Автозапуск workflow при смене статуса задачи

---

## ФАЗА 5: Интеграция и стабилизация

### 5.1 Связать workflow prompt-шаги с Hermes bridge API
- Workflow prompt-шаги вызывают Hermes bridge
- Результаты записываются в workflow_steps_log

### 5.2 Тестирование
- Мануальный тест всех workflow-операций
- Тест переключения языков
- Тест создания/запуска workflow через UI

### 5.3 Документация
- README.md проекта на русском
- Описание архитектуры workflow-движка

---

## Прогресс

Трекается через todo-трекер Локи (todo tool).
При старте новой сессии — загрузить этот файл и сверить с тасками.

## Заметки

- Paperclip — отменён (сырой, не работает с z.ai)
- autosk — только концепция workflow (Go, не подходит как основа)
- Основной стек: hermes-web-ui + свои доработки
- Провайдер: z.ai (glm-5.1), OpenRouter для тестов других моделей
