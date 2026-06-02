# Отчёт об аудите проекта Hermes
Дата: 2026-06-02
Аудитор: DeepSeek-V4-Pro (субагент Астры)

## 🔴 Критичные проблемы (безопасность)

### 1. Токены/секреты отображаются открытым текстом в UI (PlatformSettings)
**Файл:** `packages/client/src/components/hermes/settings/PlatformSettings.vue`
**Строки:** 268, 287, 315, 347, 372, 388, 413, 446, 459
**Проблема:** Все поля ввода для токенов, секретов и API-ключей платформ (Telegram, Discord, Slack, Matrix, Feishu, DingTalk, QQBot, WeChat, WeCom) используют `<NInput>` **без** `type="password"`. Значения токенов видны на экране любому, кто смотрит в настройки.
**Доказательство:**
```vue
<!-- Строка 268 — Telegram token, открытый текст -->
<NInput :value="credentialDraft('telegram').token || ''" ... placeholder="123456:ABC-DEF..." />

<!-- Строка 287 — Discord token, открытый текст -->
<NInput :value="credentialDraft('discord').token || ''" ... placeholder="Bot token..." />

<!-- Строка 372 — Feishu app_secret, открытый текст -->
<NInput :value="credentialDraft('feishu').extra?.app_secret || ''" ... placeholder="App Secret" />
```
**Риск:** Высокий. При демонстрации экрана, скриншоте или экране в открытом офисе — все токены ботов видны.
**Решение:** Добавить `type="password" show-password-on="click"` ко всем NInput, которые содержат секреты (token, secret, api_key, app_secret, client_secret).

---

### 2. API-ключ хранится в localStorage в открытом виде
**Файл:** `packages/client/src/api/client.ts` (строки 17–29), `stores/hermes/chat.ts` (строка 126)
**Проблема:** JWT-токен авторизации (`hermes_api_key`) хранится в `localStorage` как plain text. Любой XSS на странице или вредоносное расширение браузера может его прочитать.
**Доказательство:**
```typescript
// client.ts:17
export function getApiKey(): string {
  return localStorage.getItem('hermes_api_key') || ''
}
// client.ts:25
export function setApiKey(key: string) {
  localStorage.setItem('hermes_api_key', key)
}
```
**Риск:** Средний (ограничен риском XSS, но в SPA это реальный вектор).
**Решение:** Рассмотреть хранение токена в `httpOnly` cookie (устанавливается сервером) или хотя бы в `sessionStorage` для ограничения времени жизни. Дополнительно: CSP-заголовки для защиты от XSS.

---

## 🔴 Критичные проблемы (локализация)

### 3. WorkflowsView полностью на английском — нет i18n
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Проблема:** Файл **не импортирует** `useI18n` и не использует `t()`. Все строки захардкожены на английском.
**Непереведённые строки (всего ~20):**
| Строка | Строка в коде |
|--------|--------------|
| 4 | `Workflows` |
| 5 | `+ New Workflow` |
| 11 | `Create Workflow` |
| 13 | `Name` |
| 17 | `Description` |
| 18 | `Optional description` |
| 21 | `Cancel` |
| 22 | `Create` |
| 28 | `Loading...` |
| 30 | `No workflows yet. Create one to get started.` |
| 44 | `▶ Run` |
| 45 | `📋 Runs` |
| 46 | `🗑` |
| 55 | `runs` (в `{{ wf._runCount ?? 0 }} runs`) |
| 161 | `Delete this workflow?` (в `confirm()`) |
**Риск:** Высокий — страница полностью неработоспособна для неанглоязычных пользователей.
**Решение:** Добавить `useI18n()`, заменить все строки на `t('workflows.xxx')`, добавить ключи в `en.ts`/`ru.ts`/и другие локали.

---

### 4. WorkflowKanban — полностью на английском, нет i18n
**Файл:** `packages/client/src/components/hermes/workflows/WorkflowKanban.vue`
**Строки:** 12–15 (колонки: 'To Do', 'Running', 'Completed', 'Failed')
**Проблема:** Заголовки колонок канбан-доски захардкожены на английском.
**Доказательство:**
```typescript
const columns = [
  { status: 'todo', title: 'To Do', icon: '📋' },
  { status: 'running', title: 'Running', icon: '▶️' },
  { status: 'completed', title: 'Completed', icon: '✅' },
  { status: 'failed', title: 'Failed', icon: '❌' },
]
```
**Решение:** Добавить `useI18n()`, использовать `t('workflows.kanban.todo')` и т.д.

