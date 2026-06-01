# Hardcoded Strings Bug List

Файлы с UI-строками, не проходящими через i18n (`t()`).

## 🔴 Критичные — пользовательский текст (китайский, не через i18n)

| Файл | Строка | Текст | Примечание |
|------|--------|-------|------------|
| `components/hermes/chat/FolderPicker.vue` | 162 | `（空）` | "пусто" — UI-лейбл для пустой папки |
| `components/hermes/chat/FolderPicker.vue` | 167 | `暂无工作区文件夹` | "нет рабочих папок" — UI-плейсхолдер |
| `components/hermes/chat/FolderPicker.vue` | 173 | `已选择：` | "выбрано:" — UI-лейбл |

## 🟡 Средние — voice labels (китайские имена голосов)

| Файл | Строки | Описание |
|------|--------|----------|
| `components/hermes/settings/VoiceSettings.vue` | 40-50 | Edge TTS голоса: `晓晓`, `晓萱`, `云希` и т.д. — 11 китайских голосов |
| `components/hermes/settings/VoiceSettings.vue` | 92-99 | MiMo TTS голоса: `冰糖 (中文·女)`, `茉莉 (中文·女)` и т.д. — 8 голосов |

**Примечание:** Голоса — это固有 названия (product names). Можно оставить как есть или добавить переводы для описаний (中文·女 → Chinese·Female). Не срочное.

## 🟢 Низкие — комментарии разработчика (не UI)

Китайские комментарии в коде (// и <!-- -->). Не видны пользователю, не требуют i18n.

Затронутые файлы:
- `AgentSettings.vue` — 5 комментариев
- `SessionSettings.vue` — 5 комментариев
- `MemorySettings.vue` — 5 комментариев
- `MessageItem.vue` — ~20 комментариев (TTS, voice playback)
- `ChatInput.vue` — ~8 комментариев
- `TerminalPanel.vue` — ~10 section headers
- `ProviderFormModal.vue` — ~10 комментариев
- `ProviderCard.vue` — ~7 комментариев
- `McpServerCard.vue` — 4 HTML-комментария
- `GroupChatInput.vue` — 5 комментариев
- `ChatView.vue` — 2 комментария
- `ModelsView.vue` — 2 комментария
- `ProfileCreateModal.vue`, `ProfileRenameModal.vue` — по 1 комментарию

## ℹ️ Unicode-символы (не требуют i18n)

Символы типа `📂`, `📁`, `⏳`, `▶`, `▼`, `💭`, `✏️`, `⬇️`, `✓`, `●`, `⊘`, `↑`, `↓`, `—`, `·`, `✗`, `×` — это визуальные элементы, не текст.

## Резюме

**Реально требуют i18n:** 3 строки в `FolderPicker.vue` — жестко зашитый китайский текст в UI.
**Желательно:** 19 voice label descriptions в `VoiceSettings.vue`.
**Не требует действий:** комментарии разработчика (~80 строк), Unicode-символы.
