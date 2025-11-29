# eat2track

Телеграм мини-приложение для учета питания с упором на быстрое редактирование КБЖУ и работу с собственным каталогом продуктов.

## Возможности MVP
- Слайдер по дням недели с подсветкой сегодняшнего дня.
- Сводка КБЖУ выбранного дня.
- Список продуктов дня с возможностью менять вес или прямо корректировать КБЖУ сохраненной позиции.
- Добавление нового продукта: поиск с историей запросов и ручной ввод с расчетом на выбранный вес.

## Запуск
1. Установите зависимости (нужен Node 20+ — Vercel тоже использует 20.x):
   ```bash
   npm install
   npm run dev
   ```
   > Если видите ошибку `No matching version found for @twa-dev/sdk`, удалите старый `package-lock.json`/кеш установки: зависимость зафиксирована на стабильной версии `7.10.0` (без RC) и должна устанавливаться без отклонений.
2. Скопируйте `.env.example` в `.env` и подставьте свои Supabase ключи (формат Vite):
   ```bash
   cp .env.example .env
   ```

   > В CI или на Vercel заведите переменные окружения `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` — без них сборка упадёт.
3. При локальной разработке можно фиксировать Node версию через `.nvmrc` (`nvm use`), чтобы избежать дрейфа версии.

## Переменные окружения
- `VITE_SUPABASE_URL` — URL проекта Supabase.
- `VITE_SUPABASE_ANON_KEY` — публичный anon-key.

### Деплой на Vercel
- Vercel автоматически определит Vite и соберёт приложение командой `npm run build`. Фронтенд лежит в `dist`.
- Чтобы избежать ошибки `@npmcli/ci-detect` из-за несовместимой версии Node, задайте в проекте переменную окружения `NODE_VERSION=20` (или поставьте значение в настройках Build & Development Settings). Также можно подключить `.nvmrc` — он фиксирует локальную версию 20.
- При необходимости можно переопределить команды и выходную директорию в `vercel.json` (уже добавлен в репозиторий).

### Локальная установка зависимостей
Если npm-репозиторий блокируется корпоративной политикой, можно использовать публичный прокси или локальный .npmrc. В CI (Vercel) стандартный доступ к registry.npmjs.org необходим для установки зависимостей.

## Стек
- React + TypeScript + Vite
- Zustand для стейта (готов к использованию, подключение supabase-js для последующей синхронизации).

## Подключение Telegram-бота к мини-приложению
1. Создайте бота через @BotFather (`/newbot`). Сохраните токен `BOT_TOKEN`.
2. Задайте домен Web App в @BotFather: `/setdomain` → ваш прод-домен (например, `https://eat2track.vercel.app`). Домен должен быть https и совпадать с URL, который вы передаете кнопке.
3. Включите кнопку открытия Web App в чате командой `/setmenubutton` → Web App → тот же URL.
4. Запустите простого бота, который шлет кнопку с Web App. Ниже — минимальный пример на Node 20 + `telegraf`:
   ```ts
   // bot.ts
   import { Telegraf, Markup } from 'telegraf'

   const BOT_TOKEN = process.env.BOT_TOKEN!
   const WEBAPP_URL = process.env.WEBAPP_URL || 'https://eat2track.vercel.app'

   const bot = new Telegraf(BOT_TOKEN)

   bot.start((ctx) => {
     ctx.reply(
       'Открыть дневник питания',
       Markup.inlineKeyboard([
         Markup.button.webApp('Открыть мини‑апп', WEBAPP_URL),
       ])
     )
   })

   bot.launch()
   ```
   Запуск:
   ```bash
   npm install telegraf
   BOT_TOKEN=123:abc WEBAPP_URL=https://eat2track.vercel.app node bot.ts
   ```
5. Проверьте, что ссылка открывает приложение внутри Telegram. Если видите «Классическое представление», значит домен не совпадает с доменом из `/setdomain`.
6. Для локальной проверки используйте туннель (ngrok, Cloudflare Tunnel) и временно задайте его https-домен в `/setdomain`.

### Советы по дебагу
- Если Web App не открывается внутри Telegram, убедитесь, что сертификат валидный и домен совпадает с тем, что вы передали @BotFather.
- Добавьте логирование `console.log(ctx.from)` в хендлере `start`, чтобы видеть `user.id`, который приходит в WebApp через `window.Telegram.WebApp.initDataUnsafe`.
- В проде храните `BOT_TOKEN` и `WEBAPP_URL` как секреты на хостинге, не коммитьте их в репозиторий.