---

### 5. ActivityFeed — полностью на английском, нет i18n
**Файл:** `packages/client/src/components/hermes/activity/ActivityFeed.vue`
**Строки:** 5 (`Activity`), 7 (`Loading...`), 8 (`No activity yet`), 54–62 (функция `timeAgo` — `s ago`, `m ago`, `h ago`, `d ago`)
**Проблема:** Все UI-строки и относительное время (`timeAgo`) захардкожены на английском.
**Решение:** Добавить `useI18n()`, локализовать `timeAgo` через `t()` или библиотеку (e.g., `vue-i18n` plurals).

---

### 6. FolderPicker — захардкожен китайский текст
**Файл:** `packages/client/src/components/hermes/chat/FolderPicker.vue`
**Строки:** 162 (`（空）`), 173 (`已选择：`), 178 (`暂无工作区文件夹`)
**Проблема:** Китайские строки без i18n. Для русскоязычного/англоязычного пользователя — непонятный текст.
**Доказательство:**
```vue
<span class="folder-empty-text">（空）</span>     <!-- "пусто" -->
<span class="folder-selected-label">已选择：</span>  <!-- "выбрано:" -->
暂无工作区文件夹  <!-- "Нет рабочих папок" -->
```
**Решение:** Добавить `useI18n()`, заменить на `t('folders.empty')`, `t('folders.selected')`, `t('folders.noFolders')`.

---

## 🟡 Важные проблемы

### 7. WorkflowsView использует raw `fetch()` вместо `request()` из api/client
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Строки:** 113, 120, 139, 154, 163, 176
**Проблема:** Все API-вызовы используют `fetch()` напрямую, минуя обёртку `request()` из `@/api/client`. Это означает:
- **Нет заголовка Authorization** — запросы не аутентифицированы (вероятно, 401 на production)
- **Нет заголовка X-Hermes-Profile** — мультипрофильность не работает
- **Нет глобальной обработки 401** — при истёкшем токене нет редиректа на логин
**Доказательство:**
```typescript
const res = await fetch('/api/hermes/workflows')  // нет Bearer token!
```
**Риск:** Высокий — функциональность workflows может не работать вообще при включённой авторизации.
**Решение:** Заменить `fetch()` на `request()` из `@/api/client`.

---

### 8. WorkflowKanban, ActivityFeed, GoalPanel — raw `fetch()` без авторизации
**Файлы:**
- `components/hermes/workflows/WorkflowKanban.vue` (строка 64)
- `components/hermes/activity/ActivityFeed.vue` (строка 63)
- `components/hermes/goals/GoalPanel.vue` (строка 25)
**Проблема:** Та же проблема — raw `fetch()` без Bearer-токена и профиля.
**Решение:** Заменить на `request()` из `@/api/client`.

---

### 9. WorkflowsView использует `confirm()` вместо Naive UI dialog
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Строка:** 161
**Проблема:** `confirm('Delete this workflow?')` — использует браузерный нативный диалог, который не стилизуется и нарушает UI-consistency. В остальном проекте используется Naive UI `useDialog()`.
**Решение:** Заменить на `useDialog()` из Naive UI.

---

### 10. WorkflowsView не использует компоненты Naive UI
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Проблема:** Весь UI реализован через кастомные CSS-классы и plain HTML (`<button>`, `<input>`, `<textarea>`), в то время как остальной проект использует Naive UI компоненты (`NButton`, `NInput`, `NModal`). Это создаёт:
- Визуальное несоответствие (кнопки/инпуты выглядят иначе)
- Проблемы с тёмной темой (кастомные стили могут не адаптироваться)
- Дублирование кода (стили для .btn, .modal и т.д.)
**Решение:** Переписать с использованием Naive UI компонентов.

---

### 11. Файлы без i18n (неиспользуемые `useI18n`) — потенциальные пропуски
**Файлы:**
- `components/common/RouteLinkItem.vue` — нет строк в template (OK)
- `components/hermes/chat/VirtualMessageList.vue` — нет строк в template (OK)
- `components/hermes/profiles/ProfileAvatar.vue` — нет строк в template (OK)
- `components/hermes/settings/SettingRow.vue` — получает label через props (OK)
- `components/layout/ThemeSwitch.vue` — нет строк в template (OK)
- `views/hermes/ChatView.vue` — делегирует рендеринг компонентам (OK)
- `views/hermes/FilesView.vue` — делегирует рендеринг компонентам (OK)
- `views/hermes/GroupChatView.vue` — делегирует рендеринг компонентам (OK)

