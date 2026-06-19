# Платформа Beefurca (Монорепозиторий)

**Beefurca** — универсальная высокопроизводительная веб-и-мобильная платформа
коллективного пользования для автоматизации турниров, учёта результатов и
ведения сквозного ELO-рейтинга по любым дисциплинам (киберспорт, шахматы,
настольные игры, локальные состязания).

Поддерживаются три режима турниров:

- **PRO** — официальные турниры верифицированных организаторов; полный (100 %)
  пересчёт глобального ELO. Создавать могут только роли `Organizer`/`Admin`.
- **AMATEUR** — любительские турниры, создаёт любой зарегистрированный
  пользователь; влияют на ELO только если у создателя выставлен флаг
  `is_trusted` (с понижающим коэффициентом).
- **SANDBOX** («песочница») — быстрый учёт «на коленке»: участники вписываются
  строками вручную без регистрации, ELO не начисляется.

---

## 1. Структура монорепозитория

Репозиторий управляется через `pnpm workspaces` и `Turborepo`:

| Путь | Назначение |
|------|------------|
| `apps/api` | ElysiaJS бэкенд (REST + SSE), бизнес-логика, аутентификация |
| `apps/web` | Next.js (App Router) веб-клиент для админов и организаторов |
| `apps/mobile` | React Native / Expo — приложение для игроков и судей |
| `packages/database` | PostgreSQL + Drizzle ORM: схема, индексы, конфиг миграций |
| `packages/shared-types` | Общие Zod-схемы валидации и типы TypeScript |
| `packages/bracket-engine` | Изоморфный движок сеток (Single/Double Elim, Round Robin, Swiss) |
| `packages/elo-calculator` | Математическое ядро расчёта ELO-рейтинга |
| `packages/excel-generator` | Серверный генератор отчётов `.xlsx` (ExcelJS) |

---

## 2. Архитектурные особенности

1. **JWT-сессии с Refresh-токенами.** Access-токен (15 м) + Refresh-токен (7 д)
   в `httpOnly, secure` cookie с ротацией в Redis. Бан пользователя мгновенно
   сбрасывает все его сессии (проверка `is_banned`/`is_deleted` в middleware на
   каждый запрос).
2. **Вход через Discord OAuth.** Регистрация и вход по аккаунту Discord (см.
   раздел 6). Аккаунты без локального пароля поддерживаются.
3. **Авто-генерация ключей.** При первом старте сервер создаёт пару 2048-битных
   RSA-ключей для подписи JWT (RS256) в папке `keys/`, если их нет.
4. **Bootstrap Admin.** При отсутствии администраторов система создаёт первого
   админа по настройкам `.env`.
5. **Полноценная матрица сеток.** Single Elimination, Double Elimination (с
   точным маппингом проигравших в нижнюю сетку), Round Robin, Swiss (очковые
   группы + Buchholz + блокировка рематчей). Автоматическая обработка **BYE**
   при нечётном числе участников (игрок без соперника проходит без игры).
6. **Real-Time SSE через PostgreSQL LISTEN/NOTIFY.** Обновления сеток
   транслируются по Server-Sent Events; событие публикуется в Postgres
   (`pg_notify`), а каждый инстанс API раздаёт его своим подписчикам — работает
   при горизонтальном масштабировании.
7. **Мягкое удаление (soft delete).** Аккаунты не стираются физически:
   `is_deleted=true` + обезличивание ПДн, статистика матчей сохраняется.
8. **Кастомные поля матчей (EAV).** Организатор задаёт доп-поля (карта, стол,
   пароль и т.п.); они хранятся в JSONB и валидируются динамически Zod-схемой.
9. **Регламентированная Excel-отчётность.** Отчёт о популярности дисциплин и
   статистика игрока с автоподсчётом итогов и форматированием.

---

## 3. Технологический стек

