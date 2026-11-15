# Nova prototype (web user test)

A web version of the Nova member app for a 5-day user test, published with
GitHub Pages from the `/docs` folder. It is a copy of the member app from the
main (private) repository with a **prototype mode** added.

## Prototype mode

Turned on with `EXPO_PUBLIC_PROTOTYPE=1` (the web build always sets it).

- No backend and no login: the app answers its own API requests on the device
  (`apps/mobile/src/prototype/localServer.ts`). Profile, plan, schedule and
  workouts are stored in the browser's local storage.
- Plans come from the same plan generator as the real app; streaks from the
  same local streak logic.
- Notifications are off. Nova Coach uses its built-in answers (no AI).
- Without the flag the app works exactly like the normal app (with its API).

On the web, SQLite runs with sql.js (`src/web/sqlite.ts`) because GitHub Pages
can't send the headers expo-sqlite needs; phone builds are unchanged
(see `apps/mobile/metro.config.js`).

## User test tracking

Each tester gets a personal link with an ID, e.g.
`https://taher-18.github.io/nova-prototype/?t=T1`. The ID is saved on the
device and these events are sent to the Google Apps Script endpoint in
`src/prototype/tracking.ts` (tester, event, ISO timestamp):
`app_open`, `plan_created`, `workout_logged`. Failures are ignored.

The Progress tab lists every logged workout with its date and time, so
testers can screenshot it.

## Build the website

```bash
npm install
npm run build:web          # exports to /docs (base path /nova-prototype, 404.html, .nojekyll)
```

Run locally while developing: `npm run start:prototype`.
