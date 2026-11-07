# Family Fortune Wheel 🎡

A colourful wheel of fortune for kids, full of playful drawing challenges.
Tap **„Drehen!“**, watch the wheel spin, and the app shows the challenge in
large text and reads it aloud in German.

**▶ Play it here: <https://kleinnconrad.github.io/app.family.fortunewheel/>**

The app's user interface is entirely in German; the code and documentation are in English.

## Features

- **Wheel of fortune** with all challenges written on the segments, plus an emoji for each.
- **Start button** („Drehen!“), or tap the wheel itself. The wheel never repeats the same challenge twice in a row.
- **Audio output**:
  - The challenge is read aloud in German using the browser's built-in speech synthesis (Web Speech API).
  - Clicking sounds while the wheel spins and a short fanfare when it stops, synthesised with the Web Audio API (no audio files).
  - A „Ton an / Ton aus“ toggle. The choice is remembered on the device.
- **Text display**: the result card shows the challenge in large text, with a button to read it aloud again („Nochmal vorlesen“).
- **10-second timer** for the „in nur 10 Sekunden“ challenge.
- Works on phones, tablets and desktops. Respects „reduced motion“ settings and needs no backend, account or tracking. The font is self-hosted, so the app makes no requests to third parties.

## Challenges

The challenges live in [`src/tasks.ts`](src/tasks.ts). Edit that list to change the wheel.
Segment text sizes and line breaks are calculated automatically.

| # | Challenge |
|---|-----------|
| 1 | Male irgendwas, aber in nur 10 Sekunden |
| 2 | Male eine Sonne mit geschlossenen Augen |
| 3 | Male ein Haus mit der schwachen Hand |
| 4 | Ziehe einen geraden Strich von einer Bildzeitung zur anderen |
| 5 | Zerschneide das Blatt in zwei Teile |
| 6 | Male einen Regenbogen – aber nur mit einer Farbe |
| 7 | Male Wolken – aber nur mit geraden Strichen |
| 8 | Zerknüll das Papier und streiche es wieder glatt |

## Development

Requirements: Node.js 22.12 or newer (CI uses the version in [`.nvmrc`](.nvmrc)).

```bash
npm ci            # install the exact versions from package-lock.json
npm run dev       # start the dev server at http://localhost:5173
npm test          # run the unit tests (Vitest)
npm run typecheck # type-check with TypeScript
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run check     # typecheck + tests + build
```

### Project structure

```
index.html            Page markup (German UI texts)
src/main.ts           App wiring: spinning, result display, sound toggle, timer
src/tasks.ts          The challenges, emojis and segment colours
src/wheel.ts          Renders the wheel as SVG
src/layout.ts         Fits the challenge texts into the wedge-shaped segments
src/spin.ts           Spin maths: random target, landing angle, easing
src/speech.ts         German text-to-speech (Web Speech API)
src/audio.ts          Synthesised sound effects (Web Audio API)
src/countdown.ts      Countdown used by the 10-second timer
src/confetti.ts       Small canvas confetti effect
src/style.css         Styles
public/favicon.svg    Favicon
```

Built with [Vite](https://vite.dev/) and TypeScript, no UI framework. The font is
[Fredoka](https://fonts.google.com/specimen/Fredoka), bundled via
[Fontsource](https://fontsource.org/).

## Deployment

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
It type-checks, tests and builds the app, then publishes `dist/` to GitHub Pages.
Pull requests run the same checks without deploying.

One-time setup: in the repository, open **Settings → Pages** and set
**Build and deployment → Source** to **GitHub Actions**.

The build uses a relative base path (`base: './'` in `vite.config.ts`), so it works under
`https://<user>.github.io/<repo>/` without further configuration.

## Dependency management

- **Lock file**: `package-lock.json` pins every direct and transitive dependency.
  CI installs with `npm ci`, which fails if the lock file and `package.json` disagree.
- **Dependabot** ([`.github/dependabot.yml`](.github/dependabot.yml)) checks npm packages and
  GitHub Actions weekly. Minor and patch updates are grouped into a single pull request.
  Each update PR changes `package.json` and `package-lock.json` together.
- For security fixes in transitive dependencies, enable **Dependabot alerts** and
  **Dependabot security updates** under **Settings → Code security**.

## Browser notes

- Read-aloud uses the voices installed on the device. Most systems include a German voice.
  If none is found, the browser's default voice is asked to speak German.
- Browsers only allow sound after a user interaction. Sound and speech therefore start
  with the first tap on „Drehen!“.
