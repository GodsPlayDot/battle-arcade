export type RuleStatus = 'CONFIRMED' | 'UNDECIDED' | 'SUPERSEDED';
export type RuleDecisionAnswer = 'Yes' | 'No' | 'Depends' | 'Undecided' | 'Custom Rule';

export interface CodexRuleQuestionItem {
  questionNumber: number;
  sectionNumber: number;
  sectionTitle: string;
  questionText: string;
  ruleId: string;
  ruleName: string;
  status: RuleStatus;
  decision: RuleDecisionAnswer;
  dependsOn?: string;
  appliesTo: string;
  playStyle: string;
  combatMode: string;
  rule: string;
  doesNotAllow: string[];
  check: string;
  example: string;
  supersededPriorWording?: string;
  openQuestions: string;
}

export const CODEX_QUESTIONNAIRE_SECTIONS: {
  sectionNumber: number;
  title: string;
  questionRange: string;
}[] = [
  { sectionNumber: 1, title: '1. Game Identity and Victory', questionRange: 'Q1–Q5' },
  { sectionNumber: 2, title: '2. Boards and Tile Geometry', questionRange: 'Q6–Q10' },
  { sectionNumber: 3, title: '3. Army Selection and Deployment', questionRange: 'Q11–Q15' },
  { sectionNumber: 4, title: '4. Traditional Piece Movement', questionRange: 'Q16–Q23' },
  { sectionNumber: 5, title: '5. Special Piece Movement', questionRange: 'Q24–Q30' },
  { sectionNumber: 6, title: '6. Open Surface and Surface Bound', questionRange: 'Q31–Q38' },
  { sectionNumber: 7, title: '7. Jump Color and Summit Rules', questionRange: 'Q39–Q46' },
  { sectionNumber: 8, title: '8. Standard Chess Special Rules', questionRange: 'Q47–Q51' },
  { sectionNumber: 9, title: '9. RPG Combat', questionRange: 'Q52–Q60' },
  { sectionNumber: 10, title: '10. Turn Order, Legality, and Edge Cases', questionRange: 'Q61–Q67' },
  { sectionNumber: 11, title: '11. AI, Teaching, and Implementation', questionRange: 'Q68–Q72' },
];

