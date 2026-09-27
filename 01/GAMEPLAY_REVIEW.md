# Gameplay review

This review separates each game's genre-specific goal from shared arcade features. The launcher should never make progress in one game change combat balance in another.

## Grid Combat — tactical skirmish

**Core loop:** select one or two skills, choose legal grid targets, resolve the turn, then respond to positioning, resource pools, and status effects.

**What works:** the action economy (HP, MP, and stamina) gives skills distinct trade-offs; line-of-sight, terrain, rifts, summons, and turn sequencing produce real tactical choices.

**Main friction:** the first screen exposes a very large skill library before a player has learned the basic move/target/confirm loop. This makes the game read as a toolset before it reads as a duel.

**Recommended next change:** add a short first-match tutorial that highlights one legal move tile, one legal attack tile, and Confirm Moves. Keep the full skill system unchanged; reveal the advanced books after that first resolved turn.

## Spin Arena — physics/action battler

**Core loop:** choose or customize a top, select a level/loadout, then manage movement, arena geometry, collisions, and specials during a fast fight.

**What works:** the three starter tops establish readable play styles, and generated levels have deterministic seeds, which makes a level replayable and debuggable.

**Completed improvements:**

- Level selection now previews enemy HP, speed, spin, and signature special before a fight.
- Collision priority now weights committed forward momentum ahead of passive spin/stability, so a deliberate charge is not punished as a mutual hit.
- Near-even impacts are stability-only clashes; standard hits damage only the defender. The Rules screen now states this correctly.
- Camera shake is capped at 8px and the vibration monitor scales to that cap.
- The live Impact Feed explains every hit or clash, including impact angle, resolved damage, and stability protection.
- Compatible interaction upgrades from the later `game-spinning-top (1)` project are incorporated: arrow-key movement alongside WASD, plus an on-arena ability bar with clickable Space/Shift specials and cooldown feedback.
- New unlock choices now replace Slot 1 or Slot 2 and save that loadout immediately for future matches. If the power budget would overflow, the other slot is cleared rather than leaving the new unlock unusable.
- Each match records important hits, clashes, special activations, and sniper shots. The win/loss overlay now plays those events back before the player chooses the next action.
- Sniper projectiles now always inflict 1 HP damage and stability damage; their hit path no longer references an uninitialized spark list.

**Verified browser pass (September 24, 2026):** selected Cyclone, launched Training Grounds, observed live collisions, impact-feed entries, vibration monitor output, the imported ability bar, and a special activation with a normal 14.7-second match-time cooldown (not an invalid wall-clock cooldown). No browser console errors were observed in this path.

**Recommended next change:** add a compact pre-fight matchup panel: enemy HP/speed/spin, its signature threat, and one suggested player stat or special. It informs a choice without weakening the action game.

## Slime Arcade — pet progression + turn-based battle + mini-games

**Core loop:** train or play mini-games for experience, level the slime, spend tokens/AP, choose a battle action, then collect battle rewards.

**What works:** the stat/ability progression has immediate consequences, and the battle resolution panel makes randomness inspectable instead of opaque.

**Completed fixes:**

- Learning an ability twice no longer burns AP or duplicates it in the loadout.
- Battles now work without a Gemini key: local opponent and commentary fallbacks preserve the intended game loop.

**Recommended next change:** show an explicit estimated reward and opponent difficulty before entering an adventure. That makes the quarter/training and risk/reward economy easier to plan around.

## Ascension Chess — tactical chess RPG

**Core loop:** move a chess piece through legal board positions, resolve encounters through its RPG combat layer, and use promotion and tactical positioning to outplay the opponent.

**QA focus:** verify the tutorial, piece guide, legal-move feedback, combat resolution, AI turn, promotion paths, and settings persistence before treating it as fully verified.

## Shared arcade layer

**Completed:** a local arcade profile records first-time arena exploration, 25 XP per new world, favorites, last-played state, and achievements. It does not transfer combat stats, currency, or unlocks between unrelated games.

**Design boundary:** shared progress should reward breadth of play only. Game-specific wins, top parts, slime stats, and tactical saves should remain owned by their game.
