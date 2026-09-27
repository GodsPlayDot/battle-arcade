import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AIDifficulty,
  AITeachingThought,
  ArmyDeployment,
  BoardType,
  CombatResult,
  GameMode,
  Move,
  MoveHistoryEntry,
  OngoingDuel,
  Piece,
  PieceBeaconInfo,
  PieceColor,
  PieceType,
  PlayStyle,
  PlayerMode,
  Position,
  RPSChoice,
  VisibilitySettings,
} from './types/chess';
import {
  createInitialPieces,
  getDefaultRPGStats,
  isSummitTile,
  normalizePiecesToBoard,
  toAuthoritativePosition,
} from './logic/pyramidBoard';
import {
  findBombardKnockbackPosition,
  getPieceAt,
  getPieceAtPosition,
  getValidMovesForPiece,
  hasAnyValidMoveForColor,
  isKingInCheck,
  setActivePlayStyle,
  setValidationLastMove,
} from './logic/moveValidation';
import { processDuelRound, resolveRPGCombat } from './logic/rpgCombat';
import { findBestMoveAI, recordMatchOutcome } from './logic/chessAI';
import { sounds } from './audio/soundEffects';

import { ThreeCanvas } from './components/ThreeCanvas';
import { HUD } from './components/HUD';
import { ReadyCountdown } from './components/ReadyCountdown';
import { OngoingDuelsPanel } from './components/OngoingDuelsPanel';
import { InteractiveDrillScenario, TutorialModal } from './components/TutorialModal';
import { PieceGuideModal } from './components/PieceGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { GameStartMenu } from './components/GameStartMenu';
import { RPGHoverCard } from './components/RPGHoverCard';
import { AITeachingCard } from './components/AITeachingCard';
import { PieceBeaconsOverlay } from './components/PieceBeaconsOverlay';
import {
  CombatAnimationShowcase,
  CombatShowcaseEvent,
  MoveHistoryDrawer,
  PawnPromotionModal,
  RockPaperScissorsModal,
} from './components/MoveHistoryDrawer';
import { generateAITeachingThought } from './logic/aiTeaching';
import {
  analyzeTacticalContext,
  calculateLiveRPGOdds,
  CombatOdds,
  TacticalContext,
} from './logic/rpgTactics';
import { RotateCcw, AlertTriangle, GraduationCap, Play, X } from 'lucide-react';

