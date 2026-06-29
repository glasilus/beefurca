# Платформа Beefurca (Монорепозиторий)

**Beefurca** — веб-информационная система организации и учёта соревнований по
**любым дисциплинам** (киберспорт, шахматы, настольные игры, локальные
состязания). Участники регистрируются сами, организатор за пару кликов создаёт
турнир, система автоматически строит и **визуализирует турнирную сетку в
реальном времени**, судьи вносят счёт, рейтинг ELO пересчитывается сквозно, а
итоги выгружаются в **Excel-отчёты**.

Поддерживаются **два режима** проведения:

- **STANDARD (обычный)** — участники зарегистрированы на платформе, организатор
  подтверждает заявки, результаты влияют на глобальный ELO-рейтинг. Создавать
  могут роли `Organizer`/`Admin`.
- **SANDBOX (автономный, «песочница»)** — быстрый локальный учёт: имена
  участников вписываются строками вручную, без регистрации; ELO не начисляется.
  Создать может любой пользователь. Это современная замена бумажной сетке и
  десктопному АРМ.

> ℹ️ Это **упрощённая версия для курсового проекта**. Полная платформа (мобильное
> приложение, вход через Discord, сетки Swiss и Double Elimination, кастомные
> поля матчей, тиры PRO/Amateur с коэффициентами доверия) сохранена в ветке
> **`full-platform`** и теге **`v1.0-full`**.

---

## 1. Структура монорепозитория

Репозиторий управляется через `pnpm workspaces` и `Turborepo`:

| Путь | Назначение |
|------|------------|
| `apps/api` | ElysiaJS бэкенд (REST + SSE), бизнес-логика, аутентификация |
| `apps/web` | Next.js (App Router) веб-клиент |
| `packages/database` | PostgreSQL + Drizzle ORM: схема, индексы, конфиг |
| `packages/shared-types` | Общие Zod-схемы валидации и типы TypeScript |
| `packages/bracket-engine` | Движок сеток: Single Elimination + Round Robin |
| `packages/elo-calculator` | Математическое ядро расчёта ELO-рейтинга |
| `packages/excel-generator` | Серверный генератор отчётов `.xlsx` (ExcelJS) |

---

## 2. Архитектурные особенности

1. **JWT-сессии с Refresh-токенами.** Access-токен (15 м) + Refresh-токен (7 д)
   в `httpOnly, secure` cookie с ротацией в Redis. Бан пользователя мгновенно
   сбрасывает все его сессии (проверка `is_banned`/`is_deleted` в middleware).
2. **Авто-генерация ключей.** При первом старте сервер создаёт пару RSA-ключей
   для подписи JWT (RS256) в папке `keys/`, если их нет.
3. **Bootstrap + demo-аккаунты.** При отсутствии администраторов создаётся
   первый админ по `.env`; дополнительно засеваются demo-учётки (см. раздел 4).
4. **Движок сеток.** Single Elimination (олимпийская, на вылет) и Round Robin
   (круговая). Автоматическая обработка **BYE** при нечётном числе участников
   (игрок без соперника проходит без игры) — как при генерации, так и во время
   игры, когда «мёртвая» ветка вскрывается после реального матча.
5. **Real-Time SSE через PostgreSQL LISTEN/NOTIFY.** Обновления сеток
   транслируются по Server-Sent Events: событие публикуется в Postgres
   (`pg_notify`), каждый инстанс API раздаёт его подписчикам — работает при
   горизонтальном масштабировании.
6. **Мягкое удаление (soft delete).** Аккаунты не стираются физически:
   `is_deleted=true` + обезличивание ПДн, статистика матчей сохраняется. При
   старте турнира никнеймы/составы копируются в `tournament_participants` —
   история защищена от будущих переименований.
7. **Регламентированная Excel-отчётность.** Отчёт о популярности дисциплин
   (с разделением на официальные/автономные) и статистика игрока — с
   автоподсчётом итогов и форматированием.

---

## 3. Технологический стек

| Категория | Инструмент |
|-----------|-----------|
| Язык | TypeScript (end-to-end) |
| Среда выполнения | Node.js 20+ (прод) / Bun (тесты ядер) |
| Бэкенд-фреймворк | ElysiaJS |
| СУБД | PostgreSQL 16 (LISTEN/NOTIFY) |
| Кэш / Сессии / Rate limit | Redis 7.4 (ioredis) |
| ORM | Drizzle ORM + Drizzle-Kit |
| Валидация | Zod / TypeBox |
| Auth | jose (RS256) + bcryptjs (12 раундов) |
| Отчётность | ExcelJS |
| Веб | Next.js (App Router), Tailwind, дизайн в стиле PC-98 |

