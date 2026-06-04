<div align="center">

# 🛠️ Hermes Web UI — Frankenstein Build

**Turn-based kanban для совместной работы человек ↔ AI-агент**

[![GitHub](https://img.shields.io/badge/fork-EKKOLearnAI%2Fhermes--web--ui-blue?style=flat-square)](https://github.com/EKKOLearnAI/hermes-web-ui)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Hermes](https://img.shields.io/badge/hermes--agent-0.15.1-orange?style=flat-square)](https://github.com/NousResearch/hermes-agent)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?style=flat-square)](https://vuejs.org/)

</div>

---

## 📸 Скриншоты

> **В разработке** — скриншоты появятся после стабилизации UI.

```
┌─────────────────────────────────────────────┐
│  📋 Kanban Board                            │
├──────────┬──────────┬──────────┬────────────┤
│  Inbox   │   To Do  │ Progress │   Done     │
│──────────│──────────│──────────│────────────│
│  □ Task  │  □ Task  │  ▣ Task  │  ✓ Task    │
│  □ Task  │  □ Task  │          │  ✓ Task    │
└──────────┴──────────┴──────────┴────────────┘
```

---

## 🎯 Что это

Форк [Hermes Web UI](https://github.com/EKKOLearnAI/hermes-web-ui) с русской локализацией и turn-based канбан-доской. Концепция: **discussion-first** — обсуждение → задача → канбан.

### Ключевые отличия от оригинала

- **🇷🇺 Полная русская локализация** — интерфейс на русском
- **📋 Kanban-доска** — Inbox → To Do → In Progress → Done с drag & drop
- **🤝 Человек ↔ Агент** — каждый turn привязан к задаче, роли распределены
- **⏱️ Time Tracking** — учёт времени по задачам
- **📊 Mini Stats** — статистика по проекту на дашборде
- **🎯 Milestones** — вехи и прогресс

---

## 🏗️ Стек

| Слой | Технология |
|------|-----------|
| Frontend | Vue 3 + Naive UI |
| Backend | Koa + Socket.IO |
| AI Engine | Hermes Agent 0.15.1 |
| Build | Vite |
| Desktop | Electron (опционально) |

---

## 🚀 Быстрый старт

```bash
# Клонировать
git clone https://github.com/dmantipinai-hash/hermes-web-ui-ru.git
cd hermes-web-ui-ru

# Установить зависимости
npm ci --ignore-scripts

# Дев-режим (фронтенд + бэкенд)
npm run dev
# → http://localhost:8649 (фронтенд)
# → http://localhost:8647 (API)
```

**Доступ по умолчанию:** `admin` / `123456`

---

## 📂 Архитектура

```
hermes-web-ui/
├── packages/
│   ├── client/     # Vue 3 SPA (Vite + Naive UI)
│   ├── server/     # Koa API + Socket.IO
│   └── desktop/    # Electron wrapper
├── tests/          # Vitest + Playwright
└── docs/           # Документация
```

---

## 📈 Статус проекта

**Фаза:** Активная разработка (Alpha)

- ✅ Русская локализация (70%)
- ✅ Kanban MVP — карточки, колонки, drag & drop
- ✅ Goal Card + Time Tracking + Mini Stats
- 🔄 Workflow-движок (в процессе)
- 🔄 Стабилизация handoffTask
- ⬜ Milestones v2
- ⬜ Multi-agent coordination

---

## 🤝 Вдохновение

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — ⭐180K+ — движок автономных AI-агентов
- [Routa](https://github.com/phodal/routa) — Workspace-first multi-agent coordination
- [YouGile](https://yougile.com) — Discussion-first подход к управлению задачами

---

## 📄 Лицензия

MIT — как и оригинальный [hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui)

---

<div align="center">

*Если проект полезен — поставь ⭐! Это помогает развитию.*

</div>