export const DEFAULT_CODEX_QUESTIONNAIRE_RULES: CodexRuleQuestionItem[] = [
  // ============================================================================
  // SECTION 1: GAME IDENTITY AND VICTORY (Q1 - Q5)
  // ============================================================================
  {
    questionNumber: 1,
    sectionNumber: 1,
    sectionTitle: '1. Game Identity and Victory',
    questionText:
      'Is checkmate the only way to win in both Standard and RPG Combat, or can an RPG attack eliminate the King to win?',
    ruleId: 'VICTORY-01',
    ruleName: 'Checkmate and RPG Monarch Elimination Victory',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn: 'Depends on whether the match is played in Standard Combat or RPG Combat.',
    appliesTo: 'All 4 Boards (Classic 8x8, Battlefield 20x20, Quick Pyramid 12x12, Grand Pyramid 20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'In Standard Combat, Checkmate is the sole board-play victory condition. In RPG Combat, a player wins either by delivering legal Checkmate OR by reducing the enemy King to 0 HP during an RPG combat clash (including if an attacking King is countered and eliminated by a defender). There are no King-of-the-Hill summit victories and no piece-count victories.',
    doesNotAllow: [
      'Winning merely by standing on the 4x4 Summit',
      'Winning by capturing all non-King pieces without checkmating or reducing the enemy King to 0 HP',
    ],
    check:
      'The King remains subject to check and checkmate in both Standard and RPG Combat.',
    example:
      'In Standard mode, trapping the enemy King with no legal escape moves wins by Checkmate. In RPG mode, striking a wounded enemy King and reducing its HP to 0 immediately wins the match.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 2,
    sectionNumber: 1,
    sectionTitle: '1. Game Identity and Victory',
    questionText: 'Does the King move one tile or up to 13 tiles?',
    ruleId: 'KING-01',
    ruleName: 'Sovereign 13-Tile Omni-Directional Range',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards (Classic 8x8, Battlefield 20x20, Quick Pyramid 12x12, Grand Pyramid 20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The King moves and captures up to 13 unobstructed connected tiles in any of the 8 compass directions (4 orthogonal and 4 diagonal). It must stop before friendly pieces, stops on the first enemy piece it captures, and can never move onto a tile that is under enemy check.',
    doesNotAllow: [
      'Moving more than 13 connected tiles in a single turn',
      'Jumping over occupied tiles',
      'Moving onto or ending a turn on any tile under enemy check',
    ],
    check:
      'Because the King has a 13-tile range, two opposing Kings cannot move within an unobstructed 13-tile legal attack ray of one another.',
    example:
      'A King on an open rank or diagonal may slide up to 13 connected tiles across flat ground, vertical cliff walls, and terraces in one turn, provided the destination square is safe from check.',
    supersededPriorWording:
      'SUPERSEDED RULE (KING-00): Previously, the King moved 1 square in any of the 8 directions (or up to 2 tiles when descending from an elevated Pyramid terrace). Replaced by confirmed rule KING-01 (13-tile range in all 8 directions).',
    openQuestions: 'None.',
  },
  {
    questionNumber: 3,
    sectionNumber: 1,
    sectionTitle: '1. Game Identity and Victory',
    questionText:
      'What counts as check in RPG Combat: being a legal attack target, being at risk of losing HP, or something else?',
    ruleId: 'CHECK-01',
    ruleName: 'Definition of Check in Standard and RPG Combat',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'A King is in check whenever at least one living opposing piece has a legal capture move onto the King’s current tile under the active Play Style rules. Ranged knockback actions that do not capture (such as Trebuchet Bombardment) do not count as direct capture check.',
    doesNotAllow: [
      'Leaving your King on a tile where an enemy piece has a legal capture move',
      'Ignoring check in RPG mode simply because the King still has high HP',
    ],
    check:
      'Being a legal capture target defines Check identically in both Standard and RPG Combat.',
    example:
      'Even if a King has 160 HP in RPG mode, it cannot step onto a square that an enemy Rook can legally capture on the next turn.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 4,
    sectionNumber: 1,
    sectionTitle: '1. Game Identity and Victory',
    questionText:
      'Which draws exist: stalemate, repetition, move-count limits, insufficient mating material, or agreed draw?',
    ruleId: 'DRAW-01',
    ruleName: 'Recognized Draw Conditions',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Stalemate is the primary board draw: if the player whose turn it is has no legal moves and their King is NOT in check, the game ends immediately in a Stalemate draw. The AI also actively avoids threefold/oscillation loops via anti-repetition scoring penalties rather than claiming passive draws.',
    doesNotAllow: [
      'Making a move when no legal move keeps your King out of check',
      'Winning a game when the opponent is stalemated (not in check with zero legal moves)',
    ],
    check:
      'If the King IS in check and has zero legal moves, it is Checkmate (a win), not Stalemate.',
    example:
      'If Black’s King is not in check and every legal move for Black would place Black’s King into check, the game is declared a Stalemate draw.',
    openQuestions:
      'Optional future toggle for formal 50-move rule or mutual player draw offer button.',
  },
  {
    questionNumber: 5,
    sectionNumber: 1,
    sectionTitle: '1. Game Identity and Victory',
    questionText:
      'Can a player resign or manually end a game? How is that result recorded?',
    ruleId: 'MATCH-01',
    ruleName: 'Manual End Game, Restart, and Undo Controls',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Players can manually end a match at any time using the "End" button in the top HUD bar, undo the previous turn using the "Undo" button, or start a fresh match via "New Game". Ending a match manually halts the active game state without awarding a false checkmate win in the AI learning log.',
    doesNotAllow: [
      'Recording a manually stopped match as a fake checkmate victory in AI training memory',
    ],
    check: 'N/A (Match administration rule).',
    example:
      'Clicking "End" stops the clock and AI simulation immediately and returns the board to the pre-game Ready state.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 2: BOARDS AND TILE GEOMETRY (Q6 - Q10)
  // ============================================================================
  {
    questionNumber: 6,
    sectionNumber: 2,
    sectionTitle: '2. Boards and Tile Geometry',
    questionText:
      'What are the exact playable dimensions and surfaces of Classic, Battlefield, Quick Pyramid, and Grand Pyramid?',
    ruleId: 'BOARD-01',
    ruleName: 'The Four Battlefield Topologies',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      '1) Classic Chess (8x8): 64 flat horizontal tiles at Elevation 0. 2) Battlefield (20x20 Flat): 400 flat horizontal tiles at Elevation 0. 3) Quick Pyramid (12x12): 144 horizontal tiles across 4 elevations (Tier 0 outer ring, Tier 1 [2..9] 8x8, Tier 2 [3..8] 6x6, Tier 3 [4..7] 4x4 Summit) plus 32 vertical cliff wall tiles (176 playable spaces). 4) Grand Pyramid (20x20): 400 horizontal tiles across 5 elevations (Tier 0 [0..4 & 15..19], Tier 1 [5..14] 10x10, Tier 2 [6..13] 8x8, Tier 3 [7..12] 6x6, Tier 4 [8..11] 4x4 Summit) plus 80 vertical cliff wall tiles (480 playable spaces).',
    doesNotAllow: [
      'Moving outside the board coordinate boundaries',
      'Using vertical cliff wall rules on flat boards (Classic 8x8 and Battlefield 20x20 have zero vertical walls)',
    ],
    check: 'Check operates across all playable tiles of the selected battlefield.',
    example:
      'On Grand Pyramid 20x20, files I, J, K, L and ranks 9, 10, 11, 12 (indices 8..11) form the central 4x4 Summit at Elevation Tier 4.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 7,
    sectionNumber: 2,
    sectionTitle: '2. Boards and Tile Geometry',
    questionText:
      'Are vertical wall tiles actual occupiable squares, just like horizontal squares?',
    ruleId: 'BOARD-02',
    ruleName: 'Vertical Cliff Walls as Full Playable Squares',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. Every vertical cliff wall riser between two horizontal elevation tiers is a real, occupiable square on the continuous chessboard surface. Pieces (except thewheeled Trebuchet chassis) can step onto a vertical wall tile, end their turn perched on it, move laterally along it, or continue up/down onto the next horizontal terrace.',
    doesNotAllow: [
      'Treating vertical walls as mere decorative cliffs that are skipped for free by sliding pieces',
      'Perching a Trebuchet on a vertical cliff wall',
    ],
    check:
      'A piece perched on a vertical wall can deliver check and be checked (subject to Surface Bound rules).',
    example:
      'Climbing from a Tier 0 floor square onto a Tier 1 terrace requires 2 connected orthogonal steps: Step 1 onto the vertical cliff wall tile, Step 2 onto the Tier 1 horizontal terrace tile.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 8,
    sectionNumber: 2,
    sectionTitle: '2. Boards and Tile Geometry',
    questionText:
      'At a floor-to-wall or wall-to-terrace bend, which tiles are adjacent?',
    ruleId: 'BOARD-03',
    ruleName: 'Continuous Checkerboard Adjacency Across 90-Degree Bends',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Every playable tile shares an edge only with tiles of the opposite checker color. A lower horizontal tile at the foot of a cliff is orthogonally adjacent to the vertical wall tile rising directly at its edge; that vertical wall tile is orthogonally adjacent to the upper horizontal terrace tile at its top lip, and laterally adjacent to neighboring vertical wall tiles along the same cliff face.',
    doesNotAllow: [
      'Bypassing the vertical wall tile when moving orthogonally between two horizontal tiers with a non-jumping piece',
      'Two edge-sharing connected tiles having the same checker color',
    ],
    check:
      'Orthogonal and diagonal attack rays trace directly across these connected bend edges.',
    example:
      'If a horizontal tile at the base of the South cliff is Light, the vertical cliff wall tile rising from its North edge is Dark, and the Tier 1 terrace tile at the top of that wall is Light.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 9,
    sectionNumber: 2,
    sectionTitle: '2. Boards and Tile Geometry',
    questionText:
      'When a Rook or Bishop crosses a bend, what makes its path remain “straight” or “diagonal”?',
    ruleId: 'BOARD-04',
    ruleName: 'Unfolded Surface Ray Continuity for Rooks and Bishops',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Imagine peeling the entire checkerboard skin off the pyramid and laying it flat: a Rook’s "straight" path is any unbroken sequence of edge-sharing orthogonal steps along the same file, rank, or lateral wall band; a Bishop’s "diagonal" path alternates one orthogonal step in each of two perpendicular surface axes (staying on the same checker color across floor, wall, and terrace).',
    doesNotAllow: [
      'Turning 90 degrees onto a perpendicular file/rank mid-move with a Rook',
      'Changing checker colors during a Bishop’s diagonal slide',
    ],
    check:
      'Rooks (up to 18 tiles), Bishops (up to 13 tiles), Queens (unlimited), and Kings (up to 13 tiles) give check along these unfolded continuous rays.',
    example:
      'A Rook moving North from the valley floor steps onto the South-facing vertical wall, then onto the Tier 1 terrace, counting each tile along the folded surface toward its 18-tile maximum.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 10,
    sectionNumber: 2,
    sectionTitle: '2. Boards and Tile Geometry',
    questionText:
      'Can a piece move through or attack through an occupied tile? Are there exceptions for jumpers?',
    ruleId: 'BOARD-05',
    ruleName: 'Line-of-Sight Blocking and Jumper Exceptions',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn:
      'Depends on whether the piece is a surface-sliding piece or a jump/arc piece (Knight, Gargoyle, Trebuchet).',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Surface-sliding pieces (Pawn, Rook, Bishop, Queen, King, Vanguard, Ascendant) can NEVER move through or attack through any occupied tile. They must stop before a friendly piece, and stop on the first enemy piece they capture (or stop before an opposite-surface piece in Surface Bound play). Jumpers (Knight, Gargoyle in Open Surface) leap over intervening pieces, and the Trebuchet’s ranged Bombardment arcs over intervening pieces (blocked only by a Pyramid terrace taller than its firing arc).',
    doesNotAllow: [
      'Sliding pieces passing through friendly or enemy pieces',
      'Sliding pieces passing through opposite-surface blockers in Surface Bound mode',
    ],
    check:
      'An occupied tile blocks sliding check rays (except a Knight jump check, which ignores intervening blockers).',
    example:
      'A Rook’s 18-tile ray stops immediately when it hits the first occupied square; a Knight’s L-jump leaps cleanly over any pieces in between.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 3: ARMY SELECTION AND DEPLOYMENT (Q11 - Q15)
  // ============================================================================
  {
    questionNumber: 11,
    sectionNumber: 3,
    sectionTitle: '3. Army Selection and Deployment',
    questionText:
      'Which piece classes are available on each board, in Standard Combat and RPG Combat?',
    ruleId: 'ARMY-01',
    ruleName: 'Piece Class Availability by Board Size',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn: 'Depends on whether the board is 8x8/12x12 (6 classes) or 20x20 (all 10 classes).',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Classic 8x8 and Quick Pyramid 12x12 deploy the 6 classical chess classes (Pawn, Knight, Bishop, Rook, Queen, King) in both Standard and RPG Combat. Battlefield 20x20 (Flat) and Grand Pyramid 20x20 deploy all 10 unit classes (Pawn, Knight, Bishop, Rook, Queen, King + Vanguard, Gargoyle, Ascendant, Trebuchet) in BOTH Standard and RPG Combat.',
    doesNotAllow: [
      'Deploying 20x20 wing specialists on the narrower 8x8 or 12x12 boards at game start',
    ],
    check: 'All deployed piece classes participate fully in check and checkmate.',
    example:
      'Starting a match on either 20x20 Battlefield Flat or 20x20 Grand Pyramid includes Vanguards, Gargoyles, Ascendants, and Trebuchets in both Standard and RPG modes.',
    supersededPriorWording:
      'SUPERSEDED RULE (ARMY-00): Earlier drafts restricted Gargoyle, Ascendant, and Trebuchet to Grand Pyramid RPG mode only. Superseded by ARMY-01 so all four 20x20 specialists deploy on both 20x20 boards in both Standard and RPG modes.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 12,
    sectionNumber: 3,
    sectionTitle: '3. Army Selection and Deployment',
    questionText:
      'How many of each piece does each player start with in Standard and Kingdom armies?',
    ruleId: 'ARMY-02',
    ruleName: 'Piece Counts in Standard vs. Kingdom Armies',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn: 'Depends on Board Size (8x8/12x12 vs. 20x20) and Army Scale (Standard vs. Kingdom).',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      '1) Classic 8x8 (Standard): 16 pieces per side (1 King, 1 Queen, 2 Rooks, 2 Bishops, 2 Knights, 8 Pawns = 32 total). 2) Quick Pyramid 12x12: Standard has 16 pieces per side (32 total); Kingdom adds +8 flank Pawns per side (4 West + 4 East = 24 per side / 48 total). 3) Battlefield 20x20 & Grand Pyramid 20x20: Standard has 21 pieces per side (16 classical + 2 Vanguards + 1 Gargoyle + 1 Ascendant + 1 Trebuchet = 42 total); Kingdom adds +8 flank Pawns per side (29 per side / 58 total).',
    doesNotAllow: ['Starting with more than 1 King per army'],
    check: 'All starting units follow the same check and King-safety laws.',
    example:
      'Selecting Grand Pyramid 20x20 + Kingdom Army places 29 White pieces and 29 Black pieces (58 total) on the board.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 13,
    sectionNumber: 3,
    sectionTitle: '3. Army Selection and Deployment',
    questionText: 'What are their exact starting tiles and facing directions?',
    ruleId: 'ARMY-03',
    ruleName: 'Exact Starting Coordinates and Facing Directions',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'White’s main army starts on the South edge (ranks y=0 backrow, y=1 pawns) facing North; Black’s main army starts on the North edge (top two ranks) facing South. On 8x8, the backrow spans x=0..7. On 12x12, the 8-file main army is centered on x=2..9. On 20x20 boards, the 8-file classical army is centered on x=6..13, flanked by Vanguards at x=5 and x=14, Gargoyle at x=4, Ascendant at x=15, and Trebuchet at x=3.',
    doesNotAllow: [
      'Changing a piece’s forward deployment facing orientation mid-game',
    ],
    check: 'Pawn forward-diagonal capture directions are determined by each Pawn’s facing.',
    example:
      'On a 20x20 board, White’s Vanguards start at F1 (5,0) and O1 (14,0) facing North; White’s Gargoyle starts at E1 (4,0), Ascendant at P1 (15,0), and Trebuchet at D1 (3,0).',
    openQuestions: 'None.',
  },
  {
    questionNumber: 14,
    sectionNumber: 3,
    sectionTitle: '3. Army Selection and Deployment',
    questionText:
      'Do Kingdom flank Pawns face inward, toward the enemy back rank, or in another direction?',
    ruleId: 'ARMY-04',
    ruleName: 'Kingdom Flank Pawn Facing and Orientation',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12), Battlefield (20x20), and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'On 20x20 boards, Kingdom West Flank Pawns (at x=0..1, y=5..6 for White and y=13..14 for Black) and East Flank Pawns (at x=18..19, y=5..6 for White and y=13..14 for Black) face North (White) and South (Black) toward the opposing flank detachment in the outer flanking lanes, while also capable of stepping sideways inward toward the center Pyramid. On 12x12 Quick Pyramid, West (x=0..1) and East (x=10..11) flank Pawns similarly face North (White) and South (Black).',
    doesNotAllow: ['Flank Pawns capturing backward against their facing direction'],
    check: 'Flank Pawns deliver check on their forward-diagonal capture squares relative to their facing.',
    example:
      'White’s West Flank Pawns advance North along the West corridor to clash with Black’s West Flank Pawns or sidestep East toward the Pyramid.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 15,
    sectionNumber: 3,
    sectionTitle: '3. Army Selection and Deployment',
    questionText:
      'Can players customize the army, or must they use a fixed starting arrangement?',
    ruleId: 'ARMY-05',
    ruleName: 'Fixed Canonical Deployments and Tactical Academy Scenarios',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Standard matches use the fixed canonical starting arrangements (Standard Army or Kingdom Army) so every game begins balanced. Players can also load custom preset board setups via the Interactive Tactical Academy Drills.',
    doesNotAllow: ['Arbitrary free-placement of extra Queens or Kings before a standard match'],
    check: 'N/A.',
    example:
      'Players choose between Standard Army and Kingdom Army in the top HUD or Settings before starting a match.',
    openQuestions: 'Optional future custom sandbox board editor mode.',
  },

  // ============================================================================
  // SECTION 4: TRADITIONAL PIECE MOVEMENT (Q16 - Q23)
  // ============================================================================
  {
    questionNumber: 16,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText:
      'King: What is its exact movement and capture range on flat tiles, walls, and terraces?',
    ruleId: 'TRAD-01',
    ruleName: 'King 13-Tile 8-Direction Movement and Capture',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The King moves and captures up to 13 unobstructed connected tiles in all 8 directions (4 orthogonal, 4 diagonal) across flat tiles, vertical cliff walls, and elevated terraces below the summit. While occupying a 4x4 Summit tile, the King moves 1 connected tile in any of the 8 directions (including when leaving the summit), and resumes its 13-tile range on the next turn after leaving the summit. It also supports classical Kingside and Queenside Castling on its home rank.',
    doesNotAllow: [
      'Moving more than 13 tiles below the summit (or more than 1 connected tile while starting on the 4x4 Summit)',
      'Moving through occupied squares',
      'Moving onto a square attacked by an enemy piece',
    ],
    check: 'The King can never move into check and must escape check immediately when checked.',
    example:
      'A King can slide 6 tiles diagonally across a terrace or climb a vertical wall and continue along the upper terrace up to 13 total connected tiles.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 17,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText: 'Queen: Is its range unlimited on every board?',
    ruleId: 'TRAD-02',
    ruleName: 'Queen Unlimited 8-Direction Surface Range',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Queen has unlimited unobstructed connected-surface range in all 8 directions (combining orthogonal Rook rays and diagonal Bishop rays without distance caps) across flat ground, vertical walls, and terraces when starting below the 4x4 Summit. While occupying a 4x4 Summit tile, her ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit), and her unlimited range resumes on the next turn after leaving the summit.',
    doesNotAllow: [
      'Jumping over occupied tiles',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Capturing across different surface classes in Surface Bound mode',
    ],
    check: 'Delivers check along any unobstructed orthogonal or diagonal surface ray.',
    example:
      'A Queen can sweep across the entire 20x20 battlefield or climb all 4 tiers of the Grand Pyramid in a single unobstructed ray.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 18,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText: 'Rook: Is its maximum range 18 tiles, or unlimited?',
    ruleId: 'TRAD-03',
    ruleName: 'Rook 18-Tile Maximum Orthogonal Range',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Rook has a maximum range of 18 unobstructed connected tiles in the 4 orthogonal directions (North, South, East, West) across flat ground, vertical cliff walls, and terraces when starting below the 4x4 Summit. While occupying a 4x4 Summit tile, its ordinary movement is 1 connected tile in any of the 8 directions (including when leaving the summit), and its 18-tile orthogonal range resumes on the next turn after leaving the summit.',
    doesNotAllow: [
      'Moving 19 or more tiles in a single move',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Moving diagonally below the 4x4 Summit or jumping over occupied tiles',
    ],
    check: 'Delivers orthogonal check up to 18 unobstructed connected tiles away.',
    example:
      'On a 20x20 board, a Rook at A1 (0,0) can slide North up to A19 (0,18)—18 tiles—in one move, but cannot reach A20 (0,19) in a single turn.',
    supersededPriorWording:
      'SUPERSEDED RULE (TRAD-03-OLD): Previously, the Rook had unlimited orthogonal range across the board. Superseded by confirmed rule TRAD-03 capping Rook movement and capture range at 18 connected tiles.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 19,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText: 'Bishop: Is its maximum range 13 tiles, or unlimited?',
    ruleId: 'TRAD-04',
    ruleName: 'Bishop 13-Tile Maximum Diagonal Range',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Bishop has a maximum range of 13 unobstructed connected tiles along the 4 diagonal directions across flat ground, vertical cliff walls, and terraces when starting below the 4x4 Summit. While occupying a 4x4 Summit tile, its ordinary movement is 1 connected tile in any of the 8 directions (including when leaving the summit), and its 13-tile diagonal range resumes on the next turn after leaving the summit.',
    doesNotAllow: [
      'Moving 14 or more diagonal tiles in a single move',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Moving orthogonally below the 4x4 Summit or jumping over occupied tiles',
    ],
    check: 'Delivers diagonal check up to 13 unobstructed connected tiles away.',
    example:
      'A Bishop on a long diagonal can slide up to 13 connected diagonal squares across terraces and walls in a single turn.',
    supersededPriorWording:
      'SUPERSEDED RULE (TRAD-04-OLD): Previously, the Bishop had unlimited diagonal range. Superseded by confirmed rule TRAD-04 capping Bishop movement and capture range at 13 connected diagonal tiles.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 20,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText:
      'Knight: Is its jump always the ordinary two-plus-one L-shape? How is that shape measured across a folded surface?',
    ruleId: 'TRAD-05',
    ruleName: 'Knight 2x1 L-Jump Across Horizontal and Vertical Tiles',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. The Knight always leaps in a 2-plus-1 L-shape (|dx|=2, |dy|=1 or |dx|=1, |dy|=2), ignoring all intervening pieces and elevation changes, and can land on either horizontal tiles or vertical cliff wall tiles at that exact L-jump coordinate offset. Critically, the Knight is EXEMPT from the 4x4 Summit 1-tile movement restriction and retains its legal summit jumping movement (including Summit-to-Base jumps in Surface Bound play).',
    doesNotAllow: [
      'Landing on a tile of the wrong checker color before 4x4 Summit release in Surface Bound mode',
      'Being blocked by pieces standing on intermediate squares',
    ],
    check: 'A Knight delivers check to an enemy King on any legal L-jump destination.',
    example:
      'A Knight at (5,4) can leap directly to a Tier 2 terrace or vertical wall at (6,6) or (7,5), bypassing all pieces in between.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 21,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText:
      'Pawn: Can it move forward, sideways, or backward on each board? Does its movement change when it occupies a wall?',
    ruleId: 'PAWN-01',
    ruleName: 'Pawn Directional Movement by Board Type (Flat vs. Pyramid)',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn:
      'Depends on whether the board is a Flat Board (Classic 8x8, Battlefield 20x20) or a Pyramid Board (Quick Pyramid 12x12, Grand Pyramid 20x20).',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'On ALL boards, a Pawn can move 1 connected tile Forward or 1 connected tile Sideways (Left/Right) onto an empty square, plus 2 tiles Forward on its initial unmoved advance. On PYRAMID BOARDS ONLY (Quick Pyramid 12x12 and Grand Pyramid 20x20), a Pawn can ALSO move 1 connected tile BACKWARD onto an empty square, and while occupying a 4x4 Summit tile, a Pawn may make an ordinary (non-capture) move of 1 connected tile in any of the 8 directions (including when leaving the summit), resuming normal movement on the next turn after leaving. On FLAT BOARDS (Classic 8x8 and Battlefield 20x20), a Pawn can NEVER move backward.',
    doesNotAllow: [
      'Moving backward on Classic 8x8 or Battlefield 20x20 Flat',
      'Capturing an enemy piece by moving straight-forward, sideways, backward, or backward-diagonally (even while occupying the 4x4 Summit)',
    ],
    check: 'Non-capture steps (forward, sideways, backward) never capture or give check.',
    example:
      'On Grand Pyramid 20x20, a Pawn blocked ahead can step 1 tile sideways or 1 tile backward to reroute around an obstacle.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 22,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText:
      'Pawn: Does it always capture one tile diagonally forward, including across a surface boundary?',
    ruleId: 'PAWN-07',
    ruleName: 'Pawn Forward-Diagonal Capture and Cross-Surface Exception',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards (Cross-Surface Exception applies to Quick Pyramid and Grand Pyramid)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. A Pawn captures strictly 1 step diagonally forward relative to its deployment facing. In both Open Surface and Surface Bound play on Pyramid boards, a Pawn may attack and capture across horizontal and vertical Pyramid tiles provided the enemy occupies a legal 1-step forward-diagonal capture destination.',
    doesNotAllow: [
      'Backward captures',
      'Straight-forward captures',
      'Sideways captures',
      'Additional capture range beyond 1 forward-diagonal step',
    ],
    check: 'A legal cross-surface Pawn forward-diagonal attack CAN give check and checkmate.',
    example:
      'A Pawn on a horizontal tile may capture (and check) an enemy on a connected vertical wall tile—or vice versa—if that enemy is 1 legal forward-diagonal step away.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 23,
    sectionNumber: 4,
    sectionTitle: '4. Traditional Piece Movement',
    questionText:
      'For every piece, is movement different from its capture pattern? If so, how?',
    ruleId: 'TRAD-06',
    ruleName: 'Movement vs. Capture Pattern Comparison Across All 10 Classes',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn:
      'Depends on the piece class: 8 classes use identical movement and capture rays, while Pawn and Trebuchet have distinct movement vs. capture/attack rules.',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Movement and capture are strictly governed by each class’s rules: 1) Knight, Bishop, Rook, Queen, King, Gargoyle, and Ascendant capture on their legal destination tiles (with non-Knights restricted to 1 connected tile in all 8 directions while starting a turn on the 4x4 Summit, and subject to Surface Bound same-surface combat). 2) VANGUARD: Captures along its forward sprint ray (or laterally on vertical walls), and while occupying the 4x4 Summit can make a 1-tile ordinary move in any of the 8 directions while keeping its forward/wall capture rule. 3) PAWN: Moves 1 tile orthogonally (forward, sideways, and backward on Pyramid boards) or 1 connected tile in all 8 directions while occupying the 4x4 Summit onto empty tiles, but captures ONLY 1 step forward-diagonally! 4) TREBUCHET: Moves 1–2 orthogonal tiles onto empty horizontal tiles below the summit (or 1 connected horizontal tile in all 8 directions while on the 4x4 Summit), JUMP-CAPTURES onto any enemy within a 1–2 tile radius, and BOMBARDS enemies at range (3–6 tiles on ground, or 4x4 Summit only when on the Pyramid) to knock them back 3 tiles without capturing.',
    doesNotAllow: [
      'Pawns capturing orthogonally',
      'Trebuchets capturing by ranged Bombardment (Trebuchet must jump onto a piece within 1–2 tiles to capture it)',
    ],
    check:
      'Only legal capture moves (never non-capture steps or knockback-only bombardments) deliver check.',
    example:
      'A Trebuchet jumps 1–2 tiles onto an enemy to capture it, whereas its 3–6 tile Bombardment knocks the target back 3 tiles without capturing.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 5: SPECIAL PIECE MOVEMENT (Q24 - Q30)
  // ============================================================================
  {
    questionNumber: 24,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Vanguard: Exactly when does its forward range decrease from nine toward one? Does it ever recover range?',
    ruleId: 'SPEC-01',
    ruleName: 'Vanguard 9-to-1 Irreversible Forward Range Contraction',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Battlefield (20x20 Flat) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Vanguard moves strictly forward along its deployment facing on horizontal tiles. Its maximum forward range is (9 minus its highest forward rank progress ever reached), with a minimum of 1 tile: Rank 0 = 9 tiles, Rank 1 = 8, Rank 2 = 7, Rank 3 = 6, Rank 4 = 5, Rank 5 = 4, Rank 6 = 3, Rank 7 = 2, and Rank 8 or beyond = 1 tile permanently. Because it tracks maximum historical forward progress, its range NEVER recovers, even if swapped backward via Rook Exchange.',
    doesNotAllow: [
      'Moving backward on any tile',
      'Moving sideways on horizontal tiles',
      'Recovering lost forward range after advancing',
    ],
    check: 'Delivers check along its unobstructed forward ray up to its current contracted range.',
    example:
      'A White Vanguard at rank y=0 has a 9-tile forward range; once it sprints to y=6, its maximum forward range permanently becomes 3 tiles.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 25,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Vanguard: Which sideways moves and captures are legal on vertical walls?',
    ruleId: 'SPEC-02',
    ruleName: 'Vanguard Vertical-Wall Sideways Movement Exception',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'While physically perched on a vertical Pyramid cliff wall tile, the Vanguard unlocks lateral (sideways Left and Right) connected surface movement and capture along the cliff face up to its current range, in addition to its forward climb.',
    doesNotAllow: [
      'Sideways movement or sideways capture while standing on a horizontal tile',
      'Backward retreat down the wall against its deployment facing',
    ],
    check:
      'A Vanguard perched on a vertical wall can deliver lateral check along that wall.',
    example:
      'A Vanguard perched on the South vertical cliff wall can slide East or West along the wall tiles to capture an enemy wall defender.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 26,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Rook Exchange: Can a Vanguard swap with any friendly Rook regardless of distance, surface, or intervening pieces?',
    ruleId: 'SPEC-03',
    ruleName: 'Vanguard Own-Team Rook Positional Exchange',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Battlefield (20x20 Flat) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. On its turn, a Vanguard can initiate a positional switch with any living Rook belonging to its OWN team anywhere on the 20x20 board, regardless of distance, elevation tier, surface class (horizontal or vertical wall), or intervening pieces, provided the resulting board state does not leave its own King in check. Only a Vanguard can initiate this switch, and only with a Rook of its own team.',
    doesNotAllow: [
      'Switching with an enemy Rook',
      'Switching with any non-Rook piece (such as a Queen, Knight, or Pawn)',
      'Capturing a piece directly during the swap action',
    ],
    check:
      'A Rook teleported onto an advanced terrace or wall via Rook Exchange can immediately place the enemy King in discovered check on the resulting board state.',
    example:
      'A White Vanguard that sprinted to a Tier 2 terrace can swap places with a White Rook sitting on the back rank, instantly deploying the heavy Rook to Tier 2.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 27,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Gargoyle: What are its exact steps, jumps, glides, and wall abilities?',
    ruleId: 'SPEC-04',
    ruleName: 'Gargoyle Terrain Mastery and Stone Bulwark',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Battlefield (20x20 Flat) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'On flat ground (Tier 0), the Gargoyle moves up to 2 connected tiles in all 8 directions and can leap in 2-tile hops. When occupying or targeting Pyramid terrain (Tier 1+ terraces or vertical cliff walls), it awakens a 3-tile connected surface range and can perch directly onto vertical cliff walls within radius. In RPG mode, Pyramid terrain activates Stone Bulwark (+10 DEF & +15% Evasion on vertical walls; +6 DEF & +10% Evasion on terraces; +1 D20 roll; and a 20% damage-reduction Guard Aura for nearby allies).',
    doesNotAllow: [
      'Moving more than 2 tiles when starting and ending on flat valley ground',
      'Violating the Jump Color Law or Same-Surface Combat Law when Surface Bound is active',
    ],
    check: 'Delivers check within its 2-tile (flat) or 3-tile (Pyramid) legal attack range.',
    example:
      'A Gargoyle perched on a Tier 2 vertical wall gains +10 DEF, +15% Evasion, a 3-tile reach, and shields adjacent friendly pieces by 20%.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 28,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Ascendant: What triggers each movement stage? Can it lose a stage?',
    ruleId: 'SPEC-05',
    ruleName: 'Ascendant Three-Stage Developing Stride',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Battlefield (20x20 Flat) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Ascendant moves in all 8 directions along connected surfaces. Its stride stage is determined by its current elevation tier and forward rank progress: Stage I (Base: 2 connected tiles) in home territory at Tier 0; Stage II (Awakened: 3 connected tiles) upon reaching Tier 1–2 or advancing 30% across the board; Stage III (Apex: 4 connected tiles) upon reaching Tier 3–4 (Upper Terrace/Summit) or advancing 65% across the board. In RPG mode, climbing a higher tier also grants permanent stat tempering (+2 ATK, +2 DEF, +8 HP heal), while its current stride reflects its active stage.',
    doesNotAllow: [
      'Jumping over occupied tiles',
      'Suffering uphill RPG attack penalties (Ascendant ignores uphill penalties)',
    ],
    check: 'Delivers 8-direction connected surface check up to its current stage stride (2, 3, or 4 tiles).',
    example:
      'An Ascendant that climbs onto Tier 3 (Upper Terrace) awakens Stage III, sliding up to 4 connected tiles in any of the 8 directions.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 29,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Trebuchet: What are its legal movement, jump-capture, and bombardment destinations?',
    ruleId: 'SPEC-06',
    ruleName: 'Trebuchet Jump-Capture, Reposition, and 4x4 Summit Pyramid Bombardment',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Battlefield (20x20 Flat) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      '1) Physical Reposition: Moves 1–2 unobstructed orthogonal tiles onto empty horizontal tiles (cannot perch on vertical walls). 2) Jump-Capture: The Trebuchet MUST physically jump onto an enemy piece (within a 1–2 tile radius) to capture it! 3) Bombardment: When off the Pyramid (Tier 0 / Flat), it can bombard enemy pieces 3–6 tiles away along the 8 compass rays. When the Trebuchet gets ON the Pyramid (Tier 1+), it can ONLY bombard enemy pieces located on the 4x4 Summit!',
    doesNotAllow: [
      'Capturing a piece via ranged Bombardment (it must jump onto a piece within 1–2 tiles to capture it)',
      'Bombarding non-Summit targets while the Trebuchet is on the Pyramid (Tier 1+)',
      'Perching the Trebuchet on vertical cliff wall tiles',
    ],
    check:
      'Only the Trebuchet’s 1–2 tile Jump-Capture threatens a capture and therefore gives check; ranged Bombardment knocks pieces back without capturing.',
    example:
      'If an enemy Knight is 2 tiles away, the Trebuchet can jump directly onto the Knight’s square to capture it. If the Trebuchet climbs onto Tier 1 of the Pyramid, its ranged Bombardment can only target enemies standing on the 4x4 Summit.',
    supersededPriorWording:
      'SUPERSEDED RULE (SPEC-06-OLD): Previously, the Trebuchet had a 1–2 tile close-range blind spot and captured/damaged via 3–(6+tier) ranged bombardment. Superseded by confirmed rule SPEC-06 (must jump onto a piece within 1–2 tiles to capture it; bombardment knocks back 3 tiles; on Pyramid can only bombard the 4x4 Summit).',
    openQuestions: 'None.',
  },
  {
    questionNumber: 30,
    sectionNumber: 5,
    sectionTitle: '5. Special Piece Movement',
    questionText:
      'Does bombardment cause damage, displacement, capture, check, or some combination?',
    ruleId: 'SPEC-07',
    ruleName: 'Trebuchet Bombardment 3-Tile Random Open-Tile Knockback',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Battlefield (20x20 Flat) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Trebuchet Bombardment causes DISPLACEMENT ONLY: it knocks the targeted enemy piece back 3 tiles onto a random open horizontal tile while the Trebuchet remains on its current square. Bombardment does NOT capture the piece, does not deal HP damage, and does not directly capture-check a King (though knocking an enemy blocker away can expose the enemy King to discovered check from another piece).',
    doesNotAllow: [
      'Capturing or killing a piece with Bombardment',
      'Bombarding a target if no open tile exists for the knockback landing',
    ],
    check:
      'Bombardment does not directly check the King by capture, but cannot be executed if the resulting knockback board state leaves the Trebuchet’s own King in check.',
    example:
      'A Trebuchet bombards an enemy Rook 4 tiles away; the Rook is knocked 3 tiles back onto a random open square, disrupting the enemy’s formation.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 6: OPEN SURFACE AND SURFACE BOUND (Q31 - Q38)
  // ============================================================================
  {
    questionNumber: 31,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'Are both play styles available on both Pyramid boards only, or on flat boards too?',
    ruleId: 'SURF-01',
    ruleName: 'Play Style Scope Across Pyramid and Flat Boards',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Play Style setting (Open Surface vs. Surface Bound) is selectable globally in the HUD and Settings, and its surface/summit laws actively govern the two Pyramid boards (12x12 Quick Pyramid and 20x20 Grand Pyramid) where Horizontal and Vertical surfaces and the 4x4 Summit exist. On Flat boards (8x8 Classic and 20x20 Battlefield Flat), all tiles are Horizontal Tier 0 with no vertical walls or summit.',
    doesNotAllow: [
      'Applying vertical-wall or summit restrictions on flat boards that have no pyramid',
    ],
    check: 'Surface Bound check rules apply on Quick Pyramid and Grand Pyramid.',
    example:
      'Switching between Open Surface and Surface Bound immediately updates legal move highlights and check rules on Quick Pyramid and Grand Pyramid.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 32,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'In Open Surface, can any piece attack across horizontal and vertical surfaces if its normal capture geometry permits?',
    ruleId: 'SURF-02',
    ruleName: 'Open Surface Free Cross-Surface Combat',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Open Surface',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. In Open Surface play, any piece may move and capture freely across connected horizontal terraces and vertical cliff walls whenever its normal movement/capture geometry reaches the target.',
    doesNotAllow: ['Passing through occupied blocking squares with a sliding piece'],
    check:
      'In Open Surface play, any piece can deliver check across horizontal and vertical surfaces along its legal capture path.',
    example:
      'In Open Surface play, a Rook on the horizontal valley floor can slide up a vertical wall to capture an enemy perched on that wall.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 33,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'In Surface Bound, must non-Pawns attack targets on their own surface class?',
    ruleId: 'SURF-03',
    ruleName: 'Surface Bound Same-Surface Combat Law for Non-Pawns',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. In Surface Bound play, every non-Pawn piece (Knight, Bishop, Rook, Queen, King, Vanguard, Gargoyle, Ascendant, Trebuchet) may ONLY attack, capture, or check an enemy piece that occupies the SAME surface class as the attacker’s starting square for that move (Horizontal vs. Horizontal, or Vertical vs. Vertical). To attack an enemy on the opposite surface class, a non-Pawn must first spend a move transitioning onto that surface class.',
    doesNotAllow: [
      'A non-Pawn on a Horizontal tile capturing or checking an enemy on a Vertical wall tile',
      'A non-Pawn on a Vertical wall tile capturing or checking an enemy on a Horizontal tile',
    ],
    check:
      'Non-Pawn pieces can only deliver check to an enemy King that occupies the same surface class.',
    example:
      'A Queen on a Horizontal terrace cannot capture an enemy Bishop perched on a Vertical wall; the Queen must first move onto a Vertical wall tile on one turn before capturing the wall enemy on a subsequent turn.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 34,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'Confirm the Pawn exception: can Pawns capture and give check across surfaces only on legal forward diagonals?',
    ruleId: 'SURF-04',
    ruleName: 'Confirmation of Pawn Cross-Surface Forward-Diagonal Exception',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Confirmed: Yes. Pawns are the sole exception to Same-Surface Combat in Surface Bound play. A Pawn may capture and give check across horizontal and vertical Pyramid tiles ONLY when the target occupies a legal 1-step forward-diagonal capture tile relative to the Pawn’s facing.',
    doesNotAllow: [
      'Backward captures across surfaces or on the same surface',
      'Straight-forward or sideways captures',
      'Extra movement or capture range beyond 1 forward-diagonal tile',
    ],
    check:
      'Yes—a Pawn on a horizontal tile can check a King on a forward-diagonal vertical wall tile, and a Pawn on a vertical wall tile can check a King on a forward-diagonal horizontal tile.',
    example:
      'A White Pawn at the base of the South cliff can capture a Black piece perched on the South vertical wall one file to its left or right.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 35,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'Do opposite-surface occupied tiles block sliding movement even when they cannot be captured?',
    ruleId: 'SURF-05',
    ruleName: 'Cross-Surface Physical Blocking Law',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. In Surface Bound play, an occupied tile on the opposite surface class CANNOT be captured by a non-Pawn sliding piece, AND it still physically blocks the sliding piece’s movement ray. The sliding piece must stop on the tile before the occupied opposite-surface square and cannot slide through it.',
    doesNotAllow: [
      'Sliding through an enemy or friendly piece perched on a vertical wall to reach a horizontal terrace above it',
      'Capturing that opposite-surface blocker with a non-Pawn during the blocked move',
    ],
    check:
      'An enemy piece on a vertical wall physically blocks a horizontal Rook or Queen from projecting check through that wall onto a horizontal terrace behind it.',
    example:
      'If an enemy Knight is perched on a vertical cliff wall tile in front of a horizontal Rook, the Rook cannot capture the Knight and cannot slide past the Knight up onto the terrace above.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 36,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'Does “same surface” mean the same class (any horizontal tile) or the same individual wall/terrace?',
    ruleId: 'SURF-06',
    ruleName: 'Definition of Surface Class (Horizontal Class vs. Vertical Class)',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      '“Same surface” means the same SURFACE CLASS: all Horizontal tiles (Valley Floor, Lower/Middle/Upper Terraces, and the 4x4 Summit) belong to the Horizontal Surface Class, and all Vertical Cliff Wall tiles belong to the Vertical Surface Class. Provided a piece’s legal path is unobstructed, a horizontal piece can capture an enemy on another horizontal terrace tier if its legal ray or jump reaches it.',
    doesNotAllow: [
      'Non-Pawn attacks between the Horizontal Surface Class and the Vertical Surface Class',
    ],
    check:
      'Any two Horizontal tiles share the Horizontal Surface Class; any two Vertical wall tiles share the Vertical Surface Class.',
    example:
      'A Rook on a Tier 1 Horizontal terrace that slides up an empty vertical wall onto a Tier 2 Horizontal terrace can capture an enemy on that Tier 2 Horizontal terrace because both the Rook’s start tile and the target’s tile are Horizontal Surface Class.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 37,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'How does a piece\'s attack rule change when it crosses a bend during a move?',
    ruleId: 'SURF-07',
    ruleName: 'Surface Transition vs. Same-Turn Attack Across Bends',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'During a single move in Surface Bound play, a piece may cross a 90-degree bend onto an EMPTY tile of the opposite surface class (for example, moving from a horizontal terrace onto an empty vertical wall tile to reposition). However, whether a non-Pawn can CAPTURE on that turn is determined by comparing the attacker’s starting surface class for that turn with the target’s surface class: it cannot capture a target on the opposite surface class during the transition move. Once it ends its turn on the new surface class, on its NEXT turn it belongs to that new surface class and can attack enemies on it.',
    doesNotAllow: [
      'Crossing from Horizontal to Vertical and capturing a Vertical enemy on the same turn (unless the attacker is a Pawn making a 1-step forward-diagonal capture)',
    ],
    check:
      'Moving onto a new surface class updates which surface class the piece threatens on the next turn.',
    example:
      'A Rook on Tier 1 (Horizontal) steps onto an empty Vertical wall tile on Turn 10 (transitioning to Vertical). On Turn 11, it is now a Vertical-surface piece and can capture enemies on that Vertical wall.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 38,
    sectionNumber: 6,
    sectionTitle: '6. Open Surface and Surface Bound',
    questionText:
      'Does a King crossing from horizontal to vertical immediately gain protection from attackers on its previous surface, subject to Pawn attacks?',
    ruleId: 'SURF-08',
    ruleName: 'King Surface-Shift Check Immunity (Subject to Pawn Exception)',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes! In Surface Bound play, if a King moves from a Horizontal tile onto a Vertical wall tile (or from a Vertical wall tile onto a Horizontal tile), it is immediately immune to check and capture from all non-Pawn enemy pieces on its previous surface class—subject only to Vertical-surface attackers and enemy Pawns within 1-step forward-diagonal capture range.',
    doesNotAllow: [
      'A Horizontal enemy Queen or Rook checking a King that has stepped onto a Vertical cliff wall in Surface Bound play',
    ],
    check:
      'Stepping onto the opposite surface class is a legal way for a King to escape check from a non-Pawn attacker in Surface Bound mode!',
    example:
      'If a White King on a Horizontal terrace is checked by a Horizontal Black Rook, the White King can step onto an adjacent empty Vertical cliff wall tile to break the Rook’s check.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 7: JUMP COLOR AND SUMMIT RULES (Q39 - Q46)
  // ============================================================================
  {
    questionNumber: 39,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'Which pieces count as jump-capable: Knight, Gargoyle, Trebuchet, or others?',
    ruleId: 'JUMP-01',
    ruleName: 'Classification of Jump-Capable Pieces',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Knight and the Gargoyle are the jump-capable pieces governed by the Surface Bound Jump Color Law and 4x4 Summit Release Law. The Trebuchet performs a 1–2 tile close-range Jump-Capture onto horizontal enemies and a ranged arc Bombardment, but is not subject to single-checker-color lock.',
    doesNotAllow: [
      'Other pieces (Pawn, Bishop, Rook, Queen, King, Vanguard, Ascendant) jumping over occupied tiles',
    ],
    check: 'Knights and Gargoyles obey Jump Color and Surface Bound rules when checking.',
    example:
      'In Surface Bound mode, Knights and Gargoyles display their starting tile color lock status ("LIGHT-TILE BOUND" or "DARK-TILE BOUND") until they reach the 4x4 Summit.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 40,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'Before summit release, must a jumper land on its starting checker color?',
    ruleId: 'JUMP-02',
    ruleName: 'Pre-Summit Jump Color Lock',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. In Surface Bound play, before a Knight or Gargoyle has reached the 4x4 Summit, every jump movement and jump capture it makes MUST land on a tile of the exact same checker color (Light or Dark) as the tile it originally started the game on.',
    doesNotAllow: [
      'A Light-bound jumper landing on a Dark tile before reaching the 4x4 Summit in Surface Bound mode',
      'A Dark-bound jumper landing on a Light tile before reaching the 4x4 Summit in Surface Bound mode',
    ],
    check:
      'A color-locked jumper can only check an enemy King if the King stands on the jumper’s allowed checker color.',
    example:
      'A Knight that started on a Light square can only land on Light squares until it touches the 4x4 Summit.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 41,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'A normal Knight jump changes checker color. What special movement or exception lets a color-locked Knight make legal progress toward the summit?',
    ruleId: 'JUMP-03',
    ruleName: 'Folded-Pyramid 3D Checker Parity for Color-Locked Knights',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'On a flat 2D board, a (2,1) L-jump always flips checker color because 2+1=3 (odd). However, on the 3D Pyramid, every elevation tier climb inserts a vertical cliff wall riser into the continuous alternating checkerboard skin (`(x + y + tier) mod 2`). Therefore, when a Knight leaps across an odd number of elevation tiers (for example, from Tier 0 to Tier 1, or Tier 1 to Tier 2, or onto a vertical cliff wall), a standard (2,1) L-jump lands on the SAME checker color as its starting square! And for Gargoyles, 2-tile surface strides also land on the same checker color.',
    doesNotAllow: [
      'A color-locked Knight jumping to an opposite-color square on the same flat tier in Surface Bound mode',
    ],
    check:
      'A color-locked Knight can legally leap up Pyramid tiers along same-color L-jump destinations all the way to the 4x4 Summit.',
    example:
      'A White Knight starting on Tier 0 can L-jump onto a Tier 1 terrace or vertical wall tile that shares its starting checker color, climbing tier-by-tier to the 4x4 Summit.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 42,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'Does merely arriving at any summit tile permanently remove the color restriction?',
    ruleId: 'JUMP-04',
    ruleName: 'Permanent 4x4 Summit Color Release',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. The moment a jump-capable piece (Knight or Gargoyle) legally lands on any of the 16 tiles of the 4x4 Summit, its `colorReleased` status becomes permanently true for the remainder of the match. From that turn onward, it can land on both Light and Dark tiles.',
    doesNotAllow: ['Re-locking a jumper’s color after it has descended from the 4x4 Summit'],
    check:
      'Once released at the Summit, a Knight or Gargoyle threatens both Light and Dark squares for check.',
    example:
      'A Knight lands on Summit tile I9 (8,8); its HUD badge changes to "SUMMIT RELEASED" and it can now jump to both Light and Dark squares for the rest of the game.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 43,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'Must a jumper\'s first summit landing still satisfy the color restriction?',
    ruleId: 'JUMP-05',
    ruleName: 'First Summit Landing Must Obey Starting Color Lock',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. Because the jumper is still color-bound while initiating the move onto the 4x4 Summit, the specific Summit tile it lands on first MUST match its starting checker color. Landing on that matching Summit tile then triggers the permanent release for all future turns.',
    doesNotAllow: [
      'Jumping onto an opposite-color 4x4 Summit tile while still color-locked',
    ],
    check:
      'A color-bound jumper can only capture or check on a Summit tile that matches its starting color on the turn it arrives.',
    example:
      'A Light-bound Knight on Tier 3 must land on one of the 8 Light tiles of the 4x4 Summit to enter the Summit and unlock Dark tiles for future moves.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 44,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'Does a jump from the summit override ordinary jump distance, or must it satisfy ordinary geometry?',
    ruleId: 'JUMP-06',
    ruleName: 'Summit-to-Base Jump Geometry',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'In Surface Bound play, when a Knight jumps FROM a 4x4 Summit tile, its jump is governed by the Summit Descent Law: it leaps directly from the Summit down to the legal Pyramid-Base ring tiles aligned with its Summit file or rank (overriding the 2x1 distance so it can descend straight to the Pyramid base ring).',
    doesNotAllow: [
      'A Knight on the 4x4 Summit in Surface Bound mode jumping to mid-tier terraces instead of the designated Pyramid-Base landing ring',
    ],
    check: 'A Knight on the 4x4 Summit projects check onto its legal Pyramid-Base landing tiles.',
    example:
      'From the 4x4 Summit on Grand Pyramid, a Knight can plunge directly to the Pyramid-Base ring at the foot of the ziggurat along its aligned files/ranks.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 45,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText: 'What exactly counts as a “Pyramid-base” landing tile?',
    ruleId: 'JUMP-07',
    ruleName: 'Definition of Pyramid-Base Landing Ring',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'The Pyramid-Base landing tiles are the horizontal Tier 0 ring tiles immediately bordering the outer foot of the Pyramid structure: on Grand Pyramid 20x20 (where Tier 1 spans [5..14]), the Pyramid-Base ring is the perimeter at coordinate 4 and 15 around the pyramid footprint; on Quick Pyramid 12x12 (where Tier 1 spans [2..9]), the Pyramid-Base ring is the perimeter at coordinate 1 and 10.',
    doesNotAllow: [
      'Landing on deep back-rank corner tiles outside the Pyramid-Base ring on a Summit-to-Base jump',
    ],
    check: 'Applies to Summit-to-Base jump destinations in Surface Bound play.',
    example:
      'On Grand Pyramid 20x20, jumping down from Summit tile (8,8) lands on the Pyramid-Base ring tiles at (8,4), (8,15), (4,8), or (15,8) (plus ±1 adjacent file/rank offset).',
    openQuestions: 'None.',
  },
  {
    questionNumber: 46,
    sectionNumber: 7,
    sectionTitle: '7. Jump Color and Summit Rules',
    questionText:
      'Do these restrictions affect ordinary non-jumping movement by a piece that also has a jump ability?',
    ruleId: 'JUMP-08',
    ruleName: 'Non-Jumping Connected Surface Stride for Dual-Mode Pieces (Gargoyle)',
    status: 'CONFIRMED',
    decision: 'No',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'No. In Surface Bound play, a piece that has both connected-surface stride and winged hops (the Gargoyle) uses its normal connected-surface orthogonal/diagonal rays without Jump Color Lock, while its winged jumps/hops are restricted in Surface Bound mode so it relies on connected surface paths (obeying Same-Surface Combat and Cross-Surface Blocking).',
    doesNotAllow: [
      'Bypassing Surface Bound blocking or same-surface combat rules during a surface step',
    ],
    check: 'Connected surface rays obey standard Surface Bound check laws.',
    example:
      'In Surface Bound mode, a Gargoyle can step 1 tile orthogonally onto an adjacent tile of the opposite checker color because that is a connected surface step, not an airborne jump.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 8: STANDARD CHESS SPECIAL RULES (Q47 - Q51)
  // ============================================================================
  {
    questionNumber: 47,
    sectionNumber: 8,
    sectionTitle: '8. Standard Chess Special Rules',
    questionText:
      'Is castling allowed on every board? Must King and Rook remain on their starting horizontal rank?',
    ruleId: 'CHESS-01',
    ruleName: 'Castling Across All Four Battlefields',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. Kingside and Queenside Castling is legal on all 4 boards whenever: (1) neither the King nor the chosen friendly Rook has moved yet, (2) both are on the same horizontal rank and elevation tier with all intervening squares empty and at the same tier, (3) the King is not currently in check, and (4) the King does not pass through or land on a square under enemy check. The King moves 2 squares toward the Rook, and the Rook hops to the square the King crossed.',
    doesNotAllow: [
      'Castling after the King or that Rook has moved (including after a Vanguard Rook Exchange)',
      'Castling while in check or through an attacked square',
    ],
    check: 'Castling cannot be used to escape check if the King is currently in check.',
    example:
      'On Grand Pyramid 20x20, an unmoved White King at K1 (10,0) and unmoved White Rook at N1 (13,0) can castle Kingside if L1 and M1 are empty and unattacked.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 48,
    sectionNumber: 8,
    sectionTitle: '8. Standard Chess Special Rules',
    questionText:
      'Is en passant available to sideways-moving or inward-facing Pawns?',
    ruleId: 'CHESS-02',
    ruleName: 'En Passant Capture Rule',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'En Passant is triggered ONLY when an enemy Pawn makes its initial 2-tile forward advance and lands laterally adjacent to a Pawn on the same horizontal tier. On the immediately following turn, the capturing Pawn may capture diagonally forward into the square the enemy Pawn skipped over. Sideways 1-tile steps never trigger En Passant susceptibility.',
    doesNotAllow: [
      'Capturing En Passant after a 1-tile step or sideways step',
      'Waiting more than 1 turn to execute the En Passant capture',
    ],
    check: 'An En Passant capture can deliver check or remove a checking Pawn.',
    example:
      'If a White Pawn advances 2 tiles from (6,1) to (6,3) beside a Black Pawn at (7,3), Black may capture En Passant to (6,2) on the very next turn.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 49,
    sectionNumber: 8,
    sectionTitle: '8. Standard Chess Special Rules',
    questionText:
      'What tiles trigger Pawn promotion: enemy back rank, summit, opposite flank boundary, or a combination?',
    ruleId: 'CHESS-03',
    ruleName: 'Pawn Promotion Trigger (Opposite Back Rank Only — Never on 4x4 Summit)',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'On all 4 boards (Classic 8x8, Battlefield 20x20, Quick Pyramid 12x12, and Grand Pyramid 20x20), a Pawn promotes ONLY upon reaching the opposite back rank relative to its facing (y=size-1 for North-facing, y=0 for South-facing). Pawns do NOT promote or transform merely by reaching the 4x4 Summit!',
    doesNotAllow: [
      'Promoting a Pawn merely by reaching the 4x4 Summit',
      'Promoting on lower Pyramid terraces (Tiers 1–2 on 12x12 or Tiers 1–3 on 20x20)',
    ],
    check: 'A newly promoted piece on the opposite back rank immediately threatens check using its new class’s range.',
    example:
      'A White Pawn climbing onto Summit tile (8,8) on Grand Pyramid 20x20 remains a Pawn (gaining 1-tile 8-direction ordinary movement while on the Summit) and only promotes if it marches all the way to the opposite back rank (y=19).',
    supersededPriorWording:
      'SUPERSEDED RULE (CHESS-03-OLD): Previously allowed Pawns to promote upon reaching the 4x4 Summit on Pyramid boards. Superseded by confirmed rule CHESS-03: Pawns never promote or transform merely by reaching the summit; they promote only on the opposite back rank.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 50,
    sectionNumber: 8,
    sectionTitle: '8. Standard Chess Special Rules',
    questionText: 'Which piece types can a Pawn promote into?',
    ruleId: 'CHESS-04',
    ruleName: 'Eligible Pawn Promotion Classes',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn: 'Depends on Board Size (8x8/12x12 vs. 20x20).',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'On 8x8 and 12x12 boards, a Pawn reaching the opposite back rank promotes into a Queen, Rook, Bishop, or Knight. On 20x20 boards (Battlefield 20x20 and Grand Pyramid 20x20), opposite-back-rank promotion also includes the Vanguard.',
    doesNotAllow: [
      'Promoting a Pawn into a second King',
      'Transforming or promoting a Pawn on the 4x4 Summit',
    ],
    check: 'All promoted classes obey standard check and King-safety rules.',
    example:
      'On Grand Pyramid 20x20, a human player promoting a Pawn on the opposite back rank can choose Queen, Rook, Bishop, Knight, or Vanguard.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 51,
    sectionNumber: 8,
    sectionTitle: '8. Standard Chess Special Rules',
    questionText:
      'Can a promoted piece gain abilities that are otherwise restricted to a particular board or combat mode?',
    ruleId: 'CHESS-05',
    ruleName: 'Board-Scoped Promotion Capabilities',
    status: 'CONFIRMED',
    decision: 'No',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'No. Promotion options respect the active board’s roster and combat mode: Vanguard promotion is only available on 20x20 boards where Vanguards exist, and RPG stats/bonuses only apply in RPG Combat mode.',
    doesNotAllow: [
      'Promoting into a 20x20 Vanguard on an 8x8 Classic board',
    ],
    check: 'Promoted pieces use the exact movement and check rules of their new class.',
    example:
      'On Classic 8x8, Pawn promotion offers Queen, Rook, Bishop, and Knight only.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 9: RPG COMBAT (Q52 - Q60)
  // ============================================================================
  {
    questionNumber: 52,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'What starts combat: attempting a legal capture, entering an occupied tile, or selecting an attack action?',
    ruleId: 'RPG-01',
    ruleName: 'Triggering RPG Combat via Legal Capture Moves',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'RPG Combat starts whenever a player selects or drags a piece to execute a legal capture move onto a tile occupied by an enemy piece. (Note: Trebuchet Bombardment is a knockback displacement action, not a capture clash, so it knocks the target back 3 tiles without triggering a D20 or RPS duel).',
    doesNotAllow: [
      'Attacking an enemy piece that is not a legal capture target under current board and Play Style rules',
    ],
    check: 'Legal capture targets are highlighted in red/rose on the 3D board.',
    example:
      'Clicking a friendly Knight and then clicking an enemy Rook on a legal L-jump square initiates an RPG 1d20 combat clash.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 53,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'When an attack fails to eliminate its target, where do both pieces physically remain?',
    ruleId: 'RPG-02',
    ruleName: 'Attacker Return-to-Origin on Non-Lethal or Lost RPG Clash',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'If an RPG attack eliminates the defender (defender HP drops to 0), the attacker advances onto the defender’s square and claims it. If the defender survives with HP > 0 (whether the attacker dealt partial damage, the defender dodged, or the defender won the dice roll and dealt counter-damage), the defender stays on its square and the surviving attacker is sent back to the original tile it attacked from (`move.from`). If the attacker’s own HP drops to 0 from counter-damage or losing RPS, the attacker is eliminated and removed from the board.',
    doesNotAllow: [
      'Two surviving pieces occupying the exact same tile after the clash animation finishes',
    ],
    check:
      'After the clash resolves, check is evaluated on the resulting piece positions.',
    example:
      'A White Knight at (4,4) attacks a Black Rook at (5,6) and deals 35 damage, leaving the Rook with 70 HP; the Rook stays at (5,6) with 70 HP and the Knight returns to (4,4).',
    openQuestions: 'None.',
  },
  {
    questionNumber: 54,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'Who acts next during an ongoing duel, and does each duel round consume a normal turn?',
    ruleId: 'RPG-03',
    ruleName: 'Single-Turn RPG Clash Resolution and Turn Handoff',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'Each RPG attack resolves immediately on the attacker’s turn (one 3D D20 roll comparison or one decisive Rock-Paper-Scissors showdown) and consumes that player’s turn. If the defender survives, the attacker returns to its origin square with both pieces retaining their updated HP, and the turn passes normally to the opposing player.',
    doesNotAllow: [
      'Free extra attacks on the same turn after failing to eliminate a defender',
    ],
    check: 'Turn handoff immediately checks whether the next player’s King is in check.',
    example:
      'White attacks a Black Rook; the D20 roll deals 40 damage and sends White’s piece back to its starting tile. It is now Black’s turn.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 55,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'Can other pieces attack, support, or interrupt an ongoing duel?',
    ruleId: 'RPG-04',
    ruleName: 'Multi-Piece Support Modifiers and Follow-Up Attacks',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'Yes! Because a surviving defender remains on its square with reduced HP and the attacker returns to its origin tile, any other friendly piece can attack that wounded defender on subsequent turns, and nearby friendly Gargoyles provide a +20% damage-reduction Guard Aura to supported allies.',
    doesNotAllow: ['Wounded pieces magically resetting to full HP between turns'],
    check: 'Wounded pieces still project check until their HP is reduced to 0.',
    example:
      'After a White Bishop chips a Black Queen down to 45 HP, a White Rook can strike the wounded Black Queen on the next turn to finish eliminating it.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 56,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'Do all same-class encounters use rock-paper-scissors, including King versus King?',
    ruleId: 'RPG-05',
    ruleName: 'Same-Class Mirror Duels via Rock-Paper-Scissors',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'Yes. Whenever two pieces of the exact same unit class engage in RPG Combat (e.g., Pawn vs. Pawn, Knight vs. Knight, Rook vs. Rook, Queen vs. Queen), combat resolves via a 1-of-3 Rock-Paper-Scissors showdown (Rock crushes Scissors, Scissors pierces Paper, Paper wards Rock; ties automatically re-throw until a winner is decided). Note: King vs. King cannot legally occur because a King can never move onto a tile that is within the enemy King’s 13-tile check range.',
    doesNotAllow: [
      'A King moving into the enemy King’s check range',
      'Ending a Rock-Paper-Scissors duel in a tie without resolving a winner',
    ],
    check: 'King safety prevents illegal King-into-King moves before combat starts.',
    example:
      'When a White Knight attacks a Black Knight in RPG mode, the Rock-Paper-Scissors modal opens for the player (or resolves automatically for AI).',
    openQuestions: 'None.',
  },
  {
    questionNumber: 57,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'Can a defending piece eliminate an attacker through RPS even when that would expose its own King?',
    ruleId: 'RPG-06',
    ruleName: 'Defender Counter-Elimination in Rock-Paper-Scissors and D20',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'Yes! If a defender wins a Rock-Paper-Scissors mirror clash (or kills a wounded attacker via D20 counter-damage), the defender stays right on its own square and the attacker is eliminated from the board. Because the defender never leaves its square, it never uncovers a pin on its own King, and removing the enemy attacker can only improve or maintain its own King’s safety.',
    doesNotAllow: [
      'An eliminated attacker capturing the defender’s square',
    ],
    check:
      'If the attacker was a King and is eliminated by counter-damage, the defending army immediately wins the match.',
    example:
      'A White Pawn attacks a Black Pawn in RPG mode and chooses Scissors while Black chooses Rock; Black’s Rock crushes Scissors, eliminating the White Pawn while the Black Pawn remains safely on its square.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 58,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'How are D20 rolls, damage, evasion, critical hits, elevation, and support calculated?',
    ruleId: 'RPG-07',
    ruleName: 'D20 Combat Roll, Evasion, Elevation, and Damage Formula',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'When two different piece classes clash in RPG mode, both roll 1d20 (with +1 roll bonus for High Ground or Gargoyle Bulwark, -1 for Uphill). 1) If the Attacker’s roll is >= the Defender’s roll: the attack hits (unless the defender triggers Evasion on a non-Natural-20 roll). Base damage is `ATK - DEF * 0.52 + (attackerRoll - defenderRoll) * 1.5`, modified by Elevation (+10% per tier above, +30% from 4x4 Summit, +15% from Vertical Wall ambush, -10% per tier uphill except Ascendant), Gargoyle Guard Aura (-20% damage taken), and Critical Strike (1.5x damage on Natural 20 or Crit % roll). 2) If the Defender rolls strictly higher than the Attacker: the defender counters, dealing counter-damage to the attacker and sending the surviving attacker back to its origin tile!',
    doesNotAllow: [
      'Dodging a Natural 20 roll',
      'Dealing 0 or negative damage on a confirmed hit (minimum hit damage is at least 15% of ATK)',
    ],
    check: 'The 3D D20 Combat Showcase banner displays the exact rolls and formula after each clash.',
    example:
      'A Queen (65 ATK) on Tier 2 striking a Rook (32 DEF) on Tier 0 gains +20% High Ground bonus and +1 D20 roll bonus.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 59,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'Can HP recover? Are buffs permanent, temporary, or tied to location?',
    ruleId: 'RPG-08',
    ruleName: 'HP Recovery, Location Buffs, and Permanent Progression',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn:
      'Depends on the piece class and trigger (terrain stance buffs vs. permanent climb/level/promotion buffs).',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      '1) Location-Tied Buffs: High Ground (+10% DMG/tier), 4x4 Summit (+30% DMG), and Gargoyle Stone Bulwark (+10 DEF/+15% EVA on walls, +6 DEF/+10% EVA on terraces) are active while occupying that terrain. 2) Permanent Buffs & Healing: The Ascendant permanently gains +2 ATK, +2 DEF, and heals +8 HP (up to maxHp) each time it climbs to a higher tier; Pawn Promotion restores/upgrades stats to the promoted class’s full HP/ATK/DEF.',
    doesNotAllow: ['Healing above a piece’s maximum HP cap'],
    check: 'Stat buffs affect RPG combat survivability and lethality.',
    example:
      'An Ascendant that climbs 1 tier heals +8 HP and permanently tempers its ATK and DEF by +2.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 60,
    sectionNumber: 9,
    sectionTitle: '9. RPG Combat',
    questionText:
      'How do RPG attacks interact with check, checkmate, stalemate, and King safety?',
    ruleId: 'RPG-09',
    ruleName: 'King Safety Priority Over RPG Combat Rolls',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'RPG Combat',
    rule:
      'Before any move or RPG attack is allowed, standard Chess King safety is strictly enforced: a player may only choose moves whose deterministic board simulation does not leave their own King in check. Furthermore, if an RPG clash results in either King dropping to 0 HP, the surviving King’s army wins immediately.',
    doesNotAllow: [
      'Moving a pinned piece off its pin line to gamble on an RPG dice roll while exposing your own King to check',
    ],
    check:
      'Check, Checkmate, and Stalemate use the exact same legal move filter in RPG mode as in Standard mode.',
    example:
      'If a White Bishop is pinned to the White King by an enemy Rook, the White Bishop cannot leave the pin ray to attack another piece.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 10: TURN ORDER, LEGALITY, AND EDGE CASES (Q61 - Q67)
  // ============================================================================
  {
    questionNumber: 61,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'Does every normal move, attack, swap, and bombardment consume exactly one turn?',
    ruleId: 'TURN-01',
    ruleName: 'One Action Per Turn Law',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. White moves first, and players alternate turns. Every legal action—whether a normal move, capture, Castling, En Passant, Pawn Promotion, Vanguard Rook Exchange, or Trebuchet Knockback Bombardment—consumes exactly one full turn and passes the turn to the opponent.',
    doesNotAllow: ['Taking two moves in a single turn'],
    check: 'Check is re-evaluated at the end of every single turn.',
    example:
      'Using a Vanguard to swap places with a friendly Rook consumes White’s turn; Black acts next.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 62,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'Can any ability be used while in check if it does not remove the check?',
    ruleId: 'TURN-02',
    ruleName: 'Mandatory Check Resolution on All Abilities',
    status: 'CONFIRMED',
    decision: 'No',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'No. Every move and special ability (including Vanguard Rook Exchange and Trebuchet Bombardment) is simulated before it is allowed: if the resulting board state still leaves your King in check, that move or ability is illegal and cannot be played. (Note: Castling is additionally forbidden whenever the King is currently in check).',
    doesNotAllow: [
      'Firing a Trebuchet Bombardment or swapping a Vanguard while in check unless that action blocks, displaces, or resolves the check',
    ],
    check:
      'Interestingly, if a Trebuchet Bombardment knocks a checking enemy piece 3 tiles away off its checking ray so the King is no longer in check, that Bombardment IS legal!',
    example:
      'If a Black Rook is checking the White King, White can only play moves (including a Trebuchet knockback on that Rook) that end with the White King out of check.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 63,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'Can a piece move onto an occupied friendly tile? Can it pass through one?',
    ruleId: 'TURN-03',
    ruleName: 'Friendly Tile Occupancy and Vanguard Swap Exception',
    status: 'CONFIRMED',
    decision: 'Depends',
    dependsOn:
      'Depends on whether the move is a Vanguard Rook Exchange (or Castling) vs. an ordinary move.',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'No piece may ever end its turn stacked on the same tile as a friendly piece. Sliding pieces cannot pass through occupied friendly tiles; only jumpers (Knight, Gargoyle in Open Surface) and ranged arcs (Trebuchet Bombardment) can pass over friendly pieces. The ONLY action where a piece targets a friendly piece’s square is the Vanguard Rook Exchange (`V⇄R`), which simultaneously swaps the Vanguard and its own-team Rook so neither tile has two pieces.',
    doesNotAllow: [
      'Capturing a friendly piece',
      'Two pieces occupying the same square at the end of a turn',
      'A Vanguard swapping with any piece other than a living Rook of its own team',
    ],
    check: 'Friendly pieces block sliding check rays.',
    example:
      'Clicking a friendly Rook while a friendly Vanguard is selected swaps their two positions cleanly.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 64,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'Can a piece move onto a vertical tile occupied by an enemy it is forbidden to capture?',
    ruleId: 'TURN-04',
    ruleName: 'Forbidden Cross-Surface Capture Tiles Cannot Be Entered',
    status: 'CONFIRMED',
    decision: 'No',
    appliesTo: 'Quick Pyramid (12x12) and Grand Pyramid (20x20)',
    playStyle: 'Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'No. In Surface Bound play, if a vertical wall tile is occupied by an enemy piece that your horizontal piece is forbidden to capture (i.e., any non-Pawn horizontal piece, or a Pawn that is not attacking on a 1-step forward diagonal), you CANNOT move onto that occupied vertical tile and you cannot slide through it. You must stop on an empty tile before it.',
    doesNotAllow: [
      'Co-occupying a vertical wall tile with an uncapturable enemy',
      'Sliding through an uncapturable enemy on a vertical wall',
    ],
    check: 'Enforces Law 2 (Same-Surface Combat) and Law 4 (Cross-Surface Blocking).',
    example:
      'A Horizontal Rook approaching a Vertical wall tile occupied by an enemy Bishop must stop on the horizontal square at the foot of the wall.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 65,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'What happens when a special ability has no legal destination?',
    ruleId: 'TURN-05',
    ruleName: 'Unavailable Special Ability Handling',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'If a special ability has no legal target or destination—for example, if both friendly Rooks have been captured (so Vanguard Rook Exchange has no partner), or if a Trebuchet is on the Pyramid and there are no enemy pieces on the 4x4 Summit (or all knockback landing squares are full)—that special ability simply generates zero move indicators and cannot be selected, while the piece’s normal legal moves remain available.',
    doesNotAllow: ['Forcing or forfeiting a turn on an impossible special ability'],
    check: 'Only legal moves with valid destinations count toward preventing Checkmate or Stalemate.',
    example:
      'If a Trebuchet climbs onto Tier 1 of the Pyramid while no enemy pieces stand on the 4x4 Summit, no amber Bombardment rings appear, but the Trebuchet can still move 1–2 orthogonal tiles or jump-capture within 1–2 tiles.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 66,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'What happens if two rules conflict—for example, a Pawn exception versus a general same-surface restriction?',
    ruleId: 'TURN-06',
    ruleName: 'Specific Exception Precedence Over General Surface Law',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'An explicit, narrowly-scoped piece exception overrides a general surface restriction, but NEVER overrides King Safety or board boundaries. Specifically: (1) The Pawn Surface Bound Exception overrides the general Same-Surface Combat Law for 1-step forward-diagonal Pawn captures and checks only; (2) The Vanguard Vertical-Wall Exception overrides the Vanguard’s forward-only rule to permit sideways movement while on a vertical wall; (3) The Trebuchet On-Pyramid 4x4 Summit Rule overrides the Trebuchet’s normal 3–6 ray bombardment whenever the Trebuchet is on the Pyramid.',
    doesNotAllow: [
      'A piece exception overriding King Safety (a Pawn cannot make a cross-surface capture if doing so exposes its own King to check)',
    ],
    check: 'Specific exceptions (like Cross-Surface Pawn Check) are explicitly integrated into check detection.',
    example:
      'In Surface Bound mode, general Law 2 forbids cross-surface attacks, but Rule PAWN-07 explicitly permits a Pawn to capture and check 1 step forward-diagonally across surfaces.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 67,
    sectionNumber: 10,
    sectionTitle: '10. Turn Order, Legality, and Edge Cases',
    questionText:
      'Which rule has priority: King safety, movement geometry, surface restrictions, or special abilities?',
    ruleId: 'TURN-07',
    ruleName: 'Strict four-level Rule Priority Hierarchy',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Rules are resolved in this strict 4-tier priority order (highest to lowest): 1) KING SAFETY & BOARD BOUNDARIES (Absolute highest priority: no move or ability may ever leave your own King in check or go off-board). 2) PLAY STYLE SURFACE & COLOR LAWS (Surface Bound Same-Surface Combat, Cross-Surface Blocking, Jump Color Lock, and Summit Descent—with the explicit Pawn forward-diagonal exception). 3) PIECE SPECIAL ABILITIES & CONSTRAINTS (Vanguard 9->1 contraction & own-team Rook Exchange, Trebuchet 1–2 Jump-Capture & On-Pyramid 4x4 Summit Bombardment, Castling, En Passant, Promotion). 4) BASE PIECE MOVEMENT GEOMETRY.',
    doesNotAllow: [
      'Any lower-tier rule (geometry, special ability, or surface rule) violating a higher-tier rule (King Safety)',
    ],
    check: 'King Safety is always the final gate on every candidate move.',
    example:
      'Even if a Vanguard has a valid friendly Rook to swap with (Tier 3), if swapping them would expose its own King to check (Tier 1), the swap is forbidden.',
    openQuestions: 'None.',
  },

  // ============================================================================
  // SECTION 11: AI, TEACHING, AND IMPLEMENTATION (Q68 - Q72)
  // ============================================================================
  {
    questionNumber: 68,
    sectionNumber: 11,
    sectionTitle: '11. AI, Teaching, and Implementation',
    questionText:
      'Must the AI, player move highlights, check detection, and Tactical Academy use the same legal-move rules?',
    ruleId: 'IMPL-01',
    ruleName: 'Single Authoritative Move-Validation Engine for Player, AI, and Drills',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. Human move highlights, click/drag execution, AI Minimax move generation, Check/Checkmate/Stalemate detection, RPG Hover Odds, and Tactical Academy Drills all call the exact same authoritative move-validation functions (`getRawMovesForPiece`, `getValidMovesForPiece`, `isKingInCheck`, `simulateMove`). Neither the AI nor the player can ever make a move that the rules engine forbids.',
    doesNotAllow: [
      'The AI making moves that a human player would not be allowed to make in the same position',
    ],
    check: 'Check and Checkmate are 100% identical for Human and AI players.',
    example:
      'When Surface Bound is toggled on, both Human move indicators and AI candidate moves immediately obey Same-Surface Combat, Jump Color Lock, and the Pawn Cross-Surface Exception.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 69,
    sectionNumber: 11,
    sectionTitle: '11. AI, Teaching, and Implementation',
    questionText:
      'What should the AI do when it has overwhelming material but cannot actually force checkmate?',
    ruleId: 'IMPL-02',
    ruleName: 'AI Advantage Conversion Doctrine (Contain, Coordinate, Compress, Mate)',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'When the opponent has few pieces remaining or the AI holds overwhelming material advantage, the AI shifts into Advantage Conversion Mode (`contain -> coordinate -> compress -> force -> mate`): it coordinates multiple attackers to cut off files, ranks, and Pyramid surface escape routes, penalizes pointless one-piece chasing checks that merely make the enemy King run, and heavily penalizes accidental Stalemate (-95,000) or square repetition (-5,500). If a Pawn promotion or Summit color release is needed to build a mating net, the AI prioritizes advancing Pawns to promote or driving jumpers to the 4x4 Summit.',
    doesNotAllow: [
      'Endlessly chasing a lone King with a single piece in a repetitive loop',
      'Accidentally stalemating a trapped enemy King when winning',
    ],
    check: 'Prioritizes moves that shrink the enemy King’s legal escape square count prior to delivering the final checkmate.',
    example:
      'Instead of giving 10 consecutive lone-Rook checks that let the enemy King oscillate between two squares, the AI brings a second piece forward to seal the escape rank and deliver checkmate.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 70,
    sectionNumber: 11,
    sectionTitle: '11. AI, Teaching, and Implementation',
    questionText:
      'Should the AI explain why a move is illegal, including surface, color, path, and King-safety restrictions?',
    ruleId: 'IMPL-03',
    ruleName: 'AI Chess Teacher and Piece Capabilities Inspector Explanations',
    status: 'CONFIRMED',
    decision: 'Yes',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Yes. The AI Chess Teacher side panel explains positional rationale, active Play Style constraints, and candidate move evaluations in real time, while the standalone "Piece Capabilities & Range" dropdown in the top HUD bar displays an interactive 7x7 Movement Diagram, range badges, 3D Pyramid navigation rules, and active Surface Bound restrictions for every piece in the current mode.',
    doesNotAllow: ['Opaque or unexplained movement restrictions'],
    check: 'Highlights checking threats and King-safety constraints on the 3D board.',
    example:
      'Opening "Piece Capabilities & Range" and selecting Trebuchet shows both its Ground (3–6 ray) and On-Pyramid (4x4 Summit Only) diagrams.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 71,
    sectionNumber: 11,
    sectionTitle: '11. AI, Teaching, and Implementation',
    questionText:
      'Which rules are fixed during a match, and which visual settings may be changed during play?',
    ruleId: 'IMPL-04',
    ruleName: 'Match-Locked Setup Rules vs. Live Visual & Assistance Settings',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      '1) Fixed During an Active Match (changing them starts/prepares a new match): Battlefield Topology (8x8, 12x12, 20x20 Flat, 20x20 Pyramid) and Army Scale (Standard vs. Kingdom). 2) Adjustable Anytime During Play Without Resetting the Board: Camera Presets, Night Mode / Daylight Mode, Pyramid Opacity (0%–100%), Auto-Glass Transparency, Occlusion Beacons (Off / Opponent Only / Both), Sound Effects, Clean Board View [Tab], AI Simulation Speed (0.5x / 1x / 2x) & Pause/Step, Piece Capabilities & Range Dropdown, and Play Style inspection.',
    doesNotAllow: [
      'Resizing the board from 8x8 to 20x20 mid-game without starting a new board state',
    ],
    check: 'Visual settings never alter legal check or movement calculations.',
    example:
      'A player can toggle Night Mode, rotate the 3D camera, or adjust Pyramid transparency to 40% mid-turn without interrupting their game.',
    openQuestions: 'None.',
  },
  {
    questionNumber: 72,
    sectionNumber: 11,
    sectionTitle: '11. AI, Teaching, and Implementation',
    questionText:
      'What should happen if the board geometry or starting army fails validation before the game begins?',
    ruleId: 'IMPL-05',
    ruleName: 'Pre-Game Board Geometry and Army Integrity Verification',
    status: 'CONFIRMED',
    decision: 'Custom Rule',
    appliesTo: 'All 4 Boards',
    playStyle: 'Both Open Surface and Surface Bound',
    combatMode: 'Both Standard and RPG',
    rule:
      'Before any match or drill begins, the board generator deterministically constructs all horizontal tiles, elevation tiers, and vertical cliff wall tiles, verifies that every starting piece sits on a valid in-bounds coordinate with positive HP and a valid checker color (`originColor`), and ensures each side has a living King. If saved state or custom data is ever invalid, the engine automatically resets to the clean canonical starting deployment for the selected Battlefield and Army.',
    doesNotAllow: [
      'Starting a match with a missing King, out-of-bounds piece coordinates, or corrupted piece stats',
    ],
    check: 'Guarantees a legal initial state with neither King starting in checkmate.',
    example:
      'Selecting "New Game & Start" generates a verified, fresh deployment and runs the 3-2-1 Ready Countdown.',
    openQuestions: 'None.',
  },
];