---

## 4. Быстрый старт (локальная разработка)

### Предварительные требования
- **Node.js 20+** и **pnpm 8.15.4** (`npm i -g pnpm@8.15.4`).
- **Docker** (для PostgreSQL и Redis) — либо свои Postgres 16 и Redis 7.

### Шаги

1. **Установка зависимостей:** `pnpm install`
2. **БД и Redis:** `docker-compose up -d`
3. **Переменные окружения:** `cp .env.example .env` (см. раздел 5)
4. **Схема БД** (Drizzle push создаёт/обновляет таблицы):
   `pnpm --filter @beefurca/database db:push`
5. **Запуск:** `pnpm dev` — API на `http://localhost:5000` (`/health`),
   веб на `http://localhost:3000`.

### Demo-учётные записи

Создаются автоматически при первом старте API (для удобства защиты):

| Роль | Логин | Пароль |
|------|-------|--------|
| Администратор | `admin@beefurca.com` | `admin123` |
| Организатор | `organizer@beefurca.com` | `organizer123` |
| Игрок | `player@beefurca.com` | `player123` |

На странице входа эти учётки продублированы — клик подставляет логин/пароль.

### Тесты математических ядер (движок сеток + ELO, на Bun):
```bash
pnpm test
```

---

## 5. Переменные окружения

Полный список — в `.env.example`. Ключевые:

| Переменная | Назначение |
|------------|------------|
| `PORT` | Порт API (по умолчанию 5000) |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | Строка подключения PostgreSQL |
| `REDIS_URL` | Строка подключения Redis |
| `JWT_PUBLIC_KEY_PATH` / `JWT_PRIVATE_KEY_PATH` | Пути к PEM-ключам RS256 (генерируются автоматически) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Срок жизни токенов (`15m` / `7d`) |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` / `_NICKNAME` | Учётка первого администратора |
| `ALLOWED_ORIGINS` | Список разрешённых CORS-источников через запятую |

> Блок `DISCORD_*` и `FRONTEND_URL` в `.env.example` сохранён для совместимости
> с полной версией (ветка `full-platform`); в упрощённой версии не используется.

**Переменные фронтенда:** `NEXT_PUBLIC_API_URL` (`apps/web`) — базовый URL API
(по умолчанию `http://localhost:5000`), задаётся на этапе **сборки** Next.js.

---

## 6. Справочник API

Защищённые эндпоинты требуют access-токен (cookie `access_token` или заголовок
`Authorization: Bearer`).

### Аутентификация (`/auth`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация `{nickname,email,password,fullName?,phone?}` (роль всегда `Player`) |
| POST | `/auth/login` | Вход `{email,password}` |
| POST | `/auth/refresh` | Ротация токенов по refresh-cookie |
| POST | `/auth/logout` | Выход, отзыв refresh-токена |

### Пользователи и команды (`/users`)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/users/me` | Профиль + команды текущего пользователя |
| PUT | `/users/me` | Обновить профиль |
| DELETE | `/users/me` | Мягкое удаление своего аккаунта |
| POST | `/users/teams` | Создать команду `{name}` (создатель — капитан) |
| POST | `/users/teams/:id/members` | Добавить игрока в команду `{nickname}` |
| DELETE | `/users/teams/:id/members/:playerId` | Удалить игрока / выйти |
| GET | `/users/teams` | Список всех команд |
| GET | `/users/me/tournaments` | История турниров пользователя |
| GET | `/users/:id/elo-history` | История изменения ELO |
| GET | `/users/referees` | Список пользователей (для назначения судьёй) |
| GET | `/users/:id/discipline-stats` | Статистика игрока по дисциплинам |
| GET | `/users/disciplines/:disciplineId/leaderboard?page=` | Лидерборд по дисциплине |

### Турниры (`/tournaments`)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/tournaments/disciplines` | Активные дисциплины |
| POST | `/tournaments/disciplines` | Создать пользовательскую дисциплину |
| POST | `/tournaments/` | Создать турнир (STANDARD → Organizer/Admin; SANDBOX → любой) |
| GET | `/tournaments/` | Список турниров |
| GET | `/tournaments/:id` | Детали: турнир + участники + матчи |
| POST | `/tournaments/:id/join` | Заявка на участие `{teamId?}` (STANDARD) |
| POST | `/tournaments/:id/participants` | Ручной ввод участника (только SANDBOX) |
| POST | `/tournaments/:id/approve/:participantId` | Одобрить заявку (организатор) |
| POST | `/tournaments/:id/reject/:participantId` | Отклонить заявку |
| POST | `/tournaments/:id/generate-bracket` | Сгенерировать сетку и стартовать |
| POST | `/tournaments/:id/participants/import` | Импорт участников из Excel |
| GET | `/tournaments/:id/stream` | SSE-поток обновлений сетки |
| PUT | `/tournaments/:id/matches/referee` | Массово назначить судью |
| GET | `/tournaments/:id/standings` | Турнирная таблица |
| POST | `/tournaments/:id/complete` | Отметить турнир завершённым |

