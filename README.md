# Podoromo

Podoromo is a cozy, responsive Pomodoro web app built with Vite, TypeScript, and SCSS. It uses a modular vanilla frontend, localStorage persistence, timestamp-based timer logic, todos, a digital desk clock, tab title updates, toast notifications, and a soft generated alert sound.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## MVP Features

- Presets: 25/5, 50/10, 15/3, 90/15.
- Custom focus, short break, long break, and sessions-before-long-break values.
- Start, pause, resume, reset, skip.
- Timer calculated from absolute timestamps so hidden tabs stay accurate.
- Todo add, complete, delete, pin, and localStorage persistence.
- Digital desk clock.
- Session toast, sound toggle, optional browser notifications.
- Responsive desktop, tablet, and mobile layouts with mobile todo drawer.