| Категория | Инструмент |
|-----------|-----------|
| Язык | TypeScript (end-to-end) |
| Среда выполнения | Node.js 20+ (прод) / Bun (локальная разработка и тесты) |
| Бэкенд-фреймворк | ElysiaJS |
| СУБД | PostgreSQL 16 (JSONB, LISTEN/NOTIFY) |
| Кэш / Сессии / Rate limit | Redis 7.4 (ioredis) |
| ORM | Drizzle ORM + Drizzle-Kit |
| Валидация | Zod / TypeBox |
| Auth | jose (RS256) + bcryptjs (12 раундов) + Discord OAuth2 |
| Отчётность | ExcelJS |
| Веб | Next.js (App Router) |
| Мобильное | React Native + Expo (EAS) |

---

## 4. Быстрый старт (локальная разработка)

### Предварительные требования
- **Node.js 20+** и **pnpm 8.15.4** (`npm i -g pnpm@8.15.4`).
- **Docker** (для PostgreSQL и Redis) — либо собственные инстансы Postgres 16 и
  Redis 7.
- **Bun** (опционально, для запуска тестов): установка
  `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows) или
  `curl -fsSL https://bun.sh/install | bash` (Linux/macOS).

### Шаги

1. **Установка зависимостей:**
   ```bash
   pnpm install
   ```

2. **Запуск базы данных и Redis:**
   ```bash
   docker-compose up -d
   ```

3. **Переменные окружения** — скопируйте пример и заполните значения
   (см. раздел 5):
   ```bash
   cp .env.example .env
   ```

4. **Применение схемы БД** (Drizzle push создаёт/обновляет таблицы):
   ```bash
   pnpm --filter @beefurca/database db:push
   ```

5. **Запуск проекта:**
   ```bash
   pnpm dev
   ```
   API поднимется на `http://localhost:5000` (health-check: `/health`).

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
| `ALLOWED_ORIGINS` | Список разрешённых CORS-источников через запятую (домены фронтов) |
| `FRONTEND_URL` | Куда редиректить после успешного входа через Discord |
| `DISCORD_CLIENT_ID` | Client ID приложения Discord |
| `DISCORD_CLIENT_SECRET` | Client Secret приложения Discord |
| `DISCORD_REDIRECT_URI` | Redirect URI: `<API_URL>/auth/discord/callback` |

> ⚠️ В проде обязательно задайте свой `BOOTSTRAP_ADMIN_PASSWORD` и реальный
> `ALLOWED_ORIGINS` (иначе CORS заблокирует фронтенд).

---

## 6. Настройка входа через Discord (OAuth2) — пошагово

### Шаг 1. Создать приложение
1. Откройте **https://discord.com/developers/applications** и войдите.
2. Нажмите **«New Application»**, задайте имя (например, `Beefurca`), примите
   условия и нажмите **Create**.

### Шаг 2. Получить Client ID и Client Secret
1. В левом меню откройте вкладку **OAuth2**.
2. Скопируйте **Client ID** → в `.env` как `DISCORD_CLIENT_ID`.
3. Рядом нажмите **Reset Secret**, подтвердите, скопируйте **Client Secret** →
   в `.env` как `DISCORD_CLIENT_SECRET`. (Секрет показывается один раз —
   сохраните сразу.)

### Шаг 3. Указать Redirect URI
1. На той же вкладке **OAuth2** найдите блок **Redirects** → **Add Redirect**.
2. Добавьте адрес callback вашего **бэкенда**:
   - для локальной разработки: `http://localhost:5000/auth/discord/callback`
   - для прода: `https://<ваш-домен-api>/auth/discord/callback`
3. Нажмите **Save Changes**.
4. Это же значение пропишите в `.env` как `DISCORD_REDIRECT_URI` — оно должно
   **в точности совпадать** (схема, домен, порт, путь), иначе Discord отклонит
   запрос с ошибкой `invalid redirect_uri`.

### Шаг 4. Scopes
Бэкенд запрашивает scopes `identify email` автоматически. Никаких дополнительных
настроек на стороне Discord для этого не требуется — но чтобы приходил email,
у пользователя он должен быть подтверждён.