### Матчи (`/matches`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/matches/:id/score` | Ввод счёта `{score1,score2}` (судья; rate-limit) |
| POST | `/matches/:id/tech-defeat` | Техническое поражение `{loserParticipantId}` |
| PUT | `/matches/:id/referee` | Назначить судью на матч `{refereeId?}` |
| PUT | `/matches/:id/live-score` | Промежуточный счёт (трансляция на табло) |

### Администрирование (`/admin`, только роль `Admin`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/admin/disciplines` | Добавить официальную дисциплину |
| PUT | `/admin/disciplines/:id` | Редактировать дисциплину |
| DELETE | `/admin/disciplines/:id` | Удалить дисциплину |
| PUT | `/admin/disciplines/:id/official` | Промоут/понижение официальной |
| GET | `/admin/users` | Список пользователей |
| PUT | `/admin/users/:id/ban` | Бан/разбан `{isBanned}` |
| PUT | `/admin/users/:id/role` | Сменить роль `{role}` |
| DELETE | `/admin/users/:id` | Мягкое удаление пользователя |
| GET | `/admin/reports/popularity?startDate&endDate` | Отчёт популярности (`.xlsx`) |
| GET | `/admin/reports/player/:id?startDate&endDate` | Статистика игрока (`.xlsx`) |

### Служебное
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Проверка живости сервиса |

---

## 7. Форматы турниров — нюансы

- **BYE (нечётное число участников).** Движок добивает сетку до степени двойки и
  автоматически продлевает игроков без соперника (на этапе генерации и во время
  игры).
- **Round Robin** генерирует все туры сразу при старте (метод кругов).
- **Ничьи.** В олимпийской системе ничья недопустима (нужен победитель для
  продвижения по сетке); в круговой — допустима, матч фиксируется без победителя.

---

## 8. Развёртывание (Production)

В репозитории два `Dockerfile` (`apps/api/Dockerfile`, `apps/web/Dockerfile`,
multi-stage на `node:20-alpine`): поддерживаются **самостоятельный хостинг через
Docker** и **managed-платформы** (Railway + Vercel).

Порядок один и тот же:

1. Поднять PostgreSQL 16 и Redis 7.
2. Задать переменные окружения (раздел 5).
3. **Один раз** применить схему БД: `pnpm --filter @beefurca/database db:push`.
4. Запустить API, затем веб. RSA-ключи JWT, bootstrap-админ и demo-аккаунты
   создаются автоматически при первом старте API.

**Managed:** бэкенд (`apps/api`) → Railway (по `apps/api/Dockerfile`; обязательны
`DATABASE_URL`, `REDIS_URL`, `BOOTSTRAP_ADMIN_*`, `ALLOWED_ORIGINS`); веб
(`apps/web`) → Vercel (root `apps/web`, build `pnpm --filter web build`,
`NEXT_PUBLIC_API_URL` → домен API). Домен Vercel добавьте в `ALLOWED_ORIGINS`.

### Чек-лист перед запуском
- [ ] Свой `BOOTSTRAP_ADMIN_PASSWORD` и смена пароля Postgres.
- [ ] `ALLOWED_ORIGINS` содержит реальные домены фронта (не `*`, не localhost).
- [ ] `NODE_ENV=production` у API.
- [ ] `NEXT_PUBLIC_API_URL` указывает на прод-API (задан при сборке веба).
- [ ] Схема БД применена (`db:push`).
- [ ] Стабильные RSA-ключи JWT при нескольких инстансах API.

---

## 9. Заметки по безопасности

- Оба JWT-cookie — `HttpOnly; Secure`.
- CORS ограничен списком `ALLOWED_ORIGINS` (не `*`).
- Пароли — bcrypt (12 раундов); подпись JWT — RS256.
- Rate limiting на судейских эндпоинтах (`/score`, `/tech-defeat`).
- Бан и удаление аккаунта мгновенно отзывают все refresh-сессии в Redis.
- Роль при регистрации всегда `Player`; повышение — только через
  `PUT /admin/users/:id/role`.
