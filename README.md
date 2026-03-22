# MistralProto

Генерация UI-прототипов из описания требований с помощью Mistral AI.

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка

Создай файл `.env` в корне проекта:

```env
MISTRAL_KEY=твой_api_ключ_mistral
```

Опционально:

```env
MISTRAL_MODEL=mistral-small-latest   # модель по умолчанию
API_PORT=3001                        # порт API
SERVER_PORT=3000                     # порт превью HTML
DATABASE_URL=postgresql://user:pass@localhost:5432/mistralproto   # PostgreSQL (для сессий и диалогов)
```

**PostgreSQL** — для работы сессий и диалогов в API. Схема создаётся автоматически при запуске API или вручную:

```bash
npm run db:migrate
```

### 3. Запуск

**CLI (интерактивный режим):**

```bash
npm start
```

Вводи запросы в консоли. Поддерживаются файлы из папки `input/` (.txt, .pdf, .docx).

---

**API-сервер:**

```bash
npm run api
```

API: `http://localhost:3001` (или порт из `API_PORT`).

**Сессии и диалоги** (при наличии `DATABASE_URL`):

- `POST /api/sessions` — создать сессию
- `POST /api/sessions/:id/dialogues` — создать диалог
- `GET /api/sessions/:id/dialogues` — список диалогов
- `GET /api/dialogues/:id?session_id=` — диалог с сообщениями
- `POST /api/dialogues/:id/send` — отправить сообщение, запустить pipeline, сохранить в БД

---

**Тесты:**

```bash
npm test
```

## Команды в CLI

- `exit` — выход
- `save` — сохранить последний результат в `output/`
- Имя файла (например `requirements.txt`) — загрузить текст из `input/`