### Шаг 5. Прописать остальные переменные
В `.env`:
```dotenv
DISCORD_CLIENT_ID=ваш_client_id
DISCORD_CLIENT_SECRET=ваш_client_secret
DISCORD_REDIRECT_URI=http://localhost:5000/auth/discord/callback
FRONTEND_URL=http://localhost:3000
```

### Шаг 6. Как это работает (поток авторизации)
1. Фронтенд делает кнопку «Войти через Discord» как **обычную ссылку** на
   `GET <API_URL>/auth/discord` (это браузерный редирект, не `fetch`).
2. Бэкенд редиректит пользователя на страницу согласия Discord (с CSRF-`state`).
3. После согласия Discord возвращает пользователя на
   `GET <API_URL>/auth/discord/callback?code=...&state=...`.
4. Бэкенд обменивает `code` на токен Discord, получает профиль (`id`, `username`,
   `email`), затем:
   - если есть пользователь с таким `discord_id` — входит в него;
   - иначе если есть аккаунт с тем же `email` — привязывает Discord к нему;
   - иначе создаёт нового пользователя (роль `Player`, без пароля).
5. Бэкенд выставляет `httpOnly` cookie с токенами и редиректит на `FRONTEND_URL`.

> Аккаунт, созданный через Discord, не имеет локального пароля — вход по
> `email/password` для него вернёт подсказку войти через Discord. Задать пароль
> можно позже через `PUT /users/me`.

---

## 7. Справочник API

Базовый префикс отсутствует; роуты сгруппированы по модулям. Защищённые эндпоинты
требуют access-токен (cookie `access_token` или заголовок `Authorization: Bearer`).

### Аутентификация (`/auth`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация `{nickname,email,password,fullName?,phone?}` (роль всегда `Player`) |
| POST | `/auth/login` | Вход `{email,password}` |
| POST | `/auth/refresh` | Ротация токенов по refresh-cookie |
| POST | `/auth/logout` | Выход, отзыв refresh-токена |
| GET | `/auth/discord` | Старт OAuth — редирект на Discord |
| GET | `/auth/discord/callback` | Callback OAuth — выдача сессии |

### Пользователи и команды (`/users`)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/users/me` | Профиль + команды текущего пользователя |
| PUT | `/users/me` | Обновить профиль `{nickname?,email?,password?,fullName?,phone?}` |
| DELETE | `/users/me` | Мягкое удаление своего аккаунта (обезличивание + отзыв сессий) |
| POST | `/users/teams` | Создать команду `{name}` (создатель — капитан) |
| POST | `/users/teams/:id/members` | Добавить игрока в команду `{nickname}` (только капитан) |
| DELETE | `/users/teams/:id/members/:playerId` | Удалить игрока / выйти из команды |
| GET | `/users/teams` | Список всех команд |
| GET | `/users/me/tournaments` | История турниров пользователя |
| GET | `/users/:id/elo-history` | История изменения ELO (для графиков) |
| GET | `/users/referees` | Список пользователей (для назначения судьёй) |
| GET | `/users/:id/discipline-stats` | Статистика игрока по дисциплинам |
| GET | `/users/disciplines/:disciplineId/leaderboard?page=` | Лидерборд по дисциплине (кэш Redis, пагинация) |

### Турниры (`/tournaments`)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/tournaments/disciplines` | Активные дисциплины |
| POST | `/tournaments/` | Создать турнир (PRO → Organizer/Admin; AMATEUR/SANDBOX → любой) |
| GET | `/tournaments/` | Список турниров |
| GET | `/tournaments/:id` | Детали: турнир + участники + матчи |
| POST | `/tournaments/:id/join` | Заявка на участие `{teamId?}` (PRO/AMATEUR) |
| POST | `/tournaments/:id/participants` | Ручной ввод участника `{nickname,teamName?}` (только SANDBOX) |
| POST | `/tournaments/:id/approve/:participantId` | Одобрить заявку (организатор) |
| POST | `/tournaments/:id/generate-bracket` | Сгенерировать сетку и стартовать турнир |
| POST | `/tournaments/:id/next-round` | Сгенерировать следующий тур (Swiss) |
| POST | `/tournaments/:id/participants/import` | Импорт участников из Excel-файла |
| GET | `/tournaments/:id/stream` | SSE-поток обновлений сетки |
| PUT | `/tournaments/:id/matches/referee` | Массово назначить судью незавершённым матчам `{refereeId?}` |
| GET | `/tournaments/:id/standings` | Турнирная таблица |
| POST | `/tournaments/:id/complete` | Отметить турнир завершённым |

