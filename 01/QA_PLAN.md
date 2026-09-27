# QA protocol

Every game change must pass `npm run check`, `npm run build`, and a browser pass before it is considered ready.

## Browser pass

For each game, test the entry screen, all primary navigation, an action that changes state, a return to the prior screen, and persistence after reopening. Record console errors and whether they are expected.

| Game | Required stress paths |
| --- | --- |
| Grid Combat | Select moves and targets; reject invalid target; confirm turn; AI toggle; battle royale; upgrade screen; rules/strategy/admin panels; restart/return flow. |
| Spin Arena | Select each starter top; customize/save a top; equip loadout; choose a normal and generated level; win/loss/retry; settings/help/unlock state. |
| Slime Arcade | Create slime; stat upgrade boundary; learn/equip/unequip ability; every training-game launch/exit; PC and generated opponent battles; auto-battle; win/loss/reward; settings export; reload persistence. |
| Ascension Chess | Start a match; select/move each piece type; confirm legal/illegal move feedback; trigger combat and promotion paths; AI turn; tutorial, piece guide, settings, and reload persistence. |

## Reporting standard

Each finding is tagged as one of: **functional defect**, **balance concern**, **onboarding issue**, **performance issue**, or **external dependency**. A feature is only marked verified after the specific path has been exercised in the browser.

## Verified runs

### 2026-09-27 — Spin Arena entry and arena selection

- **Verified:** starter-top selection, arena selection, and Level 1 match launch in the production preview.
- **Fix:** starter tops and arena cards were mouse-only clickable containers. They are now semantic buttons with keyboard focus, descriptive accessible names, and disabled handling for locked arenas.
- **Console:** no errors observed after launching the Level 1 match.
- **Still unverified:** match win/loss/retry, generated arena, customization persistence, loadout changes, settings, help, and unlock replacement flow.