**Статус:** Большинство из этих файлов корректно не используют i18n (нет пользовательских строк). Проблема только с 4 файлами, описанными выше (WorkflowsView, WorkflowKanban, ActivityFeed, FolderPicker).

---

### 12. `console.log` с отладочной информацией в group-chat store
**Файл:** `packages/client/src/stores/hermes/group-chat.ts`
**Строки:** 223, 226, 232, 237
**Проблема:** Отладочные `console.log` в продакшн-коде:
```typescript
console.log('[GroupChat] connecting...', { userId: userId.value, userName: userName.value })
console.log('[GroupChat] connected, socket id:', socket.id)
console.log('[GroupChat] disconnected:', reason)
console.error('[GroupChat] connect_error:', err.message)
```
**Риск:** Низкий (информационная утечка ID пользователя в консоль).
**Решение:** Удалить или заменить на условный debug-логгер.

---

### 13. `console.log` в chat store — утечка информации о сессиях
**Файл:** `packages/client/src/stores/hermes/chat.ts`
**Строка:** 342
**Проблема:**
```typescript
console.log(`Recovered storage: cleared ${keysToRemove.length} old session cache entries`)
```
**Риск:** Низкий.
**Решение:** Удалить или обернуть в dev-only guard.

---

## 🟢 Средние/низкие

### 14. `timeAgo` и `formatTime` дублируются между компонентами
**Файлы:** `WorkflowsView.vue` (строки 72–84), `WorkflowKanban.vue` (строки 47–53), `ActivityFeed.vue` (строки 54–62)
**Проблема:** Функция форматирования времени написана 3 раза с небольшими вариациями.
**Решение:** Вынести в общий composable или util.

---

### 15. WorkflowsView — стили не используют SCSS и переменные проекта
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Проблема:** `<style scoped>` без `lang="scss"` и без `@use '@/styles/variables'`. Хардкод цветов (`#10b981`, `#ef4444`, `#d1fae5` и т.д.) вместо CSS-переменных Naive UI.
**Решение:** Переписать на Naive UI компоненты или использовать SCSS с переменными проекта.

---

### 16. WorkflowsView — empty `selectWorkflow` function
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Строка:** 183
**Проблема:** `selectWorkflow` — пустая функция-заглушка с комментарием "Future: navigate to detail/edit view". Клик на карточку workflow не делает ничего.
**Решение:** Либо реализовать навигацию, либо убрать `@click` и курсор pointer.

---

### 17. WorkflowsView — `run` count отображается как `N runs` без локализации
**Файл:** `packages/client/src/views/hermes/WorkflowsView.vue`
**Строка:** 47
**Проблема:** `{{ wf._runCount ?? 0 }} runs` — нет pluralization для русского/других языков.
**Решение:** Использовать `t('workflows.runs', { count: wf._runCount ?? 0 })` с proper plural rules.

---

### 18. GoalPanel — минимальный компонент без ошибок, но без loading скелета
**Файл:** `packages/client/src/components/hermes/goals/GoalPanel.vue`
**Проблема:** Нет индикации загрузки — при медленном API панель пуста.
**Риск:** Низкий.
**Решение:** Добавить spinner/skeleton.

---

## Статистика
- Всего проверено файлов: **105** .vue + i18n + stores + API
- Найдено критичных (безопасность): **2**
- Найдено критичных (локализация): **4**
- Найдено важных: **7**
- Найдено средних/низких: **5**

## Приоритет исправлений

1. **🔴 Немедленно:** Token inputs без `type="password"` (безопасность)
2. **🔴 Немедленно:** Raw `fetch()` без авторизации в Workflows/ActivityFeed/GoalPanel (сломанная функциональность)
3. **🔴 Скоро:** Локализация WorkflowsView + WorkflowKanban + ActivityFeed + FolderPicker
4. **🟡 Планово:** Переписать WorkflowsView на Naive UI компоненты
5. **🟢 Когда-нибудь:** Убрать console.log, вынести общие утилиты
