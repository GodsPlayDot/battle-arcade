import {
  formatAllQuestionnaireRulesAsText,
  loadCodexQuestionnaireRules,
} from './codexQuestionnaireData';
import {
  formatAllPieceWorkshopRulesAsText,
  loadPieceWorkshopConfig,
} from './pieceWorkshopConfig';

export const COMPLETE_GAME_GUIDE_TEXT = `================================================================================
ASCENSION 3D CHESS — COMPLETE PIECE CODEX, BATTLEFIELD GUIDE, TACTICAL ACADEMY & RULES
================================================================================
Version: Master Edition (All 4 Battlefields · 10 Unit Classes · Open Surface & Surface Bound Play Styles · 3D D20 & RPS Combat · Master AI Playbook)

================================================================================
1. CORE IDENTITY & VICTORY CONDITION
================================================================================
Ascension 3D Chess is real Chess elevated onto a three-dimensional stepped architectural battlefield.
- Two Armies: White (Ivory/Gold) vs. Black (Obsidian/Indigo).
- Turn-Based Strategy: White moves first; players alternate turns.
- Sovereign Objective: The King is the sole piece that decides the game.
  You win by CHECKMATING the enemy King (or eliminating the enemy King in combat).
  There are NO artificial "King of the Hill" summit victories and NO kill-count victories.
  Controlling the 4x4 Summit Apex creates a specialized tactical region: while occupying a 4x4
  Summit tile, every non-Knight piece makes an ordinary move of 1 connected tile in any of the
  8 directions (resuming normal range on the next turn after leaving the summit), while the
  Knight is exempt and retains its legal summit jumping mobility—and only Checkmate wins the war.

================================================================================
2. THE FIVE INDEPENDENT GAME SETUP CATEGORIES
================================================================================
Setting         Choices
--------------------------------------------------------------------------------
1. Battlefield  Classic (8x8) / Battlefield (20x20) / Quick Pyramid (12x12) / Grand Pyramid (20x20)
2. Army         Standard / Kingdom
3. Combat       Standard / RPG
4. Play Style   Open Surface (Standard) / Surface Bound (Challenge)
5. Players      Human vs Human / Human vs AI / AI vs AI

--------------------------------------------------------------------------------
A. BATTLEFIELD (4 Topologies)
--------------------------------------------------------------------------------
1) Classic Chess (8x8 Flat):
   - Traditional 64-square flat tournament chessboard (Elevation 0).
   - Supports both Standard Chess and RPG Battle Chess.

2) Quick Pyramid (12x12 Stepped Ziggurat):
   - 12x12 footprint with a compressed stepped pyramid rising at the center:
     * Elevation 0 (Valley Floor): Outer 2-tile ring.
     * Elevation 1 (Low Terrace): 8x8 ring [2..9].
     * Elevation 2 (High Terrace): 6x6 ring [3..8].
     * Elevation 3 (4x4 Summit Apex): Central 4x4 platform [4..7].
   - Includes 32 playable Vertical Cliff Wall tiles between terrace steps.
   - Armies deploy only 4 files apart for rapid vertical engagements.

3) Grand Pyramid (20x20 Full Architectural Ziggurat):
   - 20x20 footprint (400 horizontal tiles + 80 playable vertical cliff wall tiles = 480 playable spaces).
   - 5 Distinct Elevation Levels:
     * Elevation 0 (Plains & Flanks): 0.00m — Outer 4-tile flanking corridors [0..3] & [16..19] plus [4, 15] ring.
     * Elevation 1 (Lower Terrace):   1.25m — 10x10 ring [5..14].
     * Elevation 2 (Middle Terrace):  2.50m — 8x8 ring [6..13].
     * Elevation 3 (Upper Terrace):   3.75m — 6x6 ring [7..12].
     * Elevation 4 (Summit Apex):     5.00m — Central 4x4 apex platform [8..11].
   - Features the Grand Pyramid specialist roster: Vanguard (all modes) and
     Gargoyle, Ascendant, and Trebuchet (RPG mode).

4) Battlefield (20x20 Flat Open Plain):
   - 400-square flat open plain (Elevation 0 across all 20x20 squares).
   - Deploys the full 20x20 specialist roster on the flat home wings alongside the classical
     army: Vanguard (x=5, 14), Gargoyle (x=4), Ascendant (x=15), and Trebuchet (x=3).
   - Built for sweeping long-range lines and massive Kingdom flank maneuvers.

--------------------------------------------------------------------------------
B. ARMY DEPLOYMENT (2 Scales)
--------------------------------------------------------------------------------
1) Standard Army:
   - Classic 8x8 & Quick Pyramid 12x12:
     16 classical Staunton pieces per side (32 total):
     1 King, 1 Queen, 2 Rooks, 2 Bishops, 2 Knights, 8 Pawns.
   - Battlefield 20x20 (Flat) & Grand Pyramid 20x20:
     21 pieces per side (42 total):
     16 classical pieces (centered on columns 6..13) + 2 Vanguards (files F & O / x=5, 14) +
     1 Gargoyle (file E / x=4) + 1 Ascendant (file P / x=15) + 1 Trebuchet (file D / x=3).

2) Kingdom Army (Multi-Flank Deployment):
   - Adds West Flank (4 inward-facing Pawns) and East Flank (4 inward-facing Pawns)
     detachments (+8 pieces per side / +16 total):
     * 24 pieces per side (48 total) on 12x12 Quick Pyramid.
     * 29 pieces per side (58 total) on 20x20 Battlefield Flat & 20x20 Grand Pyramid.

--------------------------------------------------------------------------------
C. COMBAT MODE (Standard vs. RPG Battle Chess)
--------------------------------------------------------------------------------
1) Standard Chess Mode:
   - Deterministic one-hit captures on any legal attack square.
   - Full Check, Checkmate, Stalemate, Castling, En Passant, and Pawn Promotion.

2) RPG Battle Chess Mode:
   - Every piece has HP, ATK, DEF, Evasion %, and Crit % stats.
   - TWO DISTINCT COMBAT RESOLUTION MECHANICS:
     a) Different Piece Classes (e.g., Knight vs. Rook) -> 3D D20 Dice Roll & Formula:
        - A 3D-faceted icosahedron D20 die physically rotates and lands on a roll (1..20).
        - Displays the step-by-step damage formula:
          Final Damage = round((ATK - DEF * 0.55 + D20_Mod) * Elevation_Mult * Crit_Mult)
        - Roll 20 = Automatic Natural 20 Critical Strike (1.5x damage, cannot be dodged).
        - Roll 1  = Glancing Blow (-4 damage penalty, cannot crit).
        - If Defender HP drops to 0, the attacker captures the square immediately.
        - If Defender survives with HP > 0 (on melee/non-bombard attacks), both pieces
          enter a multi-turn Ongoing Duel on that tile (up to 3 rounds).
     b) Same Piece Classes (Mirror Clash, e.g., Pawn vs. Pawn, Knight vs. Knight) -> Rock-Paper-Scissors:
        - Triggers a 4-beat "ROCK... PAPER... SCISSORS... SHOOT!" showdown.
        - Rock (🪨) crushes Scissors (✂️); Scissors (✂️) pierces Paper (📄); Paper (📄) wards Rock (🪨).
        - Ties trigger an automatic instant rematch round until a decisive winner emerges.
        - If Attacker wins RPS: Defender is eliminated outright and Attacker takes the square.
        - If Defender wins RPS: Attacker is countered and eliminated outright!

--------------------------------------------------------------------------------
D. PLAY STYLE (Open Surface vs. Surface Bound Challenge)
--------------------------------------------------------------------------------
Play Style is an independent setting that defines how pieces interact with Pyramid
surfaces, vertical walls, tile colors, and the 4x4 Summit:

1) OPEN SURFACE — Standard Pyramid Play (Default / Accessible Experience):
   - Uses the continuous-surface Pyramid movement and attack system.
   - The vertical cliff walls and horizontal terraces form one continuous folded
     checkerboard skin ("Every playable tile shares an edge only with the opposite color").
   - Pieces can move and attack freely across connected horizontal and vertical surfaces.
   - Jump-capable pieces (Knights, Gargoyles) can jump freely to any legal destination
     tile color regardless of whether they have visited the 4x4 Summit.
   - 4x4 Summit Tactical Region Law (Applies to Both Open Surface and Surface Bound):
     * While occupying a 4x4 Summit tile, every non-Knight piece makes an ordinary move of
       1 connected tile in any of the 8 directions (including when leaving the summit).
     * Starting below the summit: ordinary movement range applies when approaching it.
     * After leaving the summit: ordinary movement range resumes on the next turn without
       permanently changing a piece's range, progression state, or identity.
     * The Knight is EXEMPT and retains its legal summit jumping movement!
     * Movement and capture remain separate (e.g., a Pawn on the 4x4 Summit moves 1 tile in
       all 8 directions onto empty connected tiles, but captures strictly 1 step forward-diagonally).

2) SURFACE BOUND — Advanced / Challenge Play Style:
   - Fundamentally changes how players think about surfaces, positioning, and the summit.
   - Changes the core tactical question from "Can my piece reach that enemy?" to
     "Can I reach the correct surface from which I am allowed to fight that enemy?"
   - Activates the 9 Canonical Surface Bound Laws on Pyramid Battlefields:
     * Law 1 (Surface Classification): Every Pyramid tile belongs to one of two surface
       classes: Horizontal Surface (Plains, Terraces, 4x4 Summit) or Vertical Surface (Cliff Walls).
     * Law 2 (Same-Surface Combat Law & Pawn Exception): Non-Pawn Horizontal pieces CANNOT
       attack vertical pieces, and non-Pawn Vertical pieces CANNOT attack horizontal pieces.
       PAWN EXCEPTION: Pawns MAY attack and give check across horizontal and vertical Pyramid
       tiles, provided the target is within their legal 1-step forward-diagonal capture range
       (no backward captures, no straight-forward captures, no extra movement range).
     * Law 3 (Transition to Attack Law): A piece must first move onto the same surface
       class as its opponent before it can legally attack or capture that opponent.
     * Law 4 (Cross-Surface Blocking Law): Opposite-surface pieces CANNOT be captured
       across surface classes, but they STILL physically block sliding movement paths.
       A sliding piece must stop before the occupied opposite-surface tile.
     * Law 5 (Jump Color Law): Jump-capable pieces (Knights and Gargoyles) are bound to
       the tile color (Light or Dark) they originally started on. While color-bound, all
       jump movements and jump captures must land on that original tile color.
     * Law 6 (4x4 Summit Color Release Law): Reaching any tile of the 4x4 Summit permanently
       releases a jump-capable piece from its starting color restriction for the rest of
       the match. Once released, it may jump to either Light or Dark tiles.
     * Law 7 (Summit-to-Base Jump Law): When a jump-capable piece jumps directly from the
       4x4 Summit, its jump is restricted to legal Pyramid-base landing tiles (outer base
       ring immediately surrounding the Pyramid footprint)—or normal step/surface moves.
     * Law 8 (Check & Checkmate Law): Check and checkmate obey the exact same surface and
       color restrictions. A King on a Horizontal tile can only be checked by an enemy
       piece that is also on a Horizontal tile (and vice versa for Vertical walls). A
       color-bound jumper can only check a King sitting on its allowed tile color.
     * Law 9 (Support & Threat Law): Tactical protection, threat counts, and pins only
       count when the supporting or threatening piece can legally attack that target's
       surface class and tile color under Surface Bound rules.

================================================================================
3. COMPLETE 10-PIECE CODEX (MOVEMENT, STATS, OPEN SURFACE & SURFACE BOUND RULES)
================================================================================

1) PAWN [Icon: ♟ | Badge: All Boards]
   - RPG Stats: HP 50 | ATK 25 | DEF 12 | EVA 15% | CRIT 10%
   - Horizontal Movement (Flat Boards: 8x8 Classic & 20x20 Battlefield Flat):
     Advances 1 square forward or 1 square laterally (sideways Left or Right) across
     unobstructed ground. Can move 2 squares forward on its initial step. Captures 1 step
     diagonally forward relative to its facing. Can NEVER move backward on Flat Boards.
     Supports En Passant.
   - Pyramid & Vertical Movement (12x12 Quick Pyramid & 20x20 Grand Pyramid):
     On Pyramid Boards ONLY, Pawns can ALSO move 1 tile BACKWARD (non-capture) in addition to
     1 tile forward or sideways along the continuous surface (including climbing or descending
     vertical wall tiles and terraces). While occupying a 4x4 Summit tile, a Pawn makes an
     ordinary (non-capture) move of 1 connected tile in any of the 8 directions (including when
     leaving the summit), while its capture pattern remains strictly 1 step forward-diagonally.
     Promotes ONLY upon reaching the opposite back rank (Pawns do NOT promote or transform
     merely by reaching the 4x4 Summit; on 20x20 boards, can promote to Queen, Rook, Bishop,
     Knight, or Vanguard).
   - Surface Bound Play Style Rule (Pawn Exception):
     Pawns may attack across horizontal and vertical Pyramid tiles, provided the target is
     within their legal forward-diagonal capture range.
     * No backward captures.
     * No straight-forward captures.
     * No additional movement range.
     * Cross-surface Pawn attacks can give check.
     * This exception applies ONLY to Pawns in Surface Bound play.

2) KNIGHT [Icon: ♞ | Badge: All Boards]
   - RPG Stats: HP 80 | ATK 40 | DEF 18 | EVA 30% | CRIT 15%
   - Horizontal Movement:
     Leaps in the classical L-shape (2 squares along one axis + 1 square perpendicular),
     ignoring intervening pieces.
   - Pyramid & Vertical Movement (Open Surface):
     Leaps directly across tiers or onto vertical cliff wall tiles within L-jump geometry
     without needing to climb intermediate wall squares.
   - Surface Bound Play Style Rule:
     * Jump Color Law: Bound to the tile color (Light or Dark) of its starting square.
       All jumps and jump attacks must land on that same tile color until released.
     * 4x4 Summit Release: Reaching any tile of the 4x4 Summit permanently releases its
       color lock for the rest of the game, allowing jumps to both Light and Dark tiles.
     * Summit-to-Base Jump: Jumping from the 4x4 Summit lands on legal Pyramid-base tiles.
     * Same-Surface Combat: May only capture enemies on the same surface class.

3) BISHOP [Icon: ♝ | Badge: Range 13 · All Boards]
   - RPG Stats: HP 75 | ATK 45 | DEF 14 | EVA 20% | CRIT 20%
   - Horizontal Movement:
     Slides up to 13 unobstructed tiles diagonally.
   - Pyramid & Vertical Movement (Open Surface):
     Maintains a continuous 13-tile diagonal range across the folded pyramid surface (floor <-> wall
     <-> terrace <-> summit) without arbitrary elevation caps.
   - Surface Bound Play Style Rule:
     Naturally remains on its starting tile color. Can transition onto diagonal wall tiles within its
     13-tile range, but cannot capture across different surface classes. Opposite-surface pieces still
     block its diagonal path.

4) ROOK [Icon: ♜ | Badge: Range 18 · All Boards]
   - RPG Stats: HP 105 | ATK 50 | DEF 32 | EVA 5% | CRIT 10%
   - Horizontal Movement:
     Slides up to 18 unobstructed tiles orthogonally (ranks and files). Participates in Castling.
   - Pyramid & Vertical Movement (Open Surface):
     Maintains a continuous 18-tile straight-line orthogonal range up and down vertical cliff walls
     and across terraces without elevation limits. Serves as swap partner for friendly Vanguards.
   - Surface Bound Play Style Rule:
     Can transition between Horizontal and Vertical surfaces along orthogonal lines within its
     18-tile range. While horizontal, it can only capture horizontal enemies; while on a vertical wall,
     it can only capture vertical enemies. Opposite-surface pieces along its file/rank physically
     block its path and force it to stop before them.

5) QUEEN [Icon: ♛ | Badge: All Boards]
   - RPG Stats: HP 130 | ATK 65 | DEF 28 | EVA 25% | CRIT 25%
   - Horizontal Movement:
     Combines Rook + Bishop movement (any unobstructed orthogonal or diagonal distance).
   - Pyramid & Vertical Movement (Open Surface):
     Full multi-tier orthogonal and diagonal range across all connected horizontal and
     vertical cliff surfaces without elevation limits.
   - Surface Bound Play Style Rule:
     High mobility for repositioning between horizontal terraces and vertical walls, but
     cannot snipe across surface classes. Must first transition onto the target's surface
     class to capture or deliver check, and is blocked by opposite-surface pieces on its ray.

6) KING [Icon: ♚ | Badge: Range 13 · Sovereign Objective]
   - RPG Stats: HP 160 | ATK 35 | DEF 32 | EVA 15% | CRIT 12%
   - Horizontal Movement:
     Moves up to 13 connected squares in any of the 8 directions (4 orthogonal and 4 diagonal).
     Supports Kingside and Queenside Castling.
   - Pyramid & Vertical Movement (Open Surface):
     Moves up to 13 connected tiles in any of the 8 directions across the continuous surface,
     including climbing or descending vertical cliff walls and terraces. Cannot move into check.
   - Surface Bound Play Style Rule:
     Can traverse up to 13 connected tiles between Horizontal and Vertical surfaces, changing which
     enemies are legally allowed to attack or check it! A King on a Horizontal tile can only be
     checked by horizontal attackers; a King on a Vertical wall can only be checked by vertical attackers.

7) VANGUARD [Icon: Custom Spearhead Shield SVG (⛨) | Badge: 20x20 Boards]
   - Availability: 20x20 Battlefield Flat & 20x20 Grand Pyramid (Both Standard and RPG — 2 per side).
   - RPG Stats: HP 90 | ATK 46 | DEF 24 | EVA 25% | CRIT 15%
   - Movement (9 -> 1 Irreversible Forward Contraction):
     * Moves forward ONLY along its deployment orientation (never backward; never sideways
       on horizontal tiles).
     * Starts with a 9-tile forward range in home territory, contracting irreversibly as it
       advances toward the center: 9 -> 8 -> 7 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1 tile at the
       center and beyond. Cannot jump over occupied tiles.
   - Vertical-Wall Exception & Rook Exchange:
     * While occupying a Vertical Cliff Wall tile, unlocks sideways movement and capture.
     * Exclusive Ability — Rook Exchange: Only a Vanguard can initiate this switch, and it can
       ONLY switch board positions with a living Rook of its OWN team anywhere on the 20x20
       board (consuming the turn, subject to King safety).
   - Surface Bound Play Style Rule:
     Obeys Same-Surface Combat and Cross-Surface Blocking. Rook Exchange swaps both pieces'
     current surface classes (a Rook swapped onto a vertical wall immediately becomes a
     vertical-surface piece).

8) GARGOYLE [Icon: Custom Winged Stone Sentinel SVG (❖) | Badge: 20x20 Boards]
   - Availability: 20x20 Battlefield Flat & 20x20 Grand Pyramid (Both Standard and RPG — 1 per side at file E / x=4).
   - RPG Stats: HP 80 | ATK 42 | DEF 16 | EVA 35% | CRIT 20%
   - Movement & Stone Bulwark:
     * On flat Tier-0 ground (20x20 Battlefield Flat or Valley floor): steps or leaps up to
       2 tiles orthogonally, diagonally, or in Knight L-hops.
     * On Pyramid Terraces (Tier 1+) or Vertical Cliff Walls: awakens 3-tile winged glide
       and cliff perch mobility, plus Stone Bulwark (+10 DEF & +15% EVA on vertical walls;
       +6 DEF & +10% EVA on terraces; +1 D20 roll; and 20% Ally Guard Aura).
   - Surface Bound Play Style Rule:
     When using jump/glide movement, obeys the Jump Color Law (bound to starting tile color
     until reaching the 4x4 Summit, which permanently releases it to use both colors) and
     Same-Surface Combat Law.

9) ASCENDANT [Icon: Custom Stepped Ziggurat Spire & Star SVG (✦) | Badge: 20x20 Boards]
   - Availability: 20x20 Battlefield Flat & 20x20 Grand Pyramid (Both Standard and RPG — 1 per side at file P / x=15).
   - RPG Stats: HP 85 | ATK 44 | DEF 20 | EVA 25% | CRIT 20%
   - Movement & Developing Stride (Stage I -> II -> III):
     * Stage I (Base Home Ranks): 2 connected tiles orthogonally or diagonally.
     * Stage II (Mid Advancement or Pyramid Tier 1-2): 3 connected tiles.
     * Stage III (Deep Advancement or Pyramid Tier 3-4): 4 connected tiles.
   - RPG Elevation Resonance:
     * Gains +4 ATK, +3 DEF, and +5% Crit per elevation tier occupied, plus permanent stat
       tempering (+2 ATK, +2 DEF, +8 HP heal per tier climbed). Ignores uphill penalties.
   - Surface Bound Play Style Rule:
     As a non-jumping surface strider, obeys Same-Surface Combat and Cross-Surface Blocking.
     Must occupy the same surface class as its target to attack.

10) TREBUCHET [Icon: Custom Counterweight Siege Engine SVG (☄) | Badge: 20x20 Boards]
    - Availability: 20x20 Battlefield Flat & 20x20 Grand Pyramid (Both Standard and RPG — 1 per side at file D / x=3).
    - RPG Stats: HP 75 | ATK 52 | DEF 14 | EVA 5% | CRIT 15%
    - Jump-Capture & 3-Tile Knockback Bombardment:
      * Must Jump to Capture: The Trebuchet MUST physically jump onto an enemy piece (within
        1-2 tiles) to capture it! It can also reposition 1-2 orthogonal tiles onto empty
        horizontal ground (cannot climb vertical cliff walls).
      * Knockback Bombardment (☄): Bombardment does NOT capture; instead, it knocks the
        targeted enemy piece back 3 tiles onto any random open tile while the Trebuchet stays
        on its square!
      * On-Pyramid 4x4 Summit Rule: If the Trebuchet gets on the Pyramid (Tier 1+), it can
        ONLY bombard targets on the 4x4 Summit! Off the Pyramid (Tier 0 / Flat), it bombards
        3-6 tiles along 8 compass rays.
    - Surface Bound Play Style Rule:
      Because the Trebuchet is a Horizontal-Surface piece, in Surface Bound mode its 1-2 tile
      Jump-Captures and ranged 3-tile Knockback Bombardments can only strike enemy targets on
      Horizontal Surfaces (and when on the Pyramid, Bombardment is restricted exclusively to
      the 4x4 Summit).

================================================================================
4. PYRAMID VISIBILITY & STRAIGHT STACKED ELEVATION BEACONS
================================================================================
- Straight Stacked Elevation Rows (L1, L2, L3...):
  Obscured pieces behind the Pyramid project straight vertical flagpoles rising into level
  horizontal stacked rows at clean 34px elevation intervals above the Pyramid silhouette.
- Beacon Side Modes: Off / Opponent Only / Both Sides.
- Dynamic Pyramid Opacity (0% to 100%) & Auto-Glass Transparency when action is occluded.

================================================================================
5. MASTER AI ADVANTAGE CONVERSION DOCTRINE & 10-POINT EVALUATION HIERARCHY
================================================================================
Doctrine:
"When the opponent has few pieces remaining (or when the AI holds overwhelming force),
stop treating every surviving enemy piece as the primary objective. Coordinate the army
to restrict, trap, and checkmate the King."

- Normal Game State:       develop -> defend -> gain position -> attack
- Advantage Conversion:    contain -> coordinate -> compress -> force -> mate

The 10-Point AI Evaluation Hierarchy:
1. Forced checkmate
2. Prevent own forced checkmate
3. Build / maintain a multi-piece mating net
4. Restrict enemy King mobility (shrink legal escape tiles)
5. Prevent escape from containment (rank/file cutoffs, territory compression & surface trapping)
6. Coordinate additional attackers (bring 2nd, 3rd, 4th pieces into the cordon; never chase with a lone piece)
7. Remove critical defenders
8. Give productive checks (a check that merely makes the King run is penalized compared to a non-checking move that removes future escape squares)
9. Improve attack position & approach
10. Gain material

================================================================================
6. TACTICAL ACADEMY & HANDS-ON INTERACTIVE DRILLS
================================================================================
- Drill 1: The Vanguard Sprint & Rook Exchange (20x20 Grand Pyramid · Standard)
- Drill 2: Vertical Wall Flanking & Pawn Sidestep (20x20 Grand Pyramid · Standard)
- Drill 3: Grand Pyramid RPG Trio — Gargoyle, Ascendant & Trebuchet (20x20 Grand Pyramid · RPG)
- Drill 4: Mirror-Class RPS & 3D D20 High-Ground Clash (12x12 Quick Pyramid · RPG)
- Drill 5: Surface Bound Challenge — 4x4 Summit Color Release & Same-Surface Combat (12x12 Quick Pyramid · Surface Bound)
- Drill 6: 4x4 Summit Tactical Region — 1-Tile Non-Knight Rule, Knight Exemption & Capture Separation (12x12 Quick Pyramid · Open Surface)
================================================================================
`;

export function downloadCompleteGameGuideTxt(): void {
  const fullText = `${COMPLETE_GAME_GUIDE_TEXT}\n\n${formatAllPieceWorkshopRulesAsText(
    loadPieceWorkshopConfig()
  )}\n\n${formatAllQuestionnaireRulesAsText(
    loadCodexQuestionnaireRules()
  )}`;
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ASCENSION_3D_CHESS_COMPLETE_CODEX_AND_RULES.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