const CODEX_QUESTIONNAIRE_STORAGE_KEY = 'ascension_codex_questionnaire_v2';

export function loadCodexQuestionnaireRules(): CodexRuleQuestionItem[] {
  try {
    const raw = localStorage.getItem(CODEX_QUESTIONNAIRE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CodexRuleQuestionItem[];
      if (Array.isArray(parsed) && parsed.length === DEFAULT_CODEX_QUESTIONNAIRE_RULES.length) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load saved Codex Questionnaire rules:', e);
  }
  return DEFAULT_CODEX_QUESTIONNAIRE_RULES.map((r) => ({
    ...r,
    doesNotAllow: [...r.doesNotAllow],
  }));
}

export function saveCodexQuestionnaireRules(rules: CodexRuleQuestionItem[]): void {
  try {
    localStorage.setItem(CODEX_QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('Failed to save Codex Questionnaire rules:', e);
  }
}

export function resetCodexQuestionnaireRules(): CodexRuleQuestionItem[] {
  try {
    localStorage.removeItem(CODEX_QUESTIONNAIRE_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear Codex Questionnaire rules:', e);
  }
  return DEFAULT_CODEX_QUESTIONNAIRE_RULES.map((r) => ({
    ...r,
    doesNotAllow: [...r.doesNotAllow],
  }));
}

/**
 * Formats a single rule entry into the exact canonical text-file Codex block requested by the user.
 */
export function formatSingleRuleAsCodexText(item: CodexRuleQuestionItem): string {
  const lines: string[] = [
    `--------------------------------------------------------------------------------`,
    `QUESTION ${item.questionNumber} (${item.sectionTitle}):`,
    `Q${item.questionNumber}. ${item.questionText}`,
    `ANSWER: ${item.decision}${item.decision === 'Depends' && item.dependsOn ? ` — ${item.dependsOn}` : ''}`,
    ``,
    `RULE ID: ${item.ruleId}`,
    `RULE NAME: ${item.ruleName}`,
    ``,
    `STATUS: ${item.status}`,
    `APPLIES TO: ${item.appliesTo}`,
    `PLAY STYLE: ${item.playStyle}`,
    `COMBAT MODE: ${item.combatMode}`,
    ``,
    `RULE:`,
    item.rule,
    ``,
    `DOES NOT ALLOW:`,
    ...(item.doesNotAllow.length > 0
      ? item.doesNotAllow.map((d) => `- ${d}`)
      : ['- None specified']),
    ``,
    `CHECK:`,
    item.check,
    ``,
    `EXAMPLE:`,
    item.example,
  ];

  if (item.supersededPriorWording) {
    lines.push(``, `PRIOR / SUPERSEDED WORDING (TRACEABILITY):`, item.supersededPriorWording);
  }

  lines.push(``, `OPEN QUESTIONS:`, item.openQuestions || 'None.');
  return lines.join('\n');
}

/**
 * Formats all 72 rules into a complete, self-contained, canonical text-file Codex.
 */
export function formatAllQuestionnaireRulesAsText(
  rules: CodexRuleQuestionItem[] = DEFAULT_CODEX_QUESTIONNAIRE_RULES
): string {
  const confirmedCount = rules.filter((r) => r.status === 'CONFIRMED').length;
  const undecidedCount = rules.filter((r) => r.status === 'UNDECIDED').length;
  const supersededCount = rules.filter((r) => r.status === 'SUPERSEDED').length;

  const header = [
    `================================================================================`,
    `ASCENSION 3D CHESS — COMPLETE 72-RULE QUESTIONNAIRE & CANONICAL CODEX (.TXT)`,
    `================================================================================`,
    `Total Rules Answered: ${rules.length} / 72`,
    `Status Summary: ${confirmedCount} CONFIRMED · ${undecidedCount} UNDECIDED · ${supersededCount} SUPERSEDED`,
    `Format: RULE ID / RULE NAME / STATUS / APPLIES TO / PLAY STYLE / COMBAT MODE /`,
    `        RULE / DOES NOT ALLOW / CHECK / EXAMPLE / OPEN QUESTIONS`,
    `================================================================================`,
    ``,
  ].join('\n');

  const body = CODEX_QUESTIONNAIRE_SECTIONS.map((sec) => {
    const secRules = rules.filter((r) => r.sectionNumber === sec.sectionNumber);
    return [
      `================================================================================`,
      `SECTION ${sec.title.toUpperCase()} (${sec.questionRange})`,
      `================================================================================`,
      ``,
      secRules.map((r) => formatSingleRuleAsCodexText(r)).join('\n\n'),
      ``,
    ].join('\n');
  }).join('\n');

  return `${header}\n${body}`;
}

export function downloadCodexQuestionnaireTxt(
  rules: CodexRuleQuestionItem[] = loadCodexQuestionnaireRules()
): void {
  const textContent = formatAllQuestionnaireRulesAsText(rules);
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Ascension_3D_Chess_72_Rule_Codex_Questionnaire.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