export default function App() {
  // Primary Game Setup (The 5 Canonical Pillars: Battlefield, Army, Combat, Play Style, Players)
  const [boardType, setBoardType] = useState<BoardType>('pyramid');
  const [armyDeployment, setArmyDeployment] = useState<ArmyDeployment>('kingdom');
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('surface_bound');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('human_vs_ai');
  const [humanColor, setHumanColor] = useState<PieceColor>('white');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('Expert');
  const [autoRematch, setAutoRematch] = useState<boolean>(true);
  const [autoRematchCountdown, setAutoRematchCountdown] = useState<number | null>(null);

  // Audio & Camera Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<string>('isometric');
  const [cameraPresetTrigger, setCameraPresetTrigger] = useState<number>(0);
  const [highlightVerticalTiles, setHighlightVerticalTiles] = useState(true);

  // Start Menu & Match Lifecycle State: Opens on Game Start Menu first before entering the match
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(true);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isMatchLocked, setIsMatchLocked] = useState(false);
  const [isReadyBannerDismissed, setIsReadyBannerDismissed] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const countdownTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Dedicated AI Chess Teacher Side Panel & Clean Board Mode State
  const [isTeacherPanelOpen, setIsTeacherPanelOpen] = useState(true);
  const [isCleanBoardMode, setIsCleanBoardMode] = useState(false);

  // Move History Log, Pawn Promotion Choice & Rock-Paper-Scissors Mirror Clash State
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [pendingPromotionMove, setPendingPromotionMove] = useState<Move | null>(null);
  const [pendingRPSClash, setPendingRPSClash] = useState<{
    move: Move;
    attacker: Piece;
    defender: Piece;
  } | null>(null);

  // AI vs AI Teaching & Move Visualization State
  const [aiTeachingThought, setAiTeachingThought] = useState<AITeachingThought | null>(null);
  const [isAiSimulationPaused, setIsAiSimulationPaused] = useState(false);
  const [aiSimulationSpeed, setAiSimulationSpeed] = useState<number>(1);
  const [activeTacticalLine, setActiveTacticalLine] = useState<{
    from: Position;
    to: Position;
    color?: number;
    isProminent?: boolean;
  } | null>(null);

  // Pyramid 3D Visibility System State (Default: Night Mode ON + Always Transparent + Camera Focus ON + Beacons Both Sides)
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    autoAssistance: true,
    hiddenPieceBeacons: true,
    beaconSide: 'both',
    terrainTransparency: 'on',
    pyramidOpacity: 25,
    focusCameraOnActiveMove: true,
    nightMode: true,
  });
  const [detectedBeacons, setDetectedBeacons] = useState<PieceBeaconInfo[]>([]);
  const [focusPieceId, setFocusPieceId] = useState<string | null>(null);
  const [manualFocusTrigger, setManualFocusTrigger] = useState<number>(0);
  const [isActionOccluded, setIsActionOccluded] = useState(false);

  // Ready Countdown State: 3 -> 2 -> 1 -> 'BEGIN' -> null
  const [countdownStep, setCountdownStep] = useState<number | 'BEGIN' | null>(null);

  // Match State: Grand Pyramid + Kingdom Army + Standard Chess initialized cleanly
  const [pieces, setPieces] = useState<Piece[]>(() =>
    createInitialPieces('pyramid', false, 'kingdom', 'standard')
  );
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [turnCount, setTurnCount] = useState<number>(1);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [hoverMoves, setHoverMoves] = useState<Move[]>([]);
  const [previewMove, setPreviewMove] = useState<Move | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [ongoingDuels, setOngoingDuels] = useState<OngoingDuel[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);

  // RPG Tactical Hover State (Dynamic Positional Odds & Whole-board Support)
  const [hoveredPiece, setHoveredPiece] = useState<Piece | null>(null);
  const [hoveredTargetPiece, setHoveredTargetPiece] = useState<Piece | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isPieceGuideOpen, setIsPieceGuideOpen] = useState(false);

  // 3D Animation Triggers
  const [clashingPieces, setClashingPieces] = useState<{
    attackerId: string;
    defenderId: string;
    damageText?: string;
    attackerReturned?: boolean;
    fromPos?: Position;
    toPos?: Position;
  } | null>(null);

  const [diceRollVisual, setDiceRollVisual] = useState<{
    roll: number;
    defenderRoll?: number;
    isAttacker: boolean;
    position?: Position;
    rpsText?: string;
  } | null>(null);
  const [combatShowcaseEvent, setCombatShowcaseEvent] = useState<CombatShowcaseEvent | null>(null);

  // Match History for Undo & AI Cross-Game Learning
  const historyRef = useRef<{ pieces: Piece[]; turn: PieceColor; duels: OngoingDuel[] }[]>([]);
  const matchMovesRef = useRef<Move[]>([]);
  const matchOutcomeRecordedRef = useRef<boolean>(false);

  // Keep moveValidation's activePlayStyle synchronized
  setActivePlayStyle(playStyle);

  // Memoized Board Tactical Status Hook (Check, Checkmate, Stalemate)
  // Only recomputes when turn, pieces, boardType, playStyle, or match state changes
  const { inCheck, checkmate, stalemate } = useMemo(() => {
    const kingInCheck = isKingInCheck(currentTurn, pieces, boardType, playStyle);
    if (!isMatchActive || winner) {
      return { inCheck: kingInCheck, checkmate: false, stalemate: false };
    }
    const hasLegalMove = hasAnyValidMoveForColor(currentTurn, pieces, boardType, playStyle);
    return {
      inCheck: kingInCheck,
      checkmate: kingInCheck && !hasLegalMove,
      stalemate: !kingInCheck && !hasLegalMove,
    };
  }, [currentTurn, pieces, boardType, playStyle, isMatchActive, winner]);

  // Helper to record match outcome at most once per completed match
  const recordSingleMatchOutcome = useCallback(
    (matchWinner: PieceColor | 'draw' | null, aiPerspective: PieceColor = 'black') => {
      if (matchOutcomeRecordedRef.current) return;
      matchOutcomeRecordedRef.current = true;
      recordMatchOutcome(boardType, armyDeployment, gameMode, matchWinner, aiPerspective, matchMovesRef.current);
    },
    [boardType, armyDeployment, gameMode]
  );

  // Handle immediate checkmate / stalemate detection
  useEffect(() => {
    if (countdownStep !== null || !isMatchActive) return;

    if (checkmate && !winner) {
      const victor = currentTurn === 'white' ? 'black' : 'white';
      setWinner(victor);
      setIsMatchLocked(false);
      sounds.playVictory();
      recordSingleMatchOutcome(victor, 'black');
    } else if (stalemate && !winner) {
      setWinner('draw');
      setIsMatchLocked(false);
      recordSingleMatchOutcome('draw', 'black');
    }
  }, [checkmate, stalemate, currentTurn, winner, countdownStep, isMatchActive, recordSingleMatchOutcome]);

  // Audio alert on Check
  useEffect(() => {
    if (inCheck && !checkmate && !winner && soundEnabled && countdownStep === null && isMatchActive) {
      sounds.playCheck();
    }
  }, [inCheck, checkmate, winner, soundEnabled, countdownStep, isMatchActive]);

  // Restart / Reset Match to Clean Setup
  const restartMatch = useCallback((keepActive: boolean = true) => {
    setValidationLastMove(null);
    matchOutcomeRecordedRef.current = false;
    setAutoRematchCountdown(null);
    const freshPieces = createInitialPieces(boardType, false, armyDeployment, gameMode);
    setPieces(freshPieces);
    setCurrentTurn('white');
    setTurnCount(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setHoverMoves([]);
    setPreviewMove(null);
    setLastMove(null);
    setOngoingDuels([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);
    setMoveHistory([]);
    setPendingPromotionMove(null);
    setAiTeachingThought(null);
    setActiveTacticalLine(null);
    historyRef.current = [];
    matchMovesRef.current = [];
    setIsMatchActive(Boolean(keepActive));
    sounds.playTurnChange();
  }, [boardType, armyDeployment, gameMode]);

  // AI vs AI Auto-Rematch Effect: When a match ends in AI vs AI mode and autoRematch is enabled,
  // count down 3 -> 2 -> 1 and automatically launch the next match so the AIs keep fighting and learning!
  useEffect(() => {
    if (
      !winner ||
      playerMode !== 'ai_vs_ai' ||
      !autoRematch ||
      isAiSimulationPaused ||
      isStartMenuOpen
    ) {
      setAutoRematchCountdown(null);
      return;
    }

    setAutoRematchCountdown(3);
    const t1 = setTimeout(() => setAutoRematchCountdown(2), 1000);
    const t2 = setTimeout(() => setAutoRematchCountdown(1), 2000);
    const t3 = setTimeout(() => {
      setAutoRematchCountdown(null);
      restartMatch();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [winner, playerMode, autoRematch, isAiSimulationPaused, isStartMenuOpen, restartMatch]);

  // Tab shortcut for Clean Board Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !isSettingsOpen && !isTutorialOpen && !isPieceGuideOpen) {
        e.preventDefault();
        setIsCleanBoardMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSettingsOpen, isTutorialOpen, isPieceGuideOpen]);

  // Live Piece Workshop Sync: Recalculate valid moves when user modifies piece rules in Codex Workshop
  useEffect(() => {
    const onWorkshopUpdated = () => {
      if (selectedPiece) {
        const refreshedPiece = pieces.find((p) => p.id === selectedPiece.id && p.rpg.hp > 0);
        if (refreshedPiece) {
          setValidMoves(getValidMovesForPiece(refreshedPiece, pieces, boardType, lastMove, playStyle));
        }
      }
    };
    window.addEventListener('piece-workshop-updated', onWorkshopUpdated);
    return () => window.removeEventListener('piece-workshop-updated', onWorkshopUpdated);
  }, [selectedPiece, pieces, boardType, lastMove, playStyle]);

  // Memoized RPG Positional Odds & Tactical Context Hook (Zero cascading setState re-renders on turn transition)
  const { hoverTacticalContext, hoverCombatOdds } = useMemo<{
    hoverTacticalContext: TacticalContext | null;
    hoverCombatOdds: CombatOdds | null;
  }>(() => {
    if (gameMode !== 'rpg') {
      return { hoverTacticalContext: null, hoverCombatOdds: null };
    }

    const activeInspected = hoveredPiece
      ? pieces.find((p) => p.id === hoveredPiece.id && p.rpg.hp > 0) || null
      : selectedPiece
      ? pieces.find((p) => p.id === selectedPiece.id && p.rpg.hp > 0) || null
      : null;

    const activeTarget = hoveredTargetPiece
      ? pieces.find((p) => p.id === hoveredTargetPiece.id && p.rpg.hp > 0) || null
      : null;

    if (!activeInspected) {
      return { hoverTacticalContext: null, hoverCombatOdds: null };
    }

    if (activeTarget && activeInspected.color !== activeTarget.color) {
      return {
        hoverCombatOdds: calculateLiveRPGOdds(activeInspected, activeTarget, pieces, boardType),
        hoverTacticalContext: analyzeTacticalContext(activeTarget, pieces, boardType),
      };
    }

    return {
      hoverCombatOdds: null,
      hoverTacticalContext: analyzeTacticalContext(activeInspected, pieces, boardType),
    };
  }, [gameMode, hoveredPiece, selectedPiece, hoveredTargetPiece, pieces, boardType, playStyle]);

  // ==========================================
  // READY COUNTDOWN & START-OF-MATCH VALIDATION
  // ==========================================
  const handleTriggerReady = useCallback(() => {
    // 1. Prepare and reset match state
    const freshPieces = createInitialPieces(boardType, false, armyDeployment, gameMode);

    // 2. Start-of-Match Validation
    const whiteKing = freshPieces.find((p) => p.color === 'white' && p.type === 'king');
    const blackKing = freshPieces.find((p) => p.color === 'black' && p.type === 'king');
    if (!whiteKing || !blackKing) {
      console.error('Validation failure: Missing king in army deployment.');
      return;
    }

    // Validate tile occupancy uniqueness
    const tileMap = new Set<string>();
    for (const p of freshPieces) {
      const tileKey = `${p.position.x}_${p.position.y}_${!!p.position.isVerticalWall}_${p.position.wallDirection || ''}`;
      if (tileMap.has(tileKey)) {
        console.error('Validation failure: Duplicate starting tile detected', p);
        return;
      }
      tileMap.add(tileKey);
    }

    // Clear any existing countdown timers
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    countdownTimersRef.current = [];

    // Apply clean starting state
    setValidationLastMove(null);
    matchOutcomeRecordedRef.current = false;
    setAutoRematchCountdown(null);
    setPieces(freshPieces);
    setCurrentTurn('white');
    setTurnCount(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setHoverMoves([]);
    setPreviewMove(null);
    setLastMove(null);
    setOngoingDuels([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);
    setMoveHistory([]);
    setPendingPromotionMove(null);
    historyRef.current = [];
    matchMovesRef.current = [];

    // Begin Countdown: 3 -> 2 -> 1 -> BEGIN
    setCountdownStep(3);
    sounds.playSelect();

    countdownTimersRef.current.push(
      setTimeout(() => {
        setCountdownStep(2);
        sounds.playSelect();
      }, 600),
      setTimeout(() => {
        setCountdownStep(1);
        sounds.playSelect();
      }, 1200),
      setTimeout(() => {
        setCountdownStep('BEGIN');
        sounds.playVictory();
      }, 1800),
      setTimeout(() => {
        setCountdownStep(null);
        setIsMatchActive(true);
      }, 2350)
    );
  }, [boardType, armyDeployment, gameMode]);

  // Stop / End Game: Completely ends the game and resets the board back to pre-game standby
  const handleStopEndGame = useCallback(() => {
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    countdownTimersRef.current = [];
    setCountdownStep(null);
    setIsMatchLocked(false);
    setIsReadyBannerDismissed(false);
    setAiTeachingThought(null);
    setActiveTacticalLine(null);
    setIsActionOccluded(false);
    restartMatch(false);
    sounds.playClick();
  }, [restartMatch]);

  // Handle Reset Trigger
  const handleTriggerResetConfirm = useCallback(() => {
    handleStopEndGame();
  }, [handleStopEndGame]);

  // Confirm Reset Modal Action
  const handleConfirmReset = useCallback(() => {
    setShowResetModal(false);
    setIsMatchLocked(false);
    restartMatch(false);
    sounds.playClick();
  }, [restartMatch]);

  // Cancel Reset Modal Action
  const handleCancelReset = useCallback(() => {
    setShowResetModal(false);
  }, []);

  // Handle Board Type Switch (Always unlocked and immediately deploys pieces on the selected board)
  const handleSelectBoardType = useCallback((type: BoardType) => {
    if (countdownStep !== null) return;
    setBoardType(type);
    setDetectedBeacons([]);
    const freshPieces = createInitialPieces(type, false, armyDeployment, gameMode);
    setPieces(freshPieces);
    setCurrentTurn('white');
    setTurnCount(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setHoverMoves([]);
    setPreviewMove(null);
    setLastMove(null);
    setOngoingDuels([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);
    historyRef.current = [];
    matchMovesRef.current = [];
    sounds.playClick();
  }, [countdownStep, armyDeployment, gameMode]);

  // Handle Army Deployment Switch (Always unlocked and immediately deploys selected army)
  const handleSelectArmyDeployment = useCallback((dep: ArmyDeployment) => {
    if (countdownStep !== null) return;
    setArmyDeployment(dep);
    const freshPieces = createInitialPieces(boardType, false, dep, gameMode);
    setPieces(freshPieces);
    setCurrentTurn('white');
    setTurnCount(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setHoverMoves([]);
    setPreviewMove(null);
    setLastMove(null);
    setOngoingDuels([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);
    historyRef.current = [];
    matchMovesRef.current = [];
    sounds.playClick();
  }, [countdownStep, boardType, gameMode]);

  // Handle Game Mode Switch (Standard Chess vs RPG) (Always unlocked; refreshes Grand Pyramid RPG-exclusive pieces)
  const handleSelectGameMode = useCallback((mode: GameMode) => {
    if (countdownStep !== null) return;
    setGameMode(mode);
    setOngoingDuels([]);
    if (boardType === 'pyramid' && !isMatchActive) {
      const freshPieces = createInitialPieces(boardType, false, armyDeployment, mode);
      setPieces(freshPieces);
      setSelectedPiece(null);
      setValidMoves([]);
      setHoverMoves([]);
      setPreviewMove(null);
      setLastMove(null);
    } else if (boardType === 'pyramid' && isMatchActive) {
      // If switching between Standard and RPG on Grand Pyramid, deploy the corresponding Grand Pyramid army
      const freshPieces = createInitialPieces(boardType, false, armyDeployment, mode);
      setPieces(freshPieces);
      setCurrentTurn('white');
      setTurnCount(1);
      setSelectedPiece(null);
      setValidMoves([]);
      setHoverMoves([]);
      setPreviewMove(null);
      setLastMove(null);
      setCapturedWhite([]);
      setCapturedBlack([]);
      setWinner(null);
      historyRef.current = [];
      matchMovesRef.current = [];
    }
    sounds.playClick();
  }, [countdownStep, boardType, isMatchActive, armyDeployment]);

  // Handle Play Style Switch (Open Surface vs Surface Bound Challenge)
  const handleSelectPlayStyle = useCallback((style: PlayStyle) => {
    if (countdownStep !== null) return;
    setActivePlayStyle(style);
    setPlayStyle(style);
    if (selectedPiece) {
      const updatedMoves = getValidMovesForPiece(selectedPiece, pieces, boardType, lastMove, style);
      setValidMoves(updatedMoves);
    }
    setHoverMoves([]);
    setPreviewMove(null);
    sounds.playClick();
  }, [countdownStep, selectedPiece, pieces, boardType, lastMove]);

  // Handle Player Mode Switch (Always unlocked)
  const handleSelectPlayerMode = useCallback((mode: PlayerMode) => {
    if (countdownStep !== null) return;
    setPlayerMode(mode);
    // Rule 24: For AI vs AI spectator mode, 'both' is the recommended default; for Human vs AI, 'opponent'
    setVisibilitySettings((prev) => ({
      ...prev,
      beaconSide:
        prev.beaconSide === 'off'
          ? 'off'
          : mode === 'ai_vs_ai'
          ? 'both'
          : 'opponent',
    }));
    sounds.playClick();
  }, [countdownStep]);

  // Handle Human Color Switch (Always unlocked)
  const handleSelectHumanColor = useCallback((color: PieceColor) => {
    if (countdownStep !== null) return;
    setHumanColor(color);
    sounds.playClick();
  }, [countdownStep]);

  // Handle AI Difficulty Switch (Always unlocked)
  const handleSelectAIDifficulty = useCallback((diff: AIDifficulty) => {
    if (countdownStep !== null) return;
    setAiDifficulty(diff);
    sounds.playClick();
  }, [countdownStep]);

  // Hover Piece & Legal Target Preview (Calculates live positional RPG odds and whole-board relationships via useMemo)
  const handlePieceHover = useCallback(
    (piece: Piece | null, targetPiece?: Piece | null) => {
      if (countdownStep !== null || winner) return;

      if (!piece) {
        setHoveredPiece((prev) => (prev ? null : prev));
        setHoveredTargetPiece((prev) => (prev ? null : prev));
        if (!selectedPiece) {
          setHoverMoves((prev) => (prev.length === 0 ? prev : []));
        }
        return;
      }

      // Deduplicate: skip recalculation if hovering the exact same piece and target
      if (
        hoveredPiece?.id === piece.id &&
        (hoveredTargetPiece?.id || null) === (targetPiece?.id || null)
      ) {
        return;
      }

      // Case 1: Active selection exists and hovering over a legal enemy target
      if (targetPiece && piece.color !== targetPiece.color) {
        setHoveredPiece(piece);
        setHoveredTargetPiece(targetPiece);
        return;
      }

      // Case 2: Inspecting an individual piece (friendly or enemy)
      setHoveredPiece(piece);
      setHoveredTargetPiece(null);

      // Only update movement preview if match is active and this piece belongs to the active side
      if (isMatchActive && !selectedPiece && piece.color === currentTurn) {
        const moves = getValidMovesForPiece(piece, pieces, boardType, lastMove, playStyle);
        setHoverMoves(moves);
      } else if (!selectedPiece) {
        setHoverMoves((prev) => (prev.length === 0 ? prev : []));
      }
    },
    [
      countdownStep,
      winner,
      selectedPiece,
      hoveredPiece,
      hoveredTargetPiece,
      isMatchActive,
      currentTurn,
      pieces,
      boardType,
      lastMove,
      playStyle,
    ]
  );

  // Select Piece (Only allowed when game has been started!)
  const handlePieceSelect = useCallback(
    (piece: Piece) => {
      if (!isMatchActive || countdownStep !== null || winner) return;

      // In AI vs AI mode, human cannot move pieces
      if (playerMode === 'ai_vs_ai') return;

      // In Human vs AI mode, human can only move their own color on their turn
      if (playerMode === 'human_vs_ai') {
        if (currentTurn !== humanColor || piece.color !== humanColor) return;
      }

      // Turn check
      if (piece.color !== currentTurn) return;

      // Locked in duel
      const isLockedInDuel = ongoingDuels.some(
        (d) => d.whitePieceId === piece.id || d.blackPieceId === piece.id
      );
      if (isLockedInDuel) return;

      sounds.playSelect();
      setSelectedPiece(piece);
      setHoverMoves([]);
      // Query authoritative legal move engine
      const moves = getValidMovesForPiece(piece, pieces, boardType, lastMove, playStyle);
      setValidMoves(moves);
    },
    [
      isMatchActive,
      countdownStep,
      winner,
      playerMode,
      currentTurn,
      humanColor,
      ongoingDuels,
      pieces,
      boardType,
      lastMove,
      playStyle,
    ]
  );

  // Execute Legal Move & Snap Piece (Only allowed when game is active!)
  const executeMove = useCallback(
    (
      rawMove: Move,
      bypassPromotionModal: boolean = false,
      rpsChoices?: { attackerRPS: RPSChoice; defenderRPS: RPSChoice }
    ) => {
      if (!isMatchActive || countdownStep !== null) return;

      const piece = pieces.find((p) => p.id === rawMove.pieceId);
      if (!piece) return;

      // Authoritative tile resolution: every move origin and destination MUST reference a valid playable tile
      const authFrom = toAuthoritativePosition(boardType, rawMove.from) || toAuthoritativePosition(boardType, piece.position);
      const authTo = toAuthoritativePosition(boardType, rawMove.to);
      if (!authFrom || !authTo) {
        return;
      }
      const authRookTo = rawMove.rookTo ? toAuthoritativePosition(boardType, rawMove.rookTo) || undefined : undefined;
      const move: Move = {
        ...rawMove,
        from: authFrom,
        to: authTo,
        rookTo: authRookTo,
        tierDelta: authTo.tier - authFrom.tier,
      };

      // Check if human player is promoting a Pawn -> open Pawn Promotion Choice Selector Modal
      const isHumanTurn =
        playerMode === 'human_vs_human' ||
        (playerMode === 'human_vs_ai' && currentTurn === humanColor);

      if (
        piece.type === 'pawn' &&
        move.promotionType &&
        !isSummitTile(boardType, move.to.x, move.to.y) &&
        isHumanTurn &&
        !bypassPromotionModal
      ) {
        setPendingPromotionMove(move);
        return;
      }

      // Check if RPG mode capture is between the SAME PIECE TYPES -> Rock-Paper-Scissors Mirror Clash!
      const preTargetPiece = move.capturedPieceId
        ? pieces.find((p) => p.id === move.capturedPieceId && p.rpg.hp > 0)
        : getPieceAtPosition(pieces, move.to);

      if (
        gameMode === 'rpg' &&
        !move.isBombard &&
        preTargetPiece &&
        preTargetPiece.color !== piece.color &&
        preTargetPiece.type === piece.type &&
        playerMode !== 'ai_vs_ai' &&
        !rpsChoices
      ) {
        setPendingRPSClash({
          move,
          attacker: piece,
          defender: preTargetPiece,
        });
        return;
      }

      // Save to undo history
      historyRef.current.push({
        pieces: JSON.parse(JSON.stringify(pieces)),
        turn: currentTurn,
        duels: JSON.parse(JSON.stringify(ongoingDuels)),
      });

      matchMovesRef.current.push(move);
      setValidationLastMove(move);

      const updatedPieces = pieces.map((p) => ({
        ...p,
        position: { ...p.position },
        rpg: { ...p.rpg },
      }));
      const movingPiece = updatedPieces.find((p) => p.id === piece.id)!;
      const targetPiece =
        (move.capturedPieceId
          ? updatedPieces.find((p) => p.id === move.capturedPieceId && p.rpg.hp > 0)
          : undefined) || getPieceAtPosition(updatedPieces, move.to);

      let rpgRollSummary: string | undefined;

      // Play sound
      if (move.isRookExchange || move.isCastling) {
        sounds.playClimb();
      } else if (move.to.isVerticalWall) {
        sounds.playPerch();
      } else if (move.isVerticalClimb) {
        sounds.playClimb();
      } else if (move.tierDelta < 0) {
        sounds.playPlunge();
      } else {
        sounds.playMove();
      }

      // 0a. Classical Castling (moves both King and Rook)
      if (move.isCastling && move.rookPieceId && move.rookTo) {
        const castleRook = updatedPieces.find((p) => p.id === move.rookPieceId);
        movingPiece.position = { ...move.to };
        movingPiece.hasMoved = true;
        if (castleRook) {
          castleRook.position = { ...move.rookTo };
          castleRook.hasMoved = true;
        }
      } else if (move.isRookExchange && move.exchangePartnerId) {
        // 0b. Vanguard Exclusive Ability: Friendly Rook Positional Exchange
        // Strictly enforce: ONLY a Vanguard can switch, and ONLY with a living Rook of its own team!
        const partnerRook = updatedPieces.find(
          (p) =>
            p.id === move.exchangePartnerId &&
            p.type === 'rook' &&
            p.color === movingPiece.color &&
            p.rpg.hp > 0
        );
        if (movingPiece.type !== 'vanguard' || !partnerRook) {
          return;
        }
        const vanguardOldPos = toAuthoritativePosition(boardType, movingPiece.position) || { ...movingPiece.position };
        const rookOldPos = toAuthoritativePosition(boardType, partnerRook.position) || { ...partnerRook.position };
        movingPiece.position = rookOldPos;
        movingPiece.hasMoved = true;
        partnerRook.position = vanguardOldPos;
        partnerRook.hasMoved = true;
      } else if (move.isBombard && targetPiece && targetPiece.color !== movingPiece.color) {
        // 0c. Trebuchet Bombardment Knockback:
        // Knocks the bombarded enemy piece back 3 tiles onto any random open tile (does NOT capture)!
        sounds.playClash();
        const knockbackPos = findBombardKnockbackPosition(
          targetPiece.position,
          movingPiece.position,
          updatedPieces,
          boardType,
          false
        );
        const authKnockbackPos = knockbackPos ? toAuthoritativePosition(boardType, knockbackPos) : null;
        if (authKnockbackPos) {
          targetPiece.position = { ...authKnockbackPos };
          targetPiece.hasMoved = true;
          const kbCol = String.fromCharCode(65 + authKnockbackPos.x);
          const kbRow = authKnockbackPos.y + 1;
          rpgRollSummary = `☄️ KNOCKBACK 3 TILES → ${kbCol}${kbRow}`;
          setClashingPieces({
            attackerId: movingPiece.id,
            defenderId: targetPiece.id,
            damageText: `☄️ KNOCKBACK → ${kbCol}${kbRow}!`,
            attackerReturned: false,
            fromPos: { ...move.from },
            toPos: { ...authKnockbackPos },
          });
          setTimeout(() => setClashingPieces(null), 1200);
        }
        movingPiece.hasMoved = true;
      } else if (gameMode === 'rpg' && targetPiece && targetPiece.color !== movingPiece.color) {
        // 1. RPG Combat Mode Resolution:
        //    - Same piece types -> Rock-Paper-Scissors (1-of-3)
        //    - Different piece types -> D20 Dice Roll + Positional Stats
        const isSamePieceType = movingPiece.type === targetPiece.type;
        const attackerHpBefore = movingPiece.rpg.hp;
        const attackerMaxHp = movingPiece.rpg.maxHp;
        const defenderHpBefore = targetPiece.rpg.hp;
        const defenderMaxHp = targetPiece.rpg.maxHp;
        const attackerAtk = movingPiece.rpg.atk;
        const attackerDef = movingPiece.rpg.def;
        const defenderAtk = targetPiece.rpg.atk;
        const defenderDef = targetPiece.rpg.def;

        if (!isSamePieceType) {
          sounds.playDiceRoll();
        }

        const combatResult: CombatResult = resolveRPGCombat(movingPiece, targetPiece, {
          attackerRPS: rpsChoices?.attackerRPS,
          defenderRPS: rpsChoices?.defenderRPS,
        });

        const rpsIconMap: Record<RPSChoice, string> = {
          rock: '🪨',
          paper: '📄',
          scissors: '✂️',
        };

        if (combatResult.combatMode === 'rps' && combatResult.attackerRPS && combatResult.defenderRPS) {
          const attSym = rpsIconMap[combatResult.attackerRPS];
          const defSym = rpsIconMap[combatResult.defenderRPS];
          rpgRollSummary =
            combatResult.rpsOutcome === 'attacker_win'
              ? `${attSym}vs${defSym} WIN!`
              : `${attSym}vs${defSym} COUNTERED!`;

          const dmgText =
            combatResult.rpsOutcome === 'attacker_win'
              ? `${attSym} BEATS ${defSym}!`
              : `${defSym} COUNTERS ${attSym}!`;

          setDiceRollVisual({
            roll: 20,
            defenderRoll: 1,
            isAttacker: combatResult.rpsOutcome === 'attacker_win',
            position: { ...move.to },
            rpsText: `${attSym} ⚡ ${defSym}`,
          });

          setClashingPieces({
            attackerId: movingPiece.id,
            defenderId: targetPiece.id,
            damageText: dmgText,
            attackerReturned: false,
            fromPos: { ...move.from },
            toPos: { ...move.to },
          });
          setTimeout(() => setClashingPieces(null), 1200);
        } else {
          const isDiceLoss = combatResult.diceOutcome === 'defender_win';
          rpgRollSummary = combatResult.dodged
            ? `🎲${combatResult.attackerDiceRoll}v${combatResult.defenderDiceRoll} DODGED · SENT BACK`
            : isDiceLoss
            ? `🎲${combatResult.attackerDiceRoll}v${combatResult.defenderDiceRoll} LOST · -${combatResult.counterDamage || 0} HP · SENT BACK`
            : `🎲${combatResult.attackerDiceRoll}v${combatResult.defenderDiceRoll} · -${combatResult.damage} HP${combatResult.crit ? '!' : ''}`;

          setDiceRollVisual({
            roll: combatResult.attackerDiceRoll,
            defenderRoll: combatResult.defenderDiceRoll,
            isAttacker: !isDiceLoss,
            position: { ...move.to },
          });

          const dmgText = combatResult.dodged
            ? 'DODGED! SENT BACK'
            : isDiceLoss
            ? combatResult.attackerReturned
              ? `SENT BACK! -${combatResult.counterDamage || 0} HP`
              : `COUNTERED! -${combatResult.counterDamage || 0} HP`
            : combatResult.crit
            ? `CRIT! -${combatResult.damage}`
            : `-${combatResult.damage} HP`;

          setClashingPieces({
            attackerId: movingPiece.id,
            defenderId: targetPiece.id,
            damageText: dmgText,
            attackerReturned: !!combatResult.attackerReturned,
            fromPos: { ...move.from },
            toPos: { ...move.to },
          });
          setTimeout(() => setClashingPieces(null), 1100);
        }

        // Trigger the top-center animated 3D D20 Dice Roll / RPS Clash Showcase Banner
        const showcaseId = `clash_${Date.now()}_${Math.random()}`;
        setCombatShowcaseEvent({
          id: showcaseId,
          attackerColor: movingPiece.color,
          attackerType: movingPiece.type,
          attackerAtk,
          attackerDef,
          attackerHpBefore,
          attackerMaxHp,
          defenderColor: targetPiece.color,
          defenderType: targetPiece.type,
          defenderAtk,
          defenderDef,
          defenderHpBefore,
          defenderMaxHp,
          combatResult,
        });
        setTimeout(() => {
          setCombatShowcaseEvent((prev) => (prev?.id === showcaseId ? null : prev));
        }, 3100);

        if (combatResult.targetKilled) {
          if (targetPiece.color === 'white') {
            setCapturedWhite((prev) => [...prev, targetPiece]);
          } else {
            setCapturedBlack((prev) => [...prev, targetPiece]);
          }

          if (!move.isBombard) {
            movingPiece.position = { ...move.to };
            movingPiece.hasMoved = true;
          }

          if (targetPiece.type === 'king') {
            setWinner(currentTurn);
            setIsMatchLocked(false);
            sounds.playVictory();
            recordSingleMatchOutcome(currentTurn, 'black');
          }
        } else if (combatResult.attackerKilled) {
          // Defender won and eliminated the Attacker!
          if (movingPiece.color === 'white') {
            setCapturedWhite((prev) => [...prev, movingPiece]);
          } else {
            setCapturedBlack((prev) => [...prev, movingPiece]);
          }

          if (movingPiece.type === 'king') {
            const defVictor: PieceColor = targetPiece.color;
            setWinner(defVictor);
            setIsMatchLocked(false);
            sounds.playVictory();
            recordSingleMatchOutcome(defVictor, 'black');
          }
        } else {
          // Losing a dice roll with HP (or failing to eliminate the defender) sends the attacking piece
          // back to its original tile (move.from) before it attacked!
          movingPiece.position = { ...move.from };
        }
      } else {
        // Prevent any non-exchange move from landing on a friendly piece of the same team
        if (targetPiece && targetPiece.color === movingPiece.color) {
          return;
        }
        // 2. Standard Chess Capture or Move
        if (targetPiece && targetPiece.color !== movingPiece.color) {
          sounds.playClash();
          targetPiece.rpg.hp = 0;
          if (targetPiece.color === 'white') {
            setCapturedWhite((prev) => [...prev, targetPiece]);
          } else {
            setCapturedBlack((prev) => [...prev, targetPiece]);
          }

          if (targetPiece.type === 'king') {
            setWinner(currentTurn);
            setIsMatchLocked(false);
            sounds.playVictory();
            recordMatchOutcome(boardType, armyDeployment, gameMode, currentTurn, 'black', matchMovesRef.current);
          }
        }

        if (!move.isBombard) {
          movingPiece.position = { ...move.to };
          movingPiece.hasMoved = true;
        }
      }

      const attackerAdvancedToDestination =
        movingPiece.rpg.hp > 0 &&
        movingPiece.position.x === move.to.x &&
        movingPiece.position.y === move.to.y &&
        Boolean(movingPiece.position.isVerticalWall) === Boolean(move.to.isVerticalWall);

      // Surface Bound Play Style: 4×4 Summit permanently releases Jump Color Lock for the rest of the match
      const unlockedColorRelease =
        attackerAdvancedToDestination &&
        !movingPiece.colorReleased &&
        !movingPiece.position.isVerticalWall &&
        isSummitTile(boardType, movingPiece.position.x, movingPiece.position.y);
      if (unlockedColorRelease) {
        movingPiece.colorReleased = true;
      }

      // Vanguard 9 -> 1 Irreversible Forward Progression Tracking (do not permanently alter progression state on Summit moves)
      const moveStartedOnSummit =
        !move.from.isVerticalWall && isSummitTile(boardType, move.from.x, move.from.y);
      const moveEndedOnSummit =
        !movingPiece.position.isVerticalWall &&
        isSummitTile(boardType, movingPiece.position.x, movingPiece.position.y);
      if (
        movingPiece.type === 'vanguard' &&
        attackerAdvancedToDestination &&
        !moveStartedOnSummit &&
        !moveEndedOnSummit
      ) {
        const facing = movingPiece.facing || (movingPiece.color === 'white' ? 'north' : 'south');
        const prog =
          facing === 'north'
            ? movingPiece.position.y
            : facing === 'south'
            ? 19 - movingPiece.position.y
            : facing === 'east'
            ? movingPiece.position.x
            : 19 - movingPiece.position.x;
        movingPiece.maxForwardProgress = Math.max(movingPiece.maxForwardProgress ?? 0, prog);
        if (movingPiece.maxForwardProgress >= 9) {
          movingPiece.hasCrossedCenter = true;
        }
      }

      // Ascendant Elevation & Advancement RPG Progression (Ascending makes the Ascendant more tactically useful)
      if (
        movingPiece.type === 'ascendant' &&
        attackerAdvancedToDestination &&
        move.tierDelta > 0 &&
        gameMode === 'rpg'
      ) {
        movingPiece.rpg = {
          ...movingPiece.rpg,
          atk: movingPiece.rpg.atk + 2 * move.tierDelta,
          def: movingPiece.rpg.def + 2 * move.tierDelta,
          hp: Math.min(movingPiece.rpg.maxHp, movingPiece.rpg.hp + 8 * move.tierDelta),
        };
      }

      // Pawn Promotion (Opposite Back Rank Only — Pawns never promote or transform merely by reaching the 4x4 Summit!)
      if (
        movingPiece.type === 'pawn' &&
        move.promotionType &&
        attackerAdvancedToDestination &&
        !isSummitTile(boardType, movingPiece.position.x, movingPiece.position.y)
      ) {
        movingPiece.type = move.promotionType;
        movingPiece.rpg = {
          ...getDefaultRPGStats(move.promotionType),
          level: movingPiece.rpg.level,
          kills: movingPiece.rpg.kills,
        };
        sounds.playCrit();
      }

      // Build Algebraic + 3D Notation Entry for Move History Log
      const pieceAbbrevMap: Record<string, string> = {
        pawn: 'P',
        knight: 'N',
        bishop: 'B',
        rook: 'R',
        queen: 'Q',
        king: 'K',
        vanguard: 'V',
        gargoyle: 'G',
        ascendant: 'A',
        trebuchet: 'T',
      };
      const fileChar = (col: number) => String.fromCharCode(97 + col);
      const fromCoord = `${fileChar(move.from.x)}${move.from.y + 1}`;
      const toCoord = `${fileChar(move.to.x)}${move.to.y + 1}`;
      const pSym = pieceAbbrevMap[piece.type] || 'P';

      let notation = `${pSym} ${fromCoord}${move.isCapture ? '×' : '→'}${toCoord}`;
      if (move.isCastling) {
        notation = move.castlingSide === 'kingside' ? 'O-O' : 'O-O-O';
      } else if (move.isRookExchange) {
        notation = `V⇄R (${fromCoord}⇄${toCoord})`;
      } else if (move.isBombard) {
        notation = `T☄${toCoord}`;
      }

      const tags: string[] = [];
      if (move.isRookExchange) tags.push('V⇄R');
      if (move.isBombard) tags.push('☄Bombard');
      if (move.isCastling) tags.push(move.castlingSide === 'kingside' ? 'O-O' : 'O-O-O');
      if (move.isEnPassant) tags.push('e.p.');
      if (move.to.isVerticalWall) tags.push('Wall');
      else if (move.tierDelta !== 0) {
        tags.push(`T${move.from.tier ?? 0}→T${move.to.tier ?? 0}`);
      }
      if (
        unlockedColorRelease &&
        (movingPiece.type === 'knight' || movingPiece.type === 'gargoyle')
      ) {
        tags.push('4×4 Color Release');
      }
      if (move.promotionType) {
        tags.push(`=${pieceAbbrevMap[move.promotionType] || 'Q'}`);
      }

      setMoveHistory((prev) => [
        ...prev,
        {
          turnNumber: turnCount,
          color: currentTurn,
          pieceType: piece.type,
          move,
          notation,
          tags,
          rpgRollSummary,
        },
      ]);

      // Process Ongoing Duels before committing updatedPieces to state so array reference stays immutable
      if (gameMode === 'rpg' && ongoingDuels.length > 0) {
        const remainingDuels: OngoingDuel[] = [];
        ongoingDuels.forEach((duel) => {
          const res = processDuelRound(duel, updatedPieces);
          if (res.resolved) {
            const loser = updatedPieces.find(
              (p) => (p.id === duel.whitePieceId || p.id === duel.blackPieceId) && p.id !== res.winnerPieceId
            );
            if (loser) {
              if (loser.color === 'white') setCapturedWhite((prev) => [...prev, loser]);
              else setCapturedBlack((prev) => [...prev, loser]);
              if (loser.type === 'king') {
                const vict: PieceColor = res.winnerPieceId?.startsWith('white') ? 'white' : 'black';
                setWinner(vict);
                setIsMatchLocked(false);
                sounds.playVictory();
                recordSingleMatchOutcome(vict, 'black');
              }
            }
          } else {
            remainingDuels.push(res.duel);
          }
        });
        setOngoingDuels(remainingDuels);
      }

      const normalizedUpdatedPieces = normalizePiecesToBoard(boardType, updatedPieces);
      setPieces(normalizedUpdatedPieces);
      setLastMove(move);
      setFocusPieceId(move.pieceId);
      setPreviewMove(null);
      setSelectedPiece(null);
      setValidMoves([]);
      setHoverMoves([]);

      // Last One Standing Win Check: if either army has 0 surviving pieces (or its King is eliminated), the last side standing wins!
      const oppColorCheck: PieceColor = currentTurn === 'white' ? 'black' : 'white';
      const remainingEnemyPieces = normalizedUpdatedPieces.filter((p) => p.color === oppColorCheck && p.rpg.hp > 0);
      const remainingFriendlyPieces = normalizedUpdatedPieces.filter((p) => p.color === currentTurn && p.rpg.hp > 0);
      if (remainingEnemyPieces.length === 0 || !remainingEnemyPieces.some((p) => p.type === 'king')) {
        setWinner(currentTurn);
        setIsMatchLocked(false);
        sounds.playVictory();
        recordSingleMatchOutcome(currentTurn, 'black');
        return;
      } else if (remainingFriendlyPieces.length === 0 || !remainingFriendlyPieces.some((p) => p.type === 'king')) {
        setWinner(oppColorCheck);
        setIsMatchLocked(false);
        sounds.playVictory();
        recordSingleMatchOutcome(oppColorCheck, 'black');
        return;
      }

      // Switch turn
      const nextTurn: PieceColor = currentTurn === 'white' ? 'black' : 'white';
      setCurrentTurn(nextTurn);
      setTurnCount((prev) => prev + 1);
      sounds.playTurnChange();
    },
    [
      isMatchActive,
      pieces,
      currentTurn,
      turnCount,
      playerMode,
      humanColor,
      gameMode,
      ongoingDuels,
      countdownStep,
      boardType,
      armyDeployment,
      recordSingleMatchOutcome,
    ]
  );

  // Jump / Rewind to any clicked Move in the Move History Log
  const handleJumpToTurn = useCallback((index: number) => {
    if (countdownStep !== null || index < 0 || index >= historyRef.current.length) return;
    const targetSnapshot = historyRef.current[index];
    if (!targetSnapshot) return;

    historyRef.current = historyRef.current.slice(0, index);
    matchMovesRef.current = matchMovesRef.current.slice(0, index);
    const prevMove = matchMovesRef.current[matchMovesRef.current.length - 1] || null;
    setValidationLastMove(prevMove);

    setPieces(normalizePiecesToBoard(boardType, targetSnapshot.pieces));
    setCurrentTurn(targetSnapshot.turn);
    setTurnCount(index + 1);
    setOngoingDuels(targetSnapshot.duels);
    setMoveHistory((prev) => prev.slice(0, index));
    setSelectedPiece(null);
    setValidMoves([]);
    setHoverMoves([]);
    setPreviewMove(null);
    setLastMove(prevMove);
    setWinner(null);
    sounds.playClick();
  }, [countdownStep, boardType]);

  // Load an Interactive Drill Scenario from TutorialModal directly onto the 3D board
  const handleLoadScenario = useCallback((scenario: InteractiveDrillScenario) => {
    countdownTimersRef.current.forEach((t) => clearTimeout(t));
    countdownTimersRef.current = [];
    setCountdownStep(null);
    setValidationLastMove(null);
    setBoardType(scenario.boardType);
    setGameMode(scenario.gameMode);
    if (scenario.playStyle) {
      setActivePlayStyle(scenario.playStyle);
      setPlayStyle(scenario.playStyle);
    }
    setPlayerMode('human_vs_ai');
    setHumanColor('white');
    setPieces(normalizePiecesToBoard(scenario.boardType, JSON.parse(JSON.stringify(scenario.pieces))));
    setCurrentTurn('white');
    setTurnCount(1);
    setSelectedPiece(null);
    setValidMoves([]);
    setHoverMoves([]);
    setPreviewMove(null);
    setLastMove(null);
    setOngoingDuels([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);
    setMoveHistory([]);
    setPendingPromotionMove(null);
    historyRef.current = [];
    matchMovesRef.current = [];
    setIsMatchActive(true);
    setIsStartMenuOpen(false);
    setIsReadyBannerDismissed(true);
    sounds.playVictory();
  }, []);

  // Handle Tile Click: Move Piece or Select Piece (Only allowed when game is active!)
  const handleTileClick = useCallback(
    (x: number, y: number, isVerticalWall?: boolean, wallDirection?: string) => {
      if (!isMatchActive || countdownStep !== null || winner) return;

      // In AI vs AI mode, user clicking cannot move pieces
      if (playerMode === 'ai_vs_ai') return;

      // In Human vs AI mode, user can only move on their turn
      if (playerMode === 'human_vs_ai' && currentTurn !== humanColor) return;

      if (selectedPiece) {
        // Find matching move from authoritative valid moves
        const matchMove = validMoves.find((m) => {
          if (m.to.x !== x || m.to.y !== y) return false;
          if (m.isRookExchange) {
            if (selectedPiece.type !== 'vanguard' || !m.exchangePartnerId) return false;
            const partner = pieces.find((p) => p.id === m.exchangePartnerId && p.rpg.hp > 0);
            if (!partner || partner.type !== 'rook' || partner.color !== selectedPiece.color) {
              return false;
            }
          }
          if (isVerticalWall !== undefined) {
            if (isVerticalWall) {
              return !!m.to.isVerticalWall && (!wallDirection || m.to.wallDirection === wallDirection);
            }
            return !m.to.isVerticalWall;
          }
          return true;
        });

        if (matchMove) {
          executeMove(matchMove);
          return;
        }
      }

      // Check if player clicked their own piece
      const piece = pieces.find(
        (p) =>
          p.position.x === x &&
          p.position.y === y &&
          p.rpg.hp > 0 &&
          (isVerticalWall
            ? !!p.position.isVerticalWall &&
              (!wallDirection || p.position.wallDirection === wallDirection)
            : !p.position.isVerticalWall)
      );

      if (piece && piece.color === currentTurn) {
        handlePieceSelect(piece);
      } else {
        setSelectedPiece(null);
        setValidMoves([]);
        setHoverMoves([]);
      }
    },
    [
      isMatchActive,
      countdownStep,
      winner,
      playerMode,
      currentTurn,
      humanColor,
      selectedPiece,
      validMoves,
      pieces,
      executeMove,
      handlePieceSelect,
    ]
  );

  // Undo Move (Allowed when unlocked or in human play)
  const handleUndoMove = useCallback(() => {
    if (countdownStep !== null || historyRef.current.length === 0) return;
    const last = historyRef.current.pop();
    if (last) {
      setPieces(normalizePiecesToBoard(boardType, last.pieces));
      setCurrentTurn(last.turn);
      setTurnCount((prev) => Math.max(1, prev - 1));
      setOngoingDuels(last.duels);
      setSelectedPiece(null);
      setValidMoves([]);
      setHoverMoves([]);
      setPreviewMove(null);
      setWinner(null);
      matchMovesRef.current.pop();
      setMoveHistory((prev) => prev.slice(0, -1));
      const prevMove = matchMovesRef.current[matchMovesRef.current.length - 1] || null;
      setValidationLastMove(prevMove);
      setLastMove(prevMove);
      sounds.playClick();
    }
  }, [countdownStep]);

  // ==========================================
  // AI TURN EXECUTION & VISUAL TEACHING SEQUENCE
  // ==========================================
  useEffect(() => {
    if (
      !isMatchActive ||
      isStartMenuOpen ||
      winner ||
      countdownStep !== null ||
      pendingRPSClash ||
      pendingPromotionMove
    ) {
      setAiTeachingThought(null);
      setActiveTacticalLine(null);
      return;
    }

    // Check if current turn is AI controlled
    const isAiTurn =
      playerMode === 'ai_vs_ai' ||
      (playerMode === 'human_vs_ai' && currentTurn !== humanColor);

    if (!isAiTurn) {
      setAiTeachingThought(null);
      setActiveTacticalLine(null);
      setFocusPieceId(null);
      return;
    }

    if (isAiSimulationPaused) return;

    // Calibrated pacing for educational Chess Teaching visualization
    const speedMult = 1 / aiSimulationSpeed;
    const step1Delay = 400 * speedMult;
    const step2Delay = 950 * speedMult;
    const step3Delay = 1500 * speedMult;
    const executeDelay = 2300 * speedMult;

    const timeoutIds: NodeJS.Timeout[] = [];

    // Defer AI search slightly off frame 0 so the previous move's 3D glide & D20/RPS showcase animate at 60fps
    timeoutIds.push(
      setTimeout(() => {
        const aiMove = findBestMoveAI(
          pieces,
          currentTurn,
          boardType,
          gameMode,
          aiDifficulty,
          armyDeployment,
          matchMovesRef.current
        );

        if (!aiMove) {
          // No legal moves -> checkmate or stalemate
          const opponent: PieceColor = currentTurn === 'white' ? 'black' : 'white';
          if (inCheck) {
            setWinner(opponent);
            setIsMatchLocked(false);
            sounds.playVictory();
            recordSingleMatchOutcome(opponent, currentTurn);
          } else {
            setWinner('draw');
            setIsMatchLocked(false);
            recordSingleMatchOutcome('draw', currentTurn);
          }
          return;
        }

        const mover = pieces.find((p) => p.id === aiMove.pieceId);
        if (!mover) return;

        // Generate educational structured teaching thought & log AI Playbook maneuver
        const thought = generateAITeachingThought(aiMove, pieces, boardType, gameMode, turnCount);

        // Step 1: Active Piece Highlight & Candidates preview
        setSelectedPiece(mover);
        const moves = getValidMovesForPiece(mover, pieces, boardType);
        setValidMoves(moves);
        setAiTeachingThought({ ...thought, step: 'evaluating' });
        sounds.playSelect();
        setFocusPieceId(mover.id);

        // Step 2 & 3: Tactical Target Line (AI Piece -> Target)
        timeoutIds.push(
          setTimeout(() => {
            setActiveTacticalLine({
              from: aiMove.from,
              to: aiMove.to,
              isProminent: false,
              color: aiMove.isCapture ? 0xf43f5e : 0x38bdf8,
            });
            setAiTeachingThought({ ...thought, step: 'targeting' });
            setIsActionOccluded(aiMove.to.tier > 0 || !!aiMove.to.isVerticalWall);
          }, step2Delay - step1Delay)
        );

        // Step 4: Chosen Action with Prominent Line & Teaching Rationale
        timeoutIds.push(
          setTimeout(() => {
            setActiveTacticalLine({
              from: aiMove.from,
              to: aiMove.to,
              isProminent: true,
              color: aiMove.isCapture ? 0xf43f5e : 0xfbbf24,
            });
            setAiTeachingThought({ ...thought, step: 'chosen' });
          }, step3Delay - step1Delay)
        );

        // Step 5: Execute the Move
        timeoutIds.push(
          setTimeout(() => {
            executeMove(aiMove);
            setActiveTacticalLine(null);
            setIsActionOccluded(false);
          }, executeDelay - step1Delay)
        );
      }, step1Delay)
    );

    return () => {
      timeoutIds.forEach((t) => clearTimeout(t));
    };
  }, [
    isMatchActive,
    isStartMenuOpen,
    currentTurn,
    playerMode,
    humanColor,
    winner,
    countdownStep,
    pieces,
    boardType,
    gameMode,
    playStyle,
    aiDifficulty,
    armyDeployment,
    inCheck,
    isAiSimulationPaused,
    aiSimulationSpeed,
    pendingRPSClash,
    pendingPromotionMove,
    executeMove,
  ]);

  // Handle Manual Step Forward in AI vs AI Simulation
  const handleStepForwardAI = useCallback(() => {
    const isAiTurn =
      playerMode === 'ai_vs_ai' ||
      (playerMode === 'human_vs_ai' && currentTurn !== humanColor);
    if (!isAiTurn || !isMatchActive || winner) return;

    const aiMove = findBestMoveAI(
      pieces,
      currentTurn,
      boardType,
      gameMode,
      aiDifficulty,
      armyDeployment,
      matchMovesRef.current
    );
    if (aiMove) {
      executeMove(aiMove);
      setActiveTacticalLine(null);
      setIsActionOccluded(false);
    }
  }, [
    playerMode,
    currentTurn,
    humanColor,
    isMatchActive,
    winner,
    pieces,
    boardType,
    gameMode,
    aiDifficulty,
    armyDeployment,
    executeMove,
  ]);

  // Memoized HUD, Beacon & Teacher Panel Callbacks
  const handleSelectCameraPreset = useCallback((preset: string) => {
    setCameraPreset(preset);
    setCameraPresetTrigger((prev) => prev + 1);
  }, []);

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleOpenTutorial = useCallback(() => setIsTutorialOpen(true), []);
  const handleCloseTutorial = useCallback(() => setIsTutorialOpen(false), []);
  const handleOpenPieceGuide = useCallback(() => setIsPieceGuideOpen(true), []);
  const handleClosePieceGuide = useCallback(() => setIsPieceGuideOpen(false), []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sounds.enabled = next;
      return next;
    });
  }, []);

  const handleToggleHighlightVerticalTiles = useCallback(() => {
    setHighlightVerticalTiles((prev) => !prev);
  }, []);

  const handleToggleCleanBoardMode = useCallback(() => {
    setIsCleanBoardMode((prev) => !prev);
  }, []);

  const handleUpdateVisibilitySettings = useCallback(
    (updates: Partial<VisibilitySettings>) => {
      setVisibilitySettings((prev) => ({ ...prev, ...updates }));
      if (updates.focusCameraOnActiveMove) {
        const activeId = selectedPiece?.id || lastMove?.pieceId || null;
        if (activeId) {
          setFocusPieceId(activeId);
        }
      }
    },
    [selectedPiece, lastMove]
  );

  const handleFocusPiece = useCallback((pieceId: string) => {
    setFocusPieceId(pieceId);
    setManualFocusTrigger((prev) => prev + 1);
  }, []);

  const handleSelectDuelTile = useCallback(
    (x: number, y: number) => {
      handleTileClick(x, y);
    },
    [handleTileClick]
  );

  const handleToggleAiPause = useCallback(() => {
    setIsAiSimulationPaused((prev) => !prev);
  }, []);

  const handleToggleAutoRematch = useCallback(() => {
    setAutoRematch((prev) => !prev);
  }, []);

  const handleCloseTeacherPanel = useCallback(() => {
    setIsTeacherPanelOpen(false);
  }, []);

  const handleToggleTeacherPanel = useCallback(() => {
    setIsTeacherPanelOpen((prev) => !prev);
  }, []);

  const handleLaunchMatchFromStartMenu = useCallback(() => {
    setIsStartMenuOpen(false);
    handleTriggerReady();
  }, [handleTriggerReady]);

  const handleResumeMatchFromStartMenu = useCallback(() => {
    setIsStartMenuOpen(false);
  }, []);

  const handleOpenStartMenu = useCallback(() => {
    setIsStartMenuOpen(true);
  }, []);

  const boardLabel =
    boardType === 'quick_pyramid'
      ? '12×12 Quick Pyramid'
      : boardType === 'pyramid'
      ? '20×20 Grand Pyramid'
      : boardType === 'battlefield'
      ? '20×20 Battlefield'
      : '8×8 Classic';

  const armyLabel =
    armyDeployment === 'kingdom' ? 'Kingdom Army (24/side)' : 'Standard Army (16/side)';

  const combatLabel = gameMode === 'rpg' ? 'RPG Battle Chess' : 'Standard Chess';
  const playStyleLabel = playStyle === 'surface_bound' ? 'Surface Bound' : 'Open Surface';

  const playerModeLabel =
    playerMode === 'human_vs_human'
      ? 'Human vs Human'
      : playerMode === 'ai_vs_ai'
      ? 'AI vs AI Simulation'
      : `Human (${humanColor === 'white' ? 'White' : 'Black'}) vs AI`;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none flex flex-row">
      {/* 3D Playable Board Column: Expands to fill available space, never underneath Teacher HUD */}
      <div className="relative flex-1 h-full min-w-0 overflow-hidden flex flex-col">
        {/* The 3D Canvas Viewport */}
        <div className="relative w-full h-full flex-1 min-h-0 overflow-hidden">
          <ThreeCanvas
            boardType={boardType}
            gameMode={gameMode}
            playerMode={playerMode}
            pieces={pieces}
            selectedPiece={selectedPiece}
            validMoves={validMoves}
            hoverMoves={hoverMoves}
            previewMove={previewMove}
            lastMove={lastMove}
            inCheck={inCheck}
            currentTurn={currentTurn}
            onTileClick={handleTileClick}
            onPieceSelect={handlePieceSelect}
            onPieceHover={handlePieceHover}
            onMoveExecute={executeMove}
            clashingPieces={clashingPieces}
            diceRollVisual={diceRollVisual}
            cameraPreset={cameraPreset}
            cameraPresetTrigger={cameraPresetTrigger}
            highlightVerticalTiles={highlightVerticalTiles}
            tacticalLine={activeTacticalLine}
            visibilitySettings={visibilitySettings}
            onBeaconsUpdate={setDetectedBeacons}
            focusPieceId={focusPieceId}
            manualFocusTrigger={manualFocusTrigger}
            isActionOccluded={isActionOccluded}
            activePlayerSide={
              !isMatchActive
                ? null
                : playerMode === 'human_vs_ai'
                ? currentTurn === humanColor
                  ? humanColor
                  : null
                : playerMode === 'human_vs_human'
                ? currentTurn
                : null
            }
          />

          {/* Floating Tactical HUD Header & Controls (arranged neatly around the board perimeter) */}
          <HUD
            boardType={boardType}
            armyDeployment={armyDeployment}
            gameMode={gameMode}
            playStyle={playStyle}
            currentTurn={currentTurn}
            turnCount={turnCount}
            inCheck={inCheck}
            winner={winner}
            capturedWhite={capturedWhite}
            capturedBlack={capturedBlack}
            pieces={pieces}
            onFocusPiece={handleFocusPiece}
            cameraPreset={cameraPreset}
            isMatchActive={isMatchActive}
            isMatchLocked={false}
            playerMode={playerMode}
            humanColor={humanColor}
            onSelectBoardType={handleSelectBoardType}
            onSelectArmyDeployment={handleSelectArmyDeployment}
            onSelectGameMode={handleSelectGameMode}
            onSelectPlayStyle={handleSelectPlayStyle}
            onSelectPlayerMode={handleSelectPlayerMode}
            onSelectCameraPreset={handleSelectCameraPreset}
            onOpenStartMenu={handleOpenStartMenu}
            onOpenSettings={handleOpenSettings}
            onOpenTutorial={handleOpenTutorial}
            onOpenPieceGuide={handleOpenPieceGuide}
            onRestartGame={restartMatch}
            onStopEndGame={handleStopEndGame}
            onTriggerResetConfirm={handleTriggerResetConfirm}
            onTriggerReady={handleTriggerReady}
            onUndoMove={handleUndoMove}
            canUndo={historyRef.current.length > 0}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            vsAI={playerMode !== 'human_vs_human'}
            highlightVerticalTiles={highlightVerticalTiles}
            onToggleHighlightVerticalTiles={handleToggleHighlightVerticalTiles}
            isCleanBoardMode={isCleanBoardMode}
            onToggleCleanBoardMode={handleToggleCleanBoardMode}
            visibilitySettings={visibilitySettings}
            onUpdateVisibilitySettings={handleUpdateVisibilitySettings}
            autoRematch={autoRematch}
            onToggleAutoRematch={handleToggleAutoRematch}
            autoRematchCountdown={autoRematchCountdown}
          />

          {/* Clickable 3D Algebraic Move History Drawer (Top-Left below minimized header when not in Clean Board Mode) */}
          {!isCleanBoardMode && (
            <div className="absolute top-11 left-3 md:left-4 z-20 flex flex-col gap-2 pointer-events-none">
              <MoveHistoryDrawer
                entries={moveHistory}
                onPreviewMove={setPreviewMove}
                onJumpToTurn={handleJumpToTurn}
              />
            </div>
          )}

          {/* Pre-Game / Game Ended Floating Banner: Game ONLY begins when player clicks New Game & Start (Closable so it never blocks other options) */}
          {!isMatchActive && !isStartMenuOpen && !winner && countdownStep === null && !isReadyBannerDismissed && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/95 border border-amber-500/60 shadow-2xl backdrop-blur-md text-white pointer-events-auto">
              <div className="text-xs">
                <div className="font-black text-amber-400 uppercase tracking-wider">
                  Ready for New Game
                </div>
                <div className="text-[11px] text-slate-300">
                  {boardLabel} · {armyLabel} · {combatLabel} · {playStyleLabel} · {playerModeLabel}
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-black uppercase tracking-wide transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Game</span>
              </button>
              <button
                onClick={handleTriggerReady}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wide shadow-md shadow-amber-500/30 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
              <button
                onClick={() => setIsReadyBannerDismissed(true)}
                title="Close Ready for New Game banner"
                aria-label="Close Ready for New Game banner"
                className="p-1.5 ml-0.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 3D Pyramid Visibility Beacons Overlay (Quick Pyramid & Grand Pyramid Obscured Piece Flags) */}
          <PieceBeaconsOverlay
            beacons={detectedBeacons}
            boardType={boardType}
            enabled={visibilitySettings.hiddenPieceBeacons}
            beaconSide={visibilitySettings.beaconSide}
            playerMode={playerMode}
            humanColor={humanColor}
            currentTurn={currentTurn}
            onFocusPiece={handleFocusPiece}
          />

          {/* Teacher Panel Expand Toggle (Visible on board edge when panel is collapsed) */}
          {!isTeacherPanelOpen && (
            <button
              onClick={() => setIsTeacherPanelOpen(true)}
              className="absolute top-16 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-slate-800 transition-all shadow-xl text-xs font-bold"
              title="Open AI Chess Teacher Side Panel"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>AI Teacher</span>
            </button>
          )}

          {/* Cinematic Ready Countdown Overlay: 3 -> 2 -> 1 -> BEGIN */}
          <ReadyCountdown
            countdownStep={countdownStep}
            boardName={boardLabel}
            armyName={armyLabel}
            combatName={combatLabel}
            playerModeName={playerModeLabel}
          />

          {/* Live D20 Dice Roll & Rock-Paper-Scissors Clash Animation Showcase */}
          <CombatAnimationShowcase event={combatShowcaseEvent} />

          {/* Live Contested Duels Panel (RPG Mode) */}
          {gameMode === 'rpg' && !isCleanBoardMode && (
            <div className="absolute top-28 left-4 md:left-6 z-20 pointer-events-auto">
              <OngoingDuelsPanel
                duels={ongoingDuels}
                pieces={pieces}
                onSelectDuelTile={handleSelectDuelTile}
              />
            </div>
          )}

          {/* Live RPG Tactical Hover Card: Real-time Positional Stats, Dice Odds & Whole-board Modifiers */}
          {gameMode === 'rpg' && !isCleanBoardMode && (hoveredPiece || hoveredTargetPiece || selectedPiece) && (
            <div className="absolute bottom-16 right-4 md:right-6 z-30 pointer-events-none">
              <RPGHoverCard
                hoveredPiece={hoveredPiece || selectedPiece}
                targetPiece={hoveredTargetPiece}
                tacticalContext={hoverTacticalContext}
                combatOdds={hoverCombatOdds}
                isAttackerHover={!!selectedPiece}
                playStyle={playStyle}
                boardType={boardType}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dedicated AI Chess Teacher Side Panel: Sits completely outside canvas viewport! */}
      {isTeacherPanelOpen && !isCleanBoardMode && !isStartMenuOpen && (
        <aside className="w-80 xl:w-96 h-full flex-shrink-0 z-30 relative bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          <AITeachingCard
            thought={aiTeachingThought}
            currentTurn={currentTurn}
            boardType={boardType}
            armyDeployment={armyDeployment}
            gameMode={gameMode}
            playStyle={playStyle}
            onSelectPlayStyle={handleSelectPlayStyle}
            playerMode={playerMode}
            isPaused={isAiSimulationPaused}
            simulationSpeed={aiSimulationSpeed}
            onTogglePause={handleToggleAiPause}
            onStepForward={handleStepForwardAI}
            onChangeSpeed={setAiSimulationSpeed}
            autoRematch={autoRematch}
            onToggleAutoRematch={handleToggleAutoRematch}
            onClose={handleCloseTeacherPanel}
            pieces={pieces}
            recentMoves={matchMovesRef.current}
            onHoverCandidateMove={setPreviewMove}
            onFocusPiece={handleFocusPiece}
          />
        </aside>
      )}

      {/* Game Start Menu (Full-Featured Command Deck before entering the match) */}
      <GameStartMenu
        isOpen={isStartMenuOpen}
        hasActiveMatch={isMatchActive && !winner}
        boardType={boardType}
        armyDeployment={armyDeployment}
        gameMode={gameMode}
        playStyle={playStyle}
        playerMode={playerMode}
        humanColor={humanColor}
        aiDifficulty={aiDifficulty}
        autoRematch={autoRematch}
        cameraPreset={cameraPreset}
        soundEnabled={soundEnabled}
        isTeacherPanelOpen={isTeacherPanelOpen}
        visibilitySettings={visibilitySettings}
        onSelectBoardType={handleSelectBoardType}
        onSelectArmyDeployment={handleSelectArmyDeployment}
        onSelectGameMode={handleSelectGameMode}
        onSelectPlayStyle={handleSelectPlayStyle}
        onSelectPlayerMode={handleSelectPlayerMode}
        onSelectHumanColor={handleSelectHumanColor}
        onSelectAIDifficulty={handleSelectAIDifficulty}
        onToggleAutoRematch={handleToggleAutoRematch}
        onSelectCameraPreset={handleSelectCameraPreset}
        onToggleSound={handleToggleSound}
        onToggleTeacherPanel={handleToggleTeacherPanel}
        onUpdateVisibilitySettings={handleUpdateVisibilitySettings}
        onLaunchMatch={handleLaunchMatchFromStartMenu}
        onResumeMatch={handleResumeMatchFromStartMenu}
        onOpenPieceGuide={handleOpenPieceGuide}
        onOpenTutorial={handleOpenTutorial}
        onLoadScenario={handleLoadScenario}
      />

      {/* Reset Confirmation Dialog */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  End Current Match?
                </h3>
                <p className="text-xs text-slate-400">
                  Return to Game Setup and unlock configuration
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              Are you sure you want to end the active match on <strong>{boardLabel}</strong>? The current board state, active RPG duels, and checkmate progress will be cleared, and settings will unlock.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={handleCancelReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Keep Playing
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md shadow-rose-600/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Game Setup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Streamlined 4 Pillars + Start + 3D Visibility) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        isMatchActive={isMatchActive}
        isMatchLocked={isMatchLocked}
        onTriggerResetConfirm={handleTriggerResetConfirm}
        boardType={boardType}
        onSelectBoardType={handleSelectBoardType}
        armyDeployment={armyDeployment}
        onSelectArmyDeployment={handleSelectArmyDeployment}
        gameMode={gameMode}
        onSelectGameMode={handleSelectGameMode}
        playStyle={playStyle}
        onSelectPlayStyle={handleSelectPlayStyle}
        playerMode={playerMode}
        onSelectPlayerMode={handleSelectPlayerMode}
        humanColor={humanColor}
        onSelectHumanColor={handleSelectHumanColor}
        aiDifficulty={aiDifficulty}
        onSelectAIDifficulty={handleSelectAIDifficulty}
        visibilitySettings={visibilitySettings}
        onUpdateVisibilitySettings={handleUpdateVisibilitySettings}
        soundEnabled={soundEnabled}
        onToggleSound={setSoundEnabled}
        autoRematch={autoRematch}
        onToggleAutoRematch={handleToggleAutoRematch}
        onTriggerReady={handleTriggerReady}
      />

      {/* Rules, Tutorial & Interactive Practice Drills Modal */}
      {isTutorialOpen && (
        <TutorialModal
          onClose={() => setIsTutorialOpen(false)}
          onOpenPieceGuide={() => {
            setIsTutorialOpen(false);
            setIsPieceGuideOpen(true);
          }}
          onLoadScenario={handleLoadScenario}
          playStyle={playStyle}
          onSelectPlayStyle={handleSelectPlayStyle}
        />
      )}

      {/* Pawn Promotion Choice Selector Modal */}
      {pendingPromotionMove && (
        <PawnPromotionModal
          color={currentTurn}
          boardType={boardType}
          onSelectPromotion={(chosenType: PieceType) => {
            const promotedMove: Move = {
              ...pendingPromotionMove,
              promotionType: chosenType,
            };
            setPendingPromotionMove(null);
            executeMove(promotedMove, true);
          }}
          onCancel={() => setPendingPromotionMove(null)}
        />
      )}

      {/* Rock-Paper-Scissors Mirror Clash Modal (Same Piece Types in RPG Mode) */}
      {pendingRPSClash && (
        <RockPaperScissorsModal
          attacker={pendingRPSClash.attacker}
          defender={pendingRPSClash.defender}
          playerMode={playerMode}
          humanColor={humanColor}
          onResolveRPS={(attackerRPS, defenderRPS) => {
            const clashMove = pendingRPSClash.move;
            setPendingRPSClash(null);
            executeMove(clashMove, true, { attackerRPS, defenderRPS });
          }}
          onCancel={
            playerMode === 'human_vs_human' || pendingRPSClash.attacker.color === humanColor
              ? () => setPendingRPSClash(null)
              : undefined
          }
        />
      )}

      {/* Piece Codex & Battlefield Guide Modal */}
      {isPieceGuideOpen && (
        <PieceGuideModal
          onClose={() => setIsPieceGuideOpen(false)}
          playStyle={playStyle}
          onSelectPlayStyle={handleSelectPlayStyle}
          pieces={pieces}
          boardType={boardType}
        />
      )}
    </div>
  );
}