### Матчи (`/matches`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/matches/:id/score` | Ввод счёта `{score1,score2,customFieldsData?}` (судья; rate-limit) |
| POST | `/matches/:id/tech-defeat` | Техническое поражение `{loserParticipantId}` (судья; rate-limit) |
| PUT | `/matches/:id/referee` | Назначить судью на матч `{refereeId?}` |
| PUT | `/matches/:id/metadata` | Обновить кастомные поля матча `{customFieldsData}` |

### Администрирование (`/admin`, только роль `Admin`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/admin/disciplines` | Добавить официальную дисциплину `{name,gameType,rules?}` |
| GET | `/admin/users` | Список пользователей |
| PUT | `/admin/users/:id/ban` | Бан/разбан `{isBanned}` (мгновенный отзыв сессий) |
| PUT | `/admin/users/:id/trust` | Выдать/снять флаг `is_trusted` `{isTrusted}` |
| PUT | `/admin/users/:id/role` | Сменить роль `{role}` |
| DELETE | `/admin/users/:id` | Мягкое удаление пользователя |
| GET | `/admin/reports/popularity?startDate&endDate` | Отчёт популярности дисциплин (`.xlsx`) |
| GET | `/admin/reports/player/:id?startDate&endDate` | Статистика игрока (`.xlsx`) |

### Служебное
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Проверка живости сервиса |

---

## 8. Форматы турниров — нюансы

- **BYE (нечётное число участников).** Движок добивает сетку до степени двойки и
  автоматически продлевает игроков без соперника (как на этапе генерации, так и
  во время игры, когда «мёртвая» ветка вскрывается после реального матча).
- **Round Robin** генерирует все туры сразу при старте (метод кругов).
- **Swiss** генерирует только первый тур при старте; каждый следующий —
  отдельным вызовом `POST /tournaments/:id/next-round` после того, как все матчи
  текущего тура завершены. Пары считаются по очкам и Buchholz, рематчи
  блокируются; bye засчитывается как победа.
- **Double Elimination** хранит связи проигравших (`loser_next_match_id`) в БД —
  продвижение в нижнюю сетку выполняется без пересчёта математики во время игры.

---

## 9. Развёртывание (Production)

### Бэкенд (`apps/api`) → Railway
Деплой через встроенный `Dockerfile` (Node 20). Перед первым запуском задайте
переменные окружения (раздел 5) и примените схему:
```bash
pnpm --filter @beefurca/database db:push
```
Обязательные переменные на Railway: `DATABASE_URL`, `REDIS_URL`,
`BOOTSTRAP_ADMIN_*`, `ALLOWED_ORIGINS`, и блок `DISCORD_*` + `FRONTEND_URL`,
если используется вход через Discord.

### Веб-клиент (`apps/web`) → Vercel
- Root directory: `apps/web`
- Build command: `pnpm --filter web build`
- Переменная `NEXT_PUBLIC_API_URL` → домен API на Railway.
- Домен Vercel добавьте в `ALLOWED_ORIGINS` бэкенда.

### Мобильный клиент (`apps/mobile`) → EAS Build
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # готовый APK
```

---

## 10. Заметки по безопасности

- Оба JWT-cookie — `HttpOnly; Secure; SameSite=Lax`.
- CORS ограничен списком `ALLOWED_ORIGINS` (не `*`).
- Пароли — bcrypt (12 раундов); подпись JWT — RS256.
- Rate limiting на судейских эндпоинтах (`/score`, `/tech-defeat`).
- Бан и удаление аккаунта мгновенно отзывают все refresh-сессии в Redis.
- Роль при регистрации всегда `Player`; повышение прав — только через
  `PUT /admin/users/:id/role`.
