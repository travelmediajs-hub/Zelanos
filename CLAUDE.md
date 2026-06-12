# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Zelanos Tours — Контекст за разработка

## За проекта

Вътрешна система за управление на турове на **Zelanos** — еднодневни турове, обиколни турове, коли под наем, гидове и автопарк. UI изцяло на **български**.

## Команди

```bash
npm run dev        # Vite dev сървър
npm run build      # Production build
npm run preview    # Преглед на production build
```

Няма тестове, линтър и TypeScript — кодът е plain JSX.

## Технологичен стек

- **Vite 6** + **React 18** (`@vitejs/plugin-react-swc`), JavaScript/JSX (без TypeScript)
- **Supabase** — auth (email/парола), PostgreSQL, Realtime
- Без router — навигацията е `useState('dashboard')` в `App.jsx` + `navItems` списък
- Без UI библиотека — стиловете са в `src/index.css`

## Архитектура

### Поток на данните (най-важното)

Цялото състояние живее в **`src/hooks/useAppState.js`** — по един масив на домейн (tours, guides, vehicles, fuel, fines, carTasks, stopsCarBus, stopsGuide, roundTrips, catalog, carRentals). Ключов механизъм е `useSyncedState`:

- Страниците ползват обикновен `setX(prev => [...])` — wrapper-ът прави **diff между prev и next и автоматично синхронизира** промените към Supabase в background (`syncDiff` от `src/utils/db.js`).
- Всеки state има и `setXDirect` вариант, който пише **без** sync — ползва се само за първоначално зареждане от базата и за входящи realtime промени. Ако добавяш нов flow, внимавай кой setter ползваш, иначе ще получиш sync цикли или загубени записи.
- `src/hooks/useRealtimeSync.js` слуша Supabase Realtime (INSERT/UPDATE/DELETE) и обновява state-а през direct setter-ите.

### Конвенции за данни

- Клиентът работи в **camelCase**, базата е в **snake_case** — конверсията е автоматична в `db.js`, `migrate.js` и `useRealtimeSync.js`.
- Мапингът state ключ → таблица е `TABLE_MAP` в `db.js` (напр. `stopsCarBus` → `stops_car`). При нова таблица трябва да се добави и в `TABLE_TO_STATE` в `useRealtimeSync.js`.
- **Изчислени полета не се пишат в базата** — `EXCLUDE_FIELDS` (`totalExpenses`, `balanceEur`, `id`, `created_at`) се махат от всеки запис преди insert/update.

### Fallback и миграция

- Без `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` приложението работи изцяло на **localStorage** (`src/utils/storage.js`, ключ `zelanosData`); `src/utils/supabase.js` тогава експортира `null` — всички sync пътища проверяват `if (supabase)`.
- `src/utils/migrate.js` — еднократна миграция localStorage → Supabase.

### База данни

Схемата е в **`supabase-schema.sql`** — пуска се ръчно в Supabase SQL Editor (няма миграционен инструмент). 12 таблици: vehicles, guides, catalog, tours, fuel, fines, car_tasks, stops_car, stops_guide, round_trips, car_rentals, tour_languages.

- RLS е включен на всички таблици, но политиките са **"Allow all"** — реалният достъп се пази от Supabase Auth на ниво приложение (`useAuth.js` + `LoginPage`).
- Всички таблици са с `replica identity full` — нужно за realtime DELETE/UPDATE събития. Нова таблица трябва да се добави и към realtime publication.
- Централната таблица е `tours` — съдържа резервацията, клиента, цените и всички разходи (exp_guide, exp_driver, exp_fuel, exp_entry_fees...) като колони.

## Структура

```
src/App.jsx              — навигация (групи: ПРОДАЖБИ, ХОРА, ТРАНСПОРТ) + layout
src/pages/               — по една страница на nav елемент; TourForm/RoundTripForm са форми,
                           MergeCard е помощен компонент за Dashboard
src/components/Modal.jsx — единственият споделен компонент
src/hooks/               — useAppState (state + sync), useAuth, useRealtimeSync
src/utils/               — supabase (клиент), db (CRUD+diff sync), storage (localStorage),
                           migrate, helpers
supabase-schema.sql      — пълната схема, source of truth за базата
```

## Env променливи

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
