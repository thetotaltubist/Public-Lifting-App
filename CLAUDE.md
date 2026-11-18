# Notes for Claude

- Audience: anyone busy who likes to lift and wants to keep making progress without the gym taking over their life. The core is people roughly 35 to 65, but nothing should assume an age. Keep screens and setup simple.
- Name: Every Set Counts. The home screen shows "Every Set" (`expo.name`) so it isn't cut off; the App Store name is "Every Set Counts: Lifting Plan". Ask John before changing the app ID (`ios.bundleIdentifier`).
- The plan is built on weekly volume and published research. Every rule the engine applies should have an entry in `src/science.ts`.
- Apple Health is read-only, weight and sleep only.
- Paid app, one-time low price. No accounts, ads or in-app purchases. Data stays on the phone.
- Work in small, single-feature pull requests. Run `npm test`, `npx tsc --noEmit`, `npx expo lint` and `npx expo install --check` before pushing.
- Add or update packages only with `npx expo install`, never plain `npm install <pkg>`. No pre-release versions (rc, beta).
- If a visual bug survives one fix, reproduce it (simulator in the same light/dark mode, or a screen recording) before changing more code.
- Write commit messages and in-app text in plain words.
- JS-only changes ship over the air. Native changes (modules, permissions, icon, splash) need a new build: bump `ios.buildNumber` in `app.json`.
