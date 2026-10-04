# Mail Orchestrator

Личный оркестратор email-рассылок через Unisender Go.

## Стек

- **Next.js** — UI + Server Actions
- **PostgreSQL** — кампании, получатели, статусы
- **Worker** — отдельный Node-процесс, шлёт батчами с паузой
- **Docker Compose** — db / app / worker

## Быстрый старт (локально)

1. Скопируйте env:

```bash
cp .env.example .env
```

2. Поднимите Postgres:

```bash
docker compose up -d db
```

> На Windows часто уже заняты порты 5432/5433 локальным Postgres — в `docker-compose` БД проброшена на **5434**.

3. Миграции и зависимости:

```bash
npm install
npx prisma migrate dev --name init
```

4. Два терминала:

```bash
npm run dev
npm run dev:worker
```

Откройте http://localhost:3000 — вход по логину и паролю.

- Текущий аккаунт: `APP_LOGIN` / `APP_PASSWORD` (по умолчанию `operator` / `changeme`).
- Super admin: `SUPER_ADMIN_LOGIN` / `SUPER_ADMIN_PASSWORD`. После входа в шапке появится **Аккаунты** (`/admin`) — там можно создать новые логины.

## Полный Docker

```bash
docker compose up --build
```

## Вебхук статусов

1. Пропиши публичный URL в `.env`:

```bash
APP_BASE_URL=https://your-domain.com
```

Локально — через ngrok / cloudflare tunnel.

2. **Провайдер → Зарегистрировать в Unisender**

Или вручную в кабинете Unisender Go → Вебхуки:
- URL: `https://your-domain.com/api/webhooks/unisender`
- Format: `json_post`
- Events: sent, delivered, opened, clicked, bounced, spam…

Поллинг UI обновляет страницу, пока идёт отправка или ждутся статусы доставки.
