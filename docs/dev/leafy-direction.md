# Leafy: direction and licence

Decision (Murillo, 2026-11-08): Leafy is built **on top of this openGym fork** and is published **free and open source under AGPL-3.0-or-later**, the same licence as openGym.

## Why

- A clean rebuild (Expo + Firebase) was started to keep the app closed. It was dropped: openGym already has workout logging, progression, recovery, an Android app, a sync server and 5,632 exercises. Rebuilding that would be months of work for a worse result.
- Free and open source makes reuse of openGym code legal. The AGPL asks that the source of the whole app stays available to its users and that the original copyright notices stay (Duarte Santos, see LICENSE and NOTICE.md).

## What stays the same

- The exercise media (Gym visual) are **not** AGPL. Only the 180 px files may sit in the repository. They are never fed to an AI tool, and never copied or traced for new drawings.
- Charging for a subscription or showing ads is still allowed by the AGPL, but anyone may fork the code and do the same.

## What Leafy adds (in `frontend/src/lib/leafy/`)

- `dates.ts`, `garden.ts`, `recognition.ts`, `suggestion.ts`, `plan.ts`: the calm daily layer (Seu Dia, the leaf garden, gentle recognition, the movement of the day, free and premium features). Pure functions, each with a test beside it.
- `figure/`: an original side-view figure drawn in SVG and animated between two poses, with the worked muscles in green. 59 movement templates and a classifier that places every exercise on one of them. `catalogue-adapter.ts` maps the openGym catalogue (5,632 exercises) onto it. The drawings are our own; nothing is copied from photos or animations of third parties.

## Next

1. Show the figure in the exercise sheet in place of (or beside) the licensed media.
2. Seu Dia and the garden as the home screen, with the Leafy look.
3. Tone, onboarding and copy.
4. Rename the app and the package once the new home screen is in.
