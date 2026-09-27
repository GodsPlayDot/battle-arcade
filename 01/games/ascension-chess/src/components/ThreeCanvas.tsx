import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import {
  BoardType,
  GameMode,
  Move,
  Piece,
  PieceBeaconInfo,
  PieceColor,
  PieceType,
  PlayerMode,
  Position,
  VisibilitySettings,
} from '../types/chess';
import {
  BOARD_SIZES,
  getAscendantProfile,
  getTileTier,
  getVanguardMovementProfile,
  getVerticalCliffTiles,
  isSummitTile,
  isValleyTile,
  resolvePlayableTile,
  TIER_HEIGHTS,
  toAuthoritativePosition,
} from '../logic/pyramidBoard';

interface ThreeCanvasProps {
  boardType: BoardType;
  gameMode: GameMode;
  playerMode?: PlayerMode;
  pieces: Piece[];
  selectedPiece: Piece | null;
  validMoves: Move[];
  hoverMoves?: Move[];
  previewMove?: Move | null;
  lastMove?: Move | null;
  inCheck?: boolean;
  currentTurn: PieceColor;
  onTileClick: (x: number, y: number, isVerticalWall?: boolean, wallDirection?: string) => void;
  onPieceSelect: (piece: Piece) => void;
  onPieceHover?: (piece: Piece | null, targetPiece?: Piece | null) => void;
  onMoveExecute: (move: Move) => void;
  clashingPieces?: {
    attackerId: string;
    defenderId: string;
    damageText?: string;
    attackerReturned?: boolean;
    fromPos?: Position;
    toPos?: Position;
  } | null;
  diceRollVisual?: {
    roll: number;
    defenderRoll?: number;
    isAttacker: boolean;
    position?: Position;
    rpsText?: string;
  } | null;
  cameraPreset?: string;
  cameraPresetTrigger?: number;
  highlightVerticalTiles?: boolean;
  tacticalLine?: { from: Position; to: Position; color?: number; isProminent?: boolean } | null;
  visibilitySettings?: VisibilitySettings;
  onBeaconsUpdate?: (beacons: PieceBeaconInfo[]) => void;
  focusPieceId?: string | null;
  manualFocusTrigger?: number;
  isActionOccluded?: boolean;
  activePlayerSide?: PieceColor | null;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = React.memo(({
  boardType,
  gameMode,
  playerMode = 'ai_vs_ai',
  pieces,
  selectedPiece,
  validMoves,
  hoverMoves = [],
  previewMove,
  lastMove = null,
  inCheck = false,
  currentTurn,
  onTileClick,
  onPieceSelect,
  onPieceHover,
  onMoveExecute,
  clashingPieces,
  diceRollVisual,
  cameraPreset = 'isometric',
  cameraPresetTrigger = 0,
  highlightVerticalTiles = true,
  tacticalLine = null,
  visibilitySettings,
  onBeaconsUpdate,
  focusPieceId = null,
  manualFocusTrigger = 0,
  isActionOccluded = false,
  activePlayerSide = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Interactive interaction states
  const pieceMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const tileMeshesRef = useRef<THREE.Mesh[]>([]);
  const boardDecorMeshesRef = useRef<THREE.Object3D[]>([]);
  const lightsRef = useRef<{
    hemi?: THREE.HemisphereLight;
    stadium?: THREE.DirectionalLight;
    southFill?: THREE.DirectionalLight;
    northFill?: THREE.DirectionalLight;
    eastFill?: THREE.DirectionalLight;
    westFill?: THREE.DirectionalLight;
    interior?: THREE.PointLight;
  }>({});
  const indicatorGroupRef = useRef<THREE.Group | null>(null);
  const lastMoveGroupRef = useRef<THREE.Group | null>(null);
  const tacticalLineGroupRef = useRef<THREE.Group | null>(null);
  const trajectoryArcRef = useRef<THREE.Line | null>(null);
  const ghostMeshRef = useRef<THREE.Group | null>(null);
  const diceMeshRef = useRef<THREE.Mesh | null>(null);
  const floatingTextsRef = useRef<{ id: string; sprite: THREE.Sprite; velocityY: number; life: number }[]>([]);
  const projectilesRef = useRef<
    {
      mesh: THREE.Group;
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      startTime: number;
      duration: number;
      arcHeight: number;
    }[]
  >([]);
  const onBeaconsUpdateRef = useRef(onBeaconsUpdate);
  onBeaconsUpdateRef.current = onBeaconsUpdate;
  const lastBeaconsSignatureRef = useRef<string>('');
  const lastHoverRaycastTimeRef = useRef<number>(0);
  const lastHoveredKeyRef = useRef<string>('none:none');
  const lastCamUpdateTimeRef = useRef<number>(0);

  // Smooth 60fps Parabolic 3D Piece Movement Interpolation State
  const animatingPiecesRef = useRef<
    Map<
      string,
      {
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        startQuat: THREE.Quaternion;
        endQuat: THREE.Quaternion;
        startTime: number;
        duration: number;
        arcHeight: number;
        isKnightLeap: boolean;
      }
    >
  >(new Map());

  // Drag-and-drop state
  const isDraggingRef = useRef(false);
  const draggedPieceRef = useRef<Piece | null>(null);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Orbit rotation controls: elevated perspective + On-Side Vertical Wall support
  const isRotatingRef = useRef(false);
  const previousPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraDistanceRef = useRef(
    boardType === 'classic' ? 18 : boardType === 'quick_pyramid' ? 24 : 36
  );
  const cameraThetaRef = useRef(Math.PI * 1.0); // Facing from White's rank towards Black's rank
  const cameraPhiRef = useRef(Math.PI * 0.32);   // Elevated perspective
  const cameraRollRef = useRef<number>(0);      // 0 = upright, Math.PI * 0.5 = 90° on its side looking down on vertical wall
  const cameraTargetYRef = useRef<number>(0.8);
  const cameraAnimIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [verticalWallSide, setVerticalWallSide] = useState<'south' | 'east' | 'north' | 'west'>('south');
  const [isCameraOnSideRoll, setIsCameraOnSideRoll] = useState<boolean>(true);
  const [hoveredDestMove, setHoveredDestMove] = useState<Move | null>(null);
  const lastHoveredDestKeyRef = useRef<string>('none');

  const stopActiveCameraAnimation = useCallback(() => {
    if (cameraAnimIntervalRef.current) {
      clearInterval(cameraAnimIntervalRef.current);
      cameraAnimIntervalRef.current = null;
    }
  }, []);

  const boardSize = BOARD_SIZES[boardType];
  const halfBoard = (boardSize - 1) / 2;
  const spacing = 1.35;
  const isNightMode = Boolean(visibilitySettings?.nightMode ?? true);

  // Convert board tile (x, y) or vertical wall to 3D world position (strictly anchored to authoritative playable tiles)
  const getTileWorldPosition = useCallback((
    x: number,
    y: number,
    tier?: number,
    isVerticalWall?: boolean,
    wallDirection?: string,
    wallTierStep?: number
  ): THREE.Vector3 => {
    const authTile = resolvePlayableTile(boardType, {
      x,
      y,
      tier: tier ?? getTileTier(boardType, x, y),
      isVerticalWall: Boolean(isVerticalWall),
      wallDirection: isVerticalWall
        ? (wallDirection as 'north' | 'south' | 'east' | 'west' | undefined)
        : undefined,
      wallTierStep: isVerticalWall ? wallTierStep : undefined,
    });

    const wx = (x - halfBoard) * spacing;
    const wz = (y - halfBoard) * spacing;

    if (authTile?.isVerticalWall || isVerticalWall) {
      const step = authTile?.wallTierStep ?? wallTierStep ?? 1;
      const dir = authTile?.wallDirection ?? wallDirection;
      const lowerH = TIER_HEIGHTS[step - 1] || 0;
      const upperH = TIER_HEIGHTS[step] || 1.25;
      const midY = (lowerH + upperH) / 2;
      const halfTile = 1.25 / 2; // 0.625
      const wallThickness = 0.16;
      const dist = halfTile + wallThickness + 0.08;

      let posX = wx;
      let posZ = wz;
      if (dir === 'south') posZ = wz - dist;
      else if (dir === 'north') posZ = wz + dist;
      else if (dir === 'west') posX = wx - dist;
      else if (dir === 'east') posX = wx + dist;

      return new THREE.Vector3(posX, midY, posZ);
    }

    const t = authTile ? authTile.tier : getTileTier(boardType, x, y);
    const height = TIER_HEIGHTS[t] || 0;
    return new THREE.Vector3(wx, height + 0.16, wz);
  }, [boardSize, halfBoard, spacing, boardType]);

  // Helper to create stylized chess piece geometries (adapts to Night Mode for low glare & long-distance contrast)
  const createPieceGeometry = useCallback((type: PieceType, color: PieceColor): THREE.Group => {
    const group = new THREE.Group();
    // Slightly larger scale in Night Mode so piece silhouettes are unmistakable from across the room
    if (isNightMode) {
      group.scale.set(1.28, 1.36, 1.28);
    } else {
      group.scale.set(1.22, 1.3, 1.22);
    }
    const isWhite = color === 'white';

    // Night Mode uses eye-safe Warm Ivory/Champagne for White (no harsh pure-white glare)
    // and Deep Obsidian with Luminous Cyan-Teal undertone for Black so both stand out against dark matte tiles
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: isNightMode
        ? isWhite
          ? 0xfde68a
          : 0x0f172a
        : isWhite
        ? 0xffffff
        : 0x1e1b4b,
      emissive: isNightMode
        ? isWhite
          ? 0x92400e
          : 0x0e7490
        : isWhite
        ? 0x78350f
        : 0x312e81,
      emissiveIntensity: isNightMode ? (isWhite ? 0.32 : 0.52) : isWhite ? 0.22 : 0.42,
      metalness: isNightMode ? (isWhite ? 0.12 : 0.28) : isWhite ? 0.15 : 0.4,
      roughness: isNightMode ? (isWhite ? 0.42 : 0.34) : isWhite ? 0.18 : 0.22,
    });

    const goldTrimMaterial = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xfbbf24 : isNightMode ? 0x22d3ee : 0x38bdf8,
      metalness: isNightMode ? 0.65 : 0.85,
      roughness: isNightMode ? 0.28 : 0.15,
      emissive: isWhite ? 0xd97706 : isNightMode ? 0x0891b2 : 0x0284c7,
      emissiveIntensity: isNightMode ? 0.72 : 0.65,
    });

    // Base pedestal
    const baseGeo = new THREE.CylinderGeometry(0.44, 0.5, 0.18, 28);
    const baseMesh = new THREE.Mesh(baseGeo, baseMaterial);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Luminous halo aura ring on piece pedestal so pieces pop out distinctly against tiles at every zoom level
    // Wider in Night Mode (0.62 outer radius) so White (Warm Gold) vs Black (Ice Cyan) is effortless to read from far away
    const auraGeo = new THREE.RingGeometry(0.32, isNightMode ? 0.62 : 0.55, 28);
    const auraMat = new THREE.MeshBasicMaterial({
      color: isWhite ? (isNightMode ? 0xfbbf24 : 0xfef08a) : isNightMode ? 0x22d3ee : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isNightMode ? 0.96 : 0.92,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.rotation.x = Math.PI / 2;
    auraMesh.position.y = -0.06;
    group.add(auraMesh);

    const ringGeo = new THREE.TorusGeometry(0.38, 0.04, 12, 24);
    const ringMesh = new THREE.Mesh(ringGeo, goldTrimMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.08;
    group.add(ringMesh);

    // Forward Directional Chevron on pedestal top bevel
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(0, 0.32);
    chevronShape.lineTo(0.12, 0.12);
    chevronShape.lineTo(0.05, 0.16);
    chevronShape.lineTo(0, 0.22);
    chevronShape.lineTo(-0.05, 0.16);
    chevronShape.lineTo(-0.12, 0.12);
    chevronShape.closePath();

    const chevronGeo = new THREE.ShapeGeometry(chevronShape);
    const chevronMat = new THREE.MeshStandardMaterial({
      color: isWhite ? 0xf59e0b : 0xc084fc,
      metalness: 0.85,
      roughness: 0.2,
      emissive: isWhite ? 0xb45309 : 0x7e22ce,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
    chevronMesh.rotation.x = -Math.PI / 2;
    chevronMesh.position.y = 0.085;
    group.add(chevronMesh);

    switch (type) {
      case 'pawn': {
        const bodyGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.55, 20);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.35;
        body.castShadow = true;
        group.add(body);

        const crestGeo = new THREE.SphereGeometry(0.08, 12, 12);
        crestGeo.scale(1, 1.35, 0.5);
        const crest = new THREE.Mesh(crestGeo, goldTrimMaterial);
        crest.position.set(0, 0.42, 0.19);
        group.add(crest);

        const collarGeo = new THREE.TorusGeometry(0.24, 0.035, 12, 24);
        const collar = new THREE.Mesh(collarGeo, baseMaterial);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.62;
        group.add(collar);

        const headGeo = new THREE.SphereGeometry(0.22, 20, 20);
        const head = new THREE.Mesh(headGeo, baseMaterial);
        head.position.y = 0.82;
        head.castShadow = true;
        group.add(head);
        break;
      }

      case 'knight': {
        const bodyGeo = new THREE.CylinderGeometry(0.22, 0.34, 0.52, 20);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.34;
        body.castShadow = true;
        group.add(body);

        const neckGeo = new THREE.BoxGeometry(0.22, 0.46, 0.36);
        const neck = new THREE.Mesh(neckGeo, baseMaterial);
        neck.position.set(0, 0.65, 0.04);
        neck.rotation.x = -0.22;
        neck.castShadow = true;
        group.add(neck);

        // Sculpted Warhorse Mane Ridge
        const maneGeo = new THREE.BoxGeometry(0.08, 0.44, 0.14);
        const mane = new THREE.Mesh(maneGeo, goldTrimMaterial);
        mane.position.set(0, 0.69, -0.14);
        mane.rotation.x = -0.22;
        group.add(mane);

        const muzzleGeo = new THREE.BoxGeometry(0.2, 0.22, 0.34);
        const muzzle = new THREE.Mesh(muzzleGeo, baseMaterial);
        muzzle.position.set(0, 0.73, 0.22);
        muzzle.rotation.x = 0.32;
        group.add(muzzle);

        const earGeo = new THREE.ConeGeometry(0.06, 0.18, 10);
        const earL = new THREE.Mesh(earGeo, goldTrimMaterial);
        earL.position.set(0.07, 0.95, -0.02);
        earL.rotation.x = -0.2;
        group.add(earL);

        const earR = new THREE.Mesh(earGeo, goldTrimMaterial);
        earR.position.set(-0.07, 0.95, -0.02);
        earR.rotation.x = -0.2;
        group.add(earR);
        break;
      }

      case 'bishop': {
        const bodyGeo = new THREE.CylinderGeometry(0.18, 0.35, 0.7, 24);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.42;
        body.castShadow = true;
        group.add(body);

        const miterGeo = new THREE.SphereGeometry(0.26, 20, 20);
        miterGeo.scale(0.85, 1.45, 0.85);
        const miter = new THREE.Mesh(miterGeo, baseMaterial);
        miter.position.y = 0.95;
        miter.castShadow = true;
        group.add(miter);

        // Mitre Sash Ring
        const sashGeo = new THREE.TorusGeometry(0.21, 0.028, 12, 24);
        const sash = new THREE.Mesh(sashGeo, goldTrimMaterial);
        sash.rotation.x = Math.PI / 2.6;
        sash.position.y = 0.96;
        group.add(sash);

        const finialGeo = new THREE.SphereGeometry(0.075, 14, 14);
        const finial = new THREE.Mesh(finialGeo, goldTrimMaterial);
        finial.position.y = 1.34;
        group.add(finial);
        break;
      }

      case 'rook': {
        const bodyGeo = new THREE.CylinderGeometry(0.26, 0.36, 0.75, 24);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.45;
        body.castShadow = true;
        group.add(body);

        const parapetGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 24);
        const parapet = new THREE.Mesh(parapetGeo, baseMaterial);
        parapet.position.y = 0.92;
        parapet.castShadow = true;
        group.add(parapet);

        const crenelMat = goldTrimMaterial;
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI * 2) / 6;
          const cGeo = new THREE.BoxGeometry(0.11, 0.13, 0.11);
          const cren = new THREE.Mesh(cGeo, crenelMat);
          cren.position.set(Math.cos(ang) * 0.3, 1.09, Math.sin(ang) * 0.3);
          cren.rotation.y = -ang;
          group.add(cren);
        }
        break;
      }

      case 'queen':
      case 'solar_queen': {
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.38, 0.95, 24);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        const crownBaseGeo = new THREE.CylinderGeometry(0.38, 0.22, 0.3, 24);
        const crownBase = new THREE.Mesh(crownBaseGeo, baseMaterial);
        crownBase.position.y = 1.12;
        group.add(crownBase);

        const coronetGeo = new THREE.TorusGeometry(0.36, 0.04, 12, 24);
        const coronet = new THREE.Mesh(coronetGeo, goldTrimMaterial);
        coronet.rotation.x = Math.PI / 2;
        coronet.position.y = 1.25;
        group.add(coronet);

        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI * 2) / 8;
          const pGeo = new THREE.SphereGeometry(0.045, 12, 12);
          const pMesh = new THREE.Mesh(pGeo, goldTrimMaterial);
          pMesh.position.set(Math.cos(ang) * 0.36, 1.32, Math.sin(ang) * 0.36);
          group.add(pMesh);
        }

        const jewelGeo = new THREE.SphereGeometry(0.095, 16, 16);
        const jewel = new THREE.Mesh(jewelGeo, goldTrimMaterial);
        jewel.position.y = 1.35;
        group.add(jewel);
        break;
      }

      case 'king': {
        const bodyGeo = new THREE.CylinderGeometry(0.24, 0.4, 1.05, 24);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        const archGeo = new THREE.CylinderGeometry(0.4, 0.24, 0.32, 24);
        const arch = new THREE.Mesh(archGeo, baseMaterial);
        arch.position.y = 1.22;
        group.add(arch);

        const circletGeo = new THREE.TorusGeometry(0.38, 0.045, 12, 24);
        const circlet = new THREE.Mesh(circletGeo, goldTrimMaterial);
        circlet.rotation.x = Math.PI / 2;
        circlet.position.y = 1.36;
        group.add(circlet);

        // Cross finial
        const crossVGeo = new THREE.BoxGeometry(0.075, 0.34, 0.075);
        const crossV = new THREE.Mesh(crossVGeo, goldTrimMaterial);
        crossV.position.y = 1.59;
        group.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.24, 0.075, 0.075);
        const crossH = new THREE.Mesh(crossHGeo, goldTrimMaterial);
        crossH.position.y = 1.63;
        group.add(crossH);
        break;
      }

      case 'vanguard': {
        // Grand Pyramid 20x20 Exclusive Piece: Swept Spearhead Lancer & Rook-Exchange Beacon
        const bodyGeo = new THREE.CylinderGeometry(0.19, 0.35, 0.68, 24);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.42;
        body.castShadow = true;
        group.add(body);

        // Twin Forward-Swept Heraldic Wings / Shields
        const wingGeo = new THREE.BoxGeometry(0.52, 0.44, 0.08);
        const wingL = new THREE.Mesh(wingGeo, goldTrimMaterial);
        wingL.position.set(0.18, 0.62, 0.05);
        wingL.rotation.y = -0.35;
        wingL.rotation.z = 0.25;
        group.add(wingL);

        const wingR = new THREE.Mesh(wingGeo, goldTrimMaterial);
        wingR.position.set(-0.18, 0.62, 0.05);
        wingR.rotation.y = 0.35;
        wingR.rotation.z = -0.25;
        group.add(wingR);

        // Rook-Exchange Crown Collar Ring
        const collarGeo = new THREE.TorusGeometry(0.28, 0.038, 12, 24);
        const collar = new THREE.Mesh(collarGeo, goldTrimMaterial);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.82;
        group.add(collar);

        // Forward-Tilted Spearhead Spire
        const spearGeo = new THREE.ConeGeometry(0.21, 0.52, 4);
        const spear = new THREE.Mesh(spearGeo, baseMaterial);
        spear.position.set(0, 1.06, 0.06);
        spear.rotation.y = Math.PI / 4;
        spear.rotation.x = 0.22;
        spear.castShadow = true;
        group.add(spear);

        // Luminous Apex Gem
        const apexGeo = new THREE.OctahedronGeometry(0.1);
        const apex = new THREE.Mesh(apexGeo, goldTrimMaterial);
        apex.position.set(0, 1.32, 0.12);
        group.add(apex);
        break;
      }

      case 'gargoyle': {
        // Winged Stone Bulwark Sentinel
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.62, 18), baseMaterial);
        body.position.y = 0.39;
        body.castShadow = true;
        group.add(body);

        const wingGeo = new THREE.BoxGeometry(0.62, 0.38, 0.06);
        const wingL = new THREE.Mesh(wingGeo, goldTrimMaterial);
        wingL.position.set(0.24, 0.72, -0.05);
        wingL.rotation.z = 0.48;
        wingL.rotation.y = -0.25;
        group.add(wingL);

        const wingR = new THREE.Mesh(wingGeo, goldTrimMaterial);
        wingR.position.set(-0.24, 0.72, -0.05);
        wingR.rotation.z = -0.48;
        wingR.rotation.y = 0.25;
        group.add(wingR);

        const head = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 12), baseMaterial);
        head.position.set(0, 0.88, 0.08);
        head.rotation.x = 0.35;
        group.add(head);

        // Horned Gargoyle Crest
        const hornGeo = new THREE.ConeGeometry(0.05, 0.22, 8);
        const hornL = new THREE.Mesh(hornGeo, goldTrimMaterial);
        hornL.position.set(0.09, 1.04, 0.02);
        hornL.rotation.z = -0.35;
        group.add(hornL);

        const hornR = new THREE.Mesh(hornGeo, goldTrimMaterial);
        hornR.position.set(-0.09, 1.04, 0.02);
        hornR.rotation.z = 0.35;
        group.add(hornR);
        break;
      }

      case 'ascendant': {
        // Stepped Ziggurat Spire with Radiant Octahedron Apex
        const step1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.28, 8), baseMaterial);
        step1.position.y = 0.24;
        step1.castShadow = true;
        group.add(step1);

        const step2 = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.29, 0.28, 8), baseMaterial);
        step2.position.y = 0.52;
        step2.castShadow = true;
        group.add(step2);

        const step3 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.28, 8), baseMaterial);
        step3.position.y = 0.8;
        step3.castShadow = true;
        group.add(step3);

        const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 10, 20), goldTrimMaterial);
        haloRing.rotation.x = Math.PI / 2;
        haloRing.position.y = 0.96;
        group.add(haloRing);

        const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.21), goldTrimMaterial);
        spire.position.y = 1.2;
        group.add(spire);
        break;
      }

      case 'trebuchet': {
        // Counterweight Siege Engine with A-Frame Truss & Glowing Bombard Orb
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.36), baseMaterial);
        frameL.position.set(0.16, 0.42, 0);
        frameL.castShadow = true;
        group.add(frameL);

        const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.36), baseMaterial);
        frameR.position.set(-0.16, 0.42, 0);
        frameR.castShadow = true;
        group.add(frameR);

        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.44, 12), goldTrimMaterial);
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, 0.68, 0);
        group.add(axle);

        // Pivoted Throwing Arm Beam
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.82), goldTrimMaterial);
        arm.position.set(0, 0.78, 0.04);
        arm.rotation.x = -0.45;
        group.add(arm);

        // Counterweight Box
        const weightBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), baseMaterial);
        weightBox.position.set(0, 0.54, -0.26);
        group.add(weightBox);

        // Blazing Siege Boulder Payload
        const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), goldTrimMaterial);
        boulder.position.set(0, 0.98, 0.36);
        group.add(boulder);
        break;
      }

      default: {
        const bodyGeo = new THREE.CylinderGeometry(0.22, 0.36, 0.82, 20);
        const body = new THREE.Mesh(bodyGeo, baseMaterial);
        body.position.y = 0.48;
        body.castShadow = true;
        group.add(body);

        const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), goldTrimMaterial);
        spire.position.y = 1.05;
        group.add(spire);
        break;
      }
    }

    return group;
  }, [isNightMode]);

  // Helper to create a Night Mode Long-Distance Piece Emblem Sprite so piece types are readable from across the room
  const createNightDistanceEmblemSprite = useCallback((type: PieceType, color: PieceColor): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 96, 96);

    const isWhite = color === 'white';
    // Soft low-glare dark medallion with high-contrast Warm Gold (White) or Ice Cyan (Black) rim
    ctx.fillStyle = isWhite ? 'rgba(24, 18, 11, 0.88)' : 'rgba(8, 20, 38, 0.90)';
    ctx.strokeStyle = isWhite ? '#fbbf24' : '#22d3ee';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(48, 48, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const symbolMap: Record<PieceType, string> = {
      king: '♚',
      queen: '♛',
      solar_queen: '♛',
      rook: '♜',
      bishop: '♝',
      knight: '♞',
      pawn: '♟',
      vanguard: '⛨',
      gargoyle: '翼',
      trebuchet: '⊕',
      ascendant: '✦',
      archon_templar: '⚔',
      chrono_mage: '✧',
      titan_golem: '❖',
    };

    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = isWhite ? '#fde68a' : '#67e8f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbolMap[type] || '♟', 48, 51);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.name = 'nightDistanceEmblem';
    sprite.scale.set(0.56, 0.56, 1);
    const topY =
      type === 'king'
        ? 1.98
        : type === 'queen' || type === 'bishop' || type === 'vanguard'
        ? 1.72
        : 1.48;
    sprite.position.set(0, topY, 0);
    return sprite;
  }, []);

  // Helper to create RPG health bar billboard
  const createHealthBarGroup = useCallback((piece: Piece): THREE.Group => {
    const hbGroup = new THREE.Group();
    hbGroup.name = 'healthBar';
    hbGroup.position.set(0, 1.65, 0);

    const bgMat = new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide });
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.14), bgMat);
    hbGroup.add(bgMesh);

    const ratio = Math.max(0, Math.min(1, piece.rpg.hp / piece.rpg.maxHp));
    const hpColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
    const hpMat = new THREE.MeshBasicMaterial({ color: hpColor, side: THREE.DoubleSide });
    const hpGeo = new THREE.PlaneGeometry(0.81 * ratio, 0.1);
    const hpMesh = new THREE.Mesh(hpGeo, hpMat);
    hpMesh.position.set(-0.405 * (1 - ratio), 0, 0.01);
    hbGroup.add(hpMesh);

    return hbGroup;
  }, []);

  // Helper to create Vanguard 9 -> 1 Speed Range Floating 3D Badge
  const createVanguardBadgeSprite = useCallback((maxTiles: number): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pill background
    ctx.fillStyle = maxTiles === 1 ? 'rgba(15, 23, 42, 0.92)' : 'rgba(6, 78, 59, 0.92)';
    ctx.strokeStyle = maxTiles === 1 ? '#f59e0b' : '#34d399';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, 148, 52, 18);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = maxTiles === 1 ? '#fcd34d' : '#6ee7b7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚡${maxTiles} TILE${maxTiles === 1 ? '' : 'S'}`, 80, 33);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.name = 'vanguardRangeBadge';
    sprite.scale.set(0.82, 0.33, 1);
    sprite.position.set(0, gameMode === 'rpg' ? 1.98 : 1.65, 0);
    return sprite;
  }, [gameMode]);

  // Helper to create Ascendant Stage I / II / III Tiered Aura Ring Group
  const createAscendantAuraGroup = useCallback((piece: Piece): THREE.Group => {
    const auraGroup = new THREE.Group();
    auraGroup.name = 'ascendantStageAura';
    const profile = getAscendantProfile(piece, boardSize);
    const stage = profile.maxStride; // 2 = Stage I, 3 = Stage II, 4 = Stage III

    const primaryColor = stage >= 4 ? 0xfbbf24 : stage === 3 ? 0x10b981 : 0x38bdf8;
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.50, 28),
      new THREE.MeshBasicMaterial({
        color: primaryColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    );
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.025;
    auraGroup.add(ring1);

    if (stage >= 3) {
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(0.53, 0.60, 28),
        new THREE.MeshBasicMaterial({
          color: stage >= 4 ? 0xa855f7 : 0xfbbf24,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
      );
      ring2.rotation.x = -Math.PI / 2;
      ring2.position.y = 0.035;
      auraGroup.add(ring2);
    }

    if (stage >= 4) {
      const apexHalo = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.31, 24),
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      apexHalo.rotation.x = -Math.PI / 2;
      apexHalo.position.y = 1.42;
      auraGroup.add(apexHalo);
    }

    return auraGroup;
  }, [boardSize]);

  // Unified spherical camera position updater (works in all camera views, zoom levels & 90° on-side vertical wall roll)
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const dist = Math.max(6, Math.min(95, cameraDistanceRef.current));
    const phi = Math.max(0.03, Math.min(Math.PI * 0.49, cameraPhiRef.current));
    const theta = cameraThetaRef.current;
    const targetY = cameraTargetYRef.current;

    const x = dist * Math.sin(phi) * Math.sin(theta);
    const y = dist * Math.cos(phi);
    const z = dist * Math.sin(phi) * Math.cos(theta);

    camera.position.set(x, y, z);

    const roll = cameraRollRef.current;
    if (Math.abs(roll) > 0.001) {
      const forward = new THREE.Vector3(0 - x, targetY - y, 0 - z).normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, worldUp);
      if (right.lengthSq() < 0.0001) {
        right.set(1, 0, 0);
      } else {
        right.normalize();
      }
      const orthoUp = new THREE.Vector3().crossVectors(right, forward).normalize();
      const rolledUp = new THREE.Vector3()
        .addScaledVector(orthoUp, Math.cos(roll))
        .addScaledVector(right, Math.sin(roll))
        .normalize();
      camera.up.copy(rolledUp);
    } else {
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(0, targetY, 0);
    camera.updateMatrixWorld();
  }, []);

  // Setup Three.js scene & renderer (strictly once on mount so scene is never destroyed on view change)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Crisp dark slate-celestial background with ZERO distance fog so zoomed-out views stay 100% bright & readable
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2500);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

      // 1. Balanced Hemisphere Sky-Ground Ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.95);
    scene.add(hemiLight);

    // 2. Broad Overhead Stadium Floodlight (Even illumination with no dark corners)
    const stadiumLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
    stadiumLight.position.set(0, 48, 0);
    stadiumLight.castShadow = true;
    stadiumLight.shadow.mapSize.width = 2048;
    stadiumLight.shadow.mapSize.height = 2048;
    stadiumLight.shadow.camera.near = 0.5;
    stadiumLight.shadow.camera.far = 100;
    const d = 34;
    stadiumLight.shadow.camera.left = -d;
    stadiumLight.shadow.camera.right = d;
    stadiumLight.shadow.camera.top = d;
    stadiumLight.shadow.camera.bottom = -d;
    stadiumLight.shadow.bias = -0.0005;
    scene.add(stadiumLight);

    // 3. Four Directional Cross-Flank Stadium Fill Lights (South, North, East, West)
    const southFill = new THREE.DirectionalLight(0xfef3c7, 0.75); // White territory & South cliff walls
    southFill.position.set(0, 24, -32);
    scene.add(southFill);

    const northFill = new THREE.DirectionalLight(0xe0e7ff, 0.75); // Black territory & North cliff walls
    northFill.position.set(0, 24, 32);
    scene.add(northFill);

    const eastFill = new THREE.DirectionalLight(0xf8fafc, 0.65); // East vertical walls & slopes
    eastFill.position.set(32, 22, 0);
    scene.add(eastFill);

    const westFill = new THREE.DirectionalLight(0xf8fafc, 0.65); // West vertical walls & slopes
    westFill.position.set(-32, 22, 0);
    scene.add(westFill);

    // 4. Hollow Pyramid Interior Illumination Light (Crystal architectural glass glow)
    const interiorLight = new THREE.PointLight(0xa5f3fc, 1.25, 45, 1.2);
    interiorLight.position.set(0, 2.2, 0);
    scene.add(interiorLight);

    lightsRef.current = {
      hemi: hemiLight,
      stadium: stadiumLight,
      southFill,
      northFill,
      eastFill,
      westFill,
      interior: interiorLight,
    };

    // Indicator, last move & tactical groups
    const indGroup = new THREE.Group();
    scene.add(indGroup);
    indicatorGroupRef.current = indGroup;

    const lmGroup = new THREE.Group();
    scene.add(lmGroup);
    lastMoveGroupRef.current = lmGroup;

    const tacGroup = new THREE.Group();
    scene.add(tacGroup);
    tacticalLineGroupRef.current = tacGroup;

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Keyboard Arrow Keys for Camera Orbit (respects 90° On-Side Vertical Wall roll)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        stopActiveCameraAnimation();
        const roll = cameraRollRef.current;
        let screenDx = 0;
        let screenDy = 0;
        if (e.key === 'ArrowUp') screenDy = 1;
        else if (e.key === 'ArrowDown') screenDy = -1;
        else if (e.key === 'ArrowLeft') screenDx = -1;
        else if (e.key === 'ArrowRight') screenDx = 1;

        const dTheta = screenDx * Math.cos(roll) - screenDy * Math.sin(roll);
        const dPhi = screenDx * Math.sin(roll) + screenDy * Math.cos(roll);

        cameraThetaRef.current -= dTheta * 0.12;
        cameraPhiRef.current = Math.max(0.08, Math.min(Math.PI * 0.49, cameraPhiRef.current - dPhi * 0.08));
        updateCameraPosition();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (cameraRef.current && rendererRef.current) {
        const now = performance.now();

        // 1. Smooth 60fps Parabolic Piece Movement Interpolation
        if (animatingPiecesRef.current.size > 0) {
          animatingPiecesRef.current.forEach((anim, pieceId) => {
            const group = pieceMeshesRef.current.get(pieceId);
            if (!group) {
              animatingPiecesRef.current.delete(pieceId);
              return;
            }

            const rawT = Math.min(1, (now - anim.startTime) / anim.duration);
            // Smooth cubic ease-out
            const t = 1 - Math.pow(1 - rawT, 3);
            const oneMinusT = 1 - t;

            // Parabolic Bezier curve: Start -> Elevated Midpoint -> End
            const mid = new THREE.Vector3().lerpVectors(anim.startPos, anim.endPos, 0.5);
            mid.y = Math.max(anim.startPos.y, anim.endPos.y) + anim.arcHeight;

            const x =
              oneMinusT * oneMinusT * anim.startPos.x +
              2 * oneMinusT * t * mid.x +
              t * t * anim.endPos.x;
            const y =
              oneMinusT * oneMinusT * anim.startPos.y +
              2 * oneMinusT * t * mid.y +
              t * t * anim.endPos.y;
            const z =
              oneMinusT * oneMinusT * anim.startPos.z +
              2 * oneMinusT * t * mid.z +
              t * t * anim.endPos.z;

            group.position.set(x, y, z);
            group.quaternion.slerpQuaternions(anim.startQuat, anim.endQuat, t);

            // Subtle vaulting tilt during Knight/Gargoyle leaps
            if (anim.isKnightLeap && rawT < 1) {
              group.rotateX(Math.sin(rawT * Math.PI) * 0.22);
            }

            if (rawT >= 1) {
              group.position.copy(anim.endPos);
              group.quaternion.copy(anim.endQuat);
              animatingPiecesRef.current.delete(pieceId);
            }
          });
        }

        // 2. Health bars face camera & Halos pulse smoothly
        const pulseScale = 1 + Math.sin(now * 0.006) * 0.08;
        pieceMeshesRef.current.forEach((group) => {
          const hb = group.getObjectByName('healthBar');
          if (hb && cameraRef.current) {
            hb.quaternion.copy(group.quaternion).invert().multiply(cameraRef.current.quaternion);
          }

          const selHalo = group.getObjectByName('selectionHalo');
          if (selHalo) {
            selHalo.scale.set(pulseScale, pulseScale, 1);
          }

          const chkHalo = group.getObjectByName('checkHalo');
          if (chkHalo) {
            const checkPulse = 1 + Math.sin(now * 0.01) * 0.14;
            chkHalo.scale.set(checkPulse, checkPulse, 1);
          }

          const ascAura = group.getObjectByName('ascendantStageAura');
          if (ascAura) {
            ascAura.rotation.y = now * 0.0012;
            ascAura.scale.set(pulseScale, 1, pulseScale);
          }
        });

        // 2b. Trebuchet Ranged Siege Boulder Projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const proj = projectilesRef.current[i];
          const rawT = Math.min(1, (now - proj.startTime) / proj.duration);
          const oneMinusT = 1 - rawT;
          const mid = new THREE.Vector3().lerpVectors(proj.startPos, proj.endPos, 0.5);
          mid.y = Math.max(proj.startPos.y, proj.endPos.y) + proj.arcHeight;

          proj.mesh.position.set(
            oneMinusT * oneMinusT * proj.startPos.x + 2 * oneMinusT * rawT * mid.x + rawT * rawT * proj.endPos.x,
            oneMinusT * oneMinusT * proj.startPos.y + 2 * oneMinusT * rawT * mid.y + rawT * rawT * proj.endPos.y,
            oneMinusT * oneMinusT * proj.startPos.z + 2 * oneMinusT * rawT * mid.z + rawT * rawT * proj.endPos.z
          );
          proj.mesh.rotation.x += 0.18;
          proj.mesh.rotation.z += 0.14;

          if (rawT >= 1) {
            scene.remove(proj.mesh);
            projectilesRef.current.splice(i, 1);
          }
        }

        // 3. Floating texts
        for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
          const ft = floatingTextsRef.current[i];
          ft.sprite.position.y += ft.velocityY;
          ft.life -= 0.018;
          (ft.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, ft.life);
          if (ft.life <= 0) {
            scene.remove(ft.sprite);
            floatingTextsRef.current.splice(i, 1);
          }
        }

        // 4. Dice spin
        if (diceMeshRef.current) {
          diceMeshRef.current.rotation.x += 0.08;
          diceMeshRef.current.rotation.y += 0.09;
        }

        // 5. Ghost piece pulse (works on both horizontal tiles and vertical walls without drifting)
        if (ghostMeshRef.current) {
          const ghostPulse = 1 + Math.sin(now * 0.006) * 0.04;
          const baseScaleX = isNightMode ? 1.28 : 1.22;
          const baseScaleY = isNightMode ? 1.36 : 1.3;
          ghostMeshRef.current.scale.set(
            baseScaleX * ghostPulse,
            baseScaleY * ghostPulse,
            baseScaleX * ghostPulse
          );
        }

        rendererRef.current.render(scene, cameraRef.current);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      pieceMeshesRef.current.clear();
      tileMeshesRef.current = [];
      boardDecorMeshesRef.current = [];
      animatingPiecesRef.current.clear();
      if (rendererRef.current?.domElement) {
        rendererRef.current.dispose();
        rendererRef.current.domElement.remove();
      }
    };
  }, [updateCameraPosition]);

  // Only apply camera preset on initial mount OR when the user explicitly clicks a Camera Navigation button
  const hasInitializedCameraRef = useRef(false);
  const lastPresetTriggerRef = useRef(0);
  const prevPresetIdRef = useRef<string>(cameraPreset);

  const applyVerticalWallSideCamera = useCallback(
    (side: 'south' | 'east' | 'north' | 'west', onSideRoll: boolean) => {
      stopActiveCameraAnimation();
      const baseDist =
        boardType === 'classic' ? 19 : boardType === 'quick_pyramid' ? 26 : 40;
      cameraDistanceRef.current = baseDist * 0.88;
      // Position camera out on the side looking down onto the vertical cliff walls
      cameraPhiRef.current = Math.PI * 0.44;
      cameraTargetYRef.current =
        boardType === 'pyramid' ? 2.1 : boardType === 'quick_pyramid' ? 1.6 : 0.8;
      cameraRollRef.current = onSideRoll ? Math.PI * 0.5 : 0;

      if (side === 'south') cameraThetaRef.current = Math.PI;
      else if (side === 'east') cameraThetaRef.current = Math.PI * 0.5;
      else if (side === 'north') cameraThetaRef.current = 0;
      else cameraThetaRef.current = -Math.PI * 0.5;

      updateCameraPosition();
    },
    [boardType, stopActiveCameraAnimation, updateCameraPosition]
  );

  useEffect(() => {
    const isInitialMount = !hasInitializedCameraRef.current;
    const isExplicitUserPresetClick =
      cameraPresetTrigger > 0 && cameraPresetTrigger !== lastPresetTriggerRef.current;

    if (!isInitialMount && !isExplicitUserPresetClick) {
      return;
    }

    const wasAlreadyVerticalSide =
      !isInitialMount && prevPresetIdRef.current === 'vertical_side' && cameraPreset === 'vertical_side';

    hasInitializedCameraRef.current = true;
    lastPresetTriggerRef.current = cameraPresetTrigger;
    prevPresetIdRef.current = cameraPreset;
    stopActiveCameraAnimation();

    const baseDist =
      boardType === 'classic' ? 19 : boardType === 'quick_pyramid' ? 26 : 40;

    if (cameraPreset === 'vertical_side') {
      const sideOrder: ('south' | 'east' | 'north' | 'west')[] = ['south', 'east', 'north', 'west'];
      const nextSide = wasAlreadyVerticalSide
        ? sideOrder[(sideOrder.indexOf(verticalWallSide) + 1) % sideOrder.length]
        : verticalWallSide;
      if (nextSide !== verticalWallSide) {
        setVerticalWallSide(nextSide);
      }
      applyVerticalWallSideCamera(nextSide, isCameraOnSideRoll);
      return;
    }

    // Reset roll and targetY for all standard upright views
    cameraRollRef.current = 0;
    cameraTargetYRef.current = 0.8;

    switch (cameraPreset) {
      case 'top_down':
        cameraDistanceRef.current = baseDist * 1.22;
        cameraPhiRef.current = 0.04;
        cameraThetaRef.current = Math.PI;
        break;
      case 'white_view':
        cameraDistanceRef.current = baseDist * 1.04;
        cameraPhiRef.current = Math.PI * 0.30;
        cameraThetaRef.current = Math.PI;
        break;
      case 'black_view':
        cameraDistanceRef.current = baseDist * 1.04;
        cameraPhiRef.current = Math.PI * 0.30;
        cameraThetaRef.current = 0;
        break;
      case 'side_profile':
        cameraDistanceRef.current = baseDist * 1.08;
        cameraPhiRef.current = Math.PI * 0.31;
        cameraThetaRef.current = Math.PI * 0.5;
        break;
      case 'isometric':
      default:
        cameraDistanceRef.current = baseDist;
        if (boardType === 'classic') {
          cameraPhiRef.current = Math.PI * 0.33;
          cameraThetaRef.current = Math.PI * 1.08;
        } else if (boardType === 'quick_pyramid') {
          cameraPhiRef.current = Math.PI * 0.28;
          cameraThetaRef.current = Math.PI * 1.15;
        } else if (boardType === 'battlefield') {
          cameraPhiRef.current = Math.PI * 0.31;
          cameraThetaRef.current = Math.PI * 1.10;
        } else {
          cameraPhiRef.current = Math.PI * 0.27;
          cameraThetaRef.current = Math.PI * 1.16;
        }
        break;
    }
    updateCameraPosition();
  }, [
    cameraPreset,
    cameraPresetTrigger,
    boardType,
    verticalWallSide,
    isCameraOnSideRoll,
    applyVerticalWallSideCamera,
    stopActiveCameraAnimation,
    updateCameraPosition,
  ]);

  // =========================================================================
  // NIGHT MODE LIGHTING & EYE-COMFORT ATMOSPHERE UPDATER
  // =========================================================================
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const { hemi, stadium, southFill, northFill, eastFill, westFill, interior } = lightsRef.current;

    if (isNightMode) {
      // Deep velvet midnight backdrop with soft warm low-glare lighting for dark rooms
      scene.background = new THREE.Color(0x04070e);
      if (hemi) {
        hemi.color.setHex(0x94a3b8);
        hemi.groundColor.setHex(0x090d16);
        hemi.intensity = 0.52;
      }
      if (stadium) {
        stadium.color.setHex(0xfde68a);
        stadium.intensity = 0.55;
      }
      if (southFill) {
        southFill.color.setHex(0xfde68a);
        southFill.intensity = 0.34;
      }
      if (northFill) {
        northFill.color.setHex(0x93c5fd);
        northFill.intensity = 0.34;
      }
      if (eastFill) {
        eastFill.color.setHex(0xcbd5e1);
        eastFill.intensity = 0.28;
      }
      if (westFill) {
        westFill.color.setHex(0xcbd5e1);
        westFill.intensity = 0.28;
      }
      if (interior) {
        interior.color.setHex(0x0284c7);
        interior.intensity = 0.45;
      }
    } else {
      // Standard bright stadium lighting
      scene.background = new THREE.Color(0x0a0f1d);
      if (hemi) {
        hemi.color.setHex(0xffffff);
        hemi.groundColor.setHex(0x334155);
        hemi.intensity = 0.95;
      }
      if (stadium) {
        stadium.color.setHex(0xfffbeb);
        stadium.intensity = 1.15;
      }
      if (southFill) {
        southFill.color.setHex(0xfef3c7);
        southFill.intensity = 0.75;
      }
      if (northFill) {
        northFill.color.setHex(0xe0e7ff);
        northFill.intensity = 0.75;
      }
      if (eastFill) {
        eastFill.color.setHex(0xf8fafc);
        eastFill.intensity = 0.65;
      }
      if (westFill) {
        westFill.color.setHex(0xf8fafc);
        westFill.intensity = 0.65;
      }
      if (interior) {
        interior.color.setHex(0xa5f3fc);
        interior.intensity = 1.25;
      }
    }
  }, [isNightMode]);

  // =========================================================================
  // BUILD 3D BOARD: HOLLOW ARCHITECTURAL SHELL WITH STEPPED TERRACES
  // =========================================================================
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Clear old tile meshes and board decor
    tileMeshesRef.current.forEach((mesh) => scene.remove(mesh));
    tileMeshesRef.current = [];
    boardDecorMeshesRef.current.forEach((obj) => scene.remove(obj));
    boardDecorMeshesRef.current = [];

    // Base podium foundation underneath the entire board
    const foundationSpan = boardSize * 1.35 + 1.5;
    const foundationGeo = new THREE.BoxGeometry(foundationSpan, 0.5, foundationSpan);
    const foundationMat = new THREE.MeshStandardMaterial({
      color: isNightMode ? 0x070b14 : 0x11141e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const foundationMesh = new THREE.Mesh(foundationGeo, foundationMat);
    foundationMesh.position.y = -0.26;
    foundationMesh.receiveShadow = true;
    scene.add(foundationMesh);
    boardDecorMeshesRef.current.push(foundationMesh);

    const halfSpan = halfBoard * spacing;
    const TILE_SIZE = 1.25;
    const SLAB_THICKNESS = 0.18; // Clean architectural terrace slab, HOLLOW interior below!

    // Helper to create crisp 3D perimeter coordinate label plaques (A..T and 1..20)
    // Larger & warm-amber tinted in Night Mode for effortless reading from a distance
    const createCoordLabelMesh = (label: string, wx: number, wz: number): THREE.Mesh => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isNightMode) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(4, 4, 56, 56, 12);
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 38px monospace';
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 34px monospace';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 32, 33);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: isNightMode ? 0.95 : 0.85,
        side: THREE.DoubleSide,
      });
      const plaqueScale = isNightMode ? 0.66 : 0.52;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(plaqueScale, plaqueScale), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wx, 0.01, wz);
      return mesh;
    };

    const borderOffset = halfSpan + 0.96;
    for (let i = 0; i < boardSize; i++) {
      const coordPos = (i - halfBoard) * spacing;
      const fileLetter = String.fromCharCode(65 + i);
      const rankNum = `${i + 1}`;

      // South & North File Letters (A, B, C...)
      const southFile = createCoordLabelMesh(fileLetter, coordPos, -borderOffset);
      southFile.rotation.z = Math.PI;
      scene.add(southFile);
      boardDecorMeshesRef.current.push(southFile);

      const northFile = createCoordLabelMesh(fileLetter, coordPos, borderOffset);
      scene.add(northFile);
      boardDecorMeshesRef.current.push(northFile);

      // West & East Rank Numbers (1, 2, 3...)
      const westRank = createCoordLabelMesh(rankNum, -borderOffset, coordPos);
      westRank.rotation.z = Math.PI;
      scene.add(westRank);
      boardDecorMeshesRef.current.push(westRank);

      const eastRank = createCoordLabelMesh(rankNum, borderOffset, coordPos);
      scene.add(eastRank);
      boardDecorMeshesRef.current.push(eastRank);
    }

    // Build each horizontal tile terrace as a hollow stepped slab
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const tier = getTileTier(boardType, x, y);
        const isSummit = isSummitTile(boardType, x, y);
        const isValley = isValleyTile(boardType, x, y);

        // Continuous checkerboard pattern
        const isLight =
          boardType === 'pyramid' || boardType === 'quick_pyramid'
            ? (x + y + tier) % 2 === 0
            : (x + y) % 2 === 0;

        const tileHeight = TIER_HEIGHTS[tier] || 0;
        const wx = (x - halfBoard) * spacing;
        const wz = (y - halfBoard) * spacing;

        // Stepped terrace slab: uniform thickness, leaving interior completely hollow!
        // In Night Mode, replaces bright #e2e8f0 light tiles with low-glare Moonlit Slate (#334155)
        // and Deep Obsidian (#0f172a) with matte roughness so there is zero eye strain in the dark!
        const tileGeo = new THREE.BoxGeometry(TILE_SIZE, SLAB_THICKNESS, TILE_SIZE);
        const LIGHT_TILE_COLOR = isNightMode ? 0x334155 : 0xe2e8f0;
        const DARK_TILE_COLOR = isNightMode ? 0x0f172a : 0x1e293b;
        const tileColor = isLight ? LIGHT_TILE_COLOR : DARK_TILE_COLOR;

        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: isNightMode ? 0.78 : 0.35,
          metalness: isNightMode ? 0.08 : 0.15,
          side: THREE.DoubleSide, // Renders both top and underside inside the hollow pyramid
        });

        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(wx, tileHeight - SLAB_THICKNESS / 2 + 0.05, wz);
        tileMesh.receiveShadow = true;
        tileMesh.userData = {
          tileX: x,
          tileY: y,
          tier,
          isSummit,
          isValley,
          isPyramidTerrain: tier > 0,
        };

        scene.add(tileMesh);
        tileMeshesRef.current.push(tileMesh);

        // Perimeter groove frame
        const grooveGeo = new THREE.BoxGeometry(TILE_SIZE, 0.02, TILE_SIZE);
        const grooveMat = new THREE.MeshBasicMaterial({
          color: isSummit ? (isNightMode ? 0xd97706 : 0xf59e0b) : isNightMode ? 0x475569 : 0x090d16,
          wireframe: true,
          transparent: true,
          opacity: isNightMode ? 0.55 : 0.45,
        });
        const grooveMesh = new THREE.Mesh(grooveGeo, grooveMat);
        grooveMesh.position.set(wx, tileHeight + 0.06, wz);
        scene.add(grooveMesh);
        boardDecorMeshesRef.current.push(grooveMesh);

        // Summit golden inlay edge
        if (isSummit) {
          const goldTrim = new THREE.Mesh(
            new THREE.BoxGeometry(TILE_SIZE, 0.03, TILE_SIZE),
            new THREE.MeshStandardMaterial({
              color: 0xf59e0b,
              emissive: 0x78350f,
              metalness: 0.8,
              roughness: 0.2,
            })
          );
          goldTrim.position.set(wx, tileHeight + 0.07, wz);
          scene.add(goldTrim);
          boardDecorMeshesRef.current.push(goldTrim);
        }
      }
    }

    // Build interactive vertical cliff tiles connecting the terraces
    if (boardType === 'pyramid' || boardType === 'quick_pyramid') {
      const vTiles = getVerticalCliffTiles(boardType);

      vTiles.forEach((vt) => {
        const step = vt.wallTierStep || 1;
        const lowerH = TIER_HEIGHTS[step - 1] || 0;
        const upperH = TIER_HEIGHTS[step] || 1.25;
        const stepHeight = upperH - lowerH;
        const midY = (lowerH + upperH) / 2 + 0.05;

        const wx = (vt.x - halfBoard) * spacing;
        const wz = (vt.y - halfBoard) * spacing;
        const halfTile = TILE_SIZE / 2;
        const wallThickness = 0.16;

        let wallGeo: THREE.BoxGeometry;
        let px = wx;
        let py = midY;
        let pz = wz;

        if (vt.wallDirection === 'south') {
          wallGeo = new THREE.BoxGeometry(TILE_SIZE, stepHeight, wallThickness);
          pz = wz - halfTile - wallThickness / 2;
        } else if (vt.wallDirection === 'north') {
          wallGeo = new THREE.BoxGeometry(TILE_SIZE, stepHeight, wallThickness);
          pz = wz + halfTile + wallThickness / 2;
        } else if (vt.wallDirection === 'west') {
          wallGeo = new THREE.BoxGeometry(wallThickness, stepHeight, TILE_SIZE);
          px = wx - halfTile - wallThickness / 2;
        } else {
          wallGeo = new THREE.BoxGeometry(wallThickness, stepHeight, TILE_SIZE);
          px = wx + halfTile + wallThickness / 2;
        }

        const isWallLight = vt.color === 'light';
        const LIGHT_TILE_COLOR = isNightMode ? 0x334155 : 0xe2e8f0;
        const DARK_TILE_COLOR = isNightMode ? 0x0f172a : 0x1e293b;
        const wallColor = isWallLight ? LIGHT_TILE_COLOR : DARK_TILE_COLOR;

        const vMat = new THREE.MeshStandardMaterial({
          color: wallColor,
          roughness: isNightMode ? 0.78 : 0.35,
          metalness: isNightMode ? 0.08 : 0.15,
          side: THREE.DoubleSide,
        });

        const wallMesh = new THREE.Mesh(wallGeo, vMat);
        wallMesh.position.set(px, py, pz);
        wallMesh.receiveShadow = true;
        wallMesh.userData = {
          tileX: vt.x,
          tileY: vt.y,
          tier: vt.tier,
          isVerticalWall: true,
          wallDirection: vt.wallDirection,
          wallTierStep: vt.wallTierStep,
          isPyramidTerrain: true,
        };

        scene.add(wallMesh);
        tileMeshesRef.current.push(wallMesh);

        // Circular ground mount disc on wall face
        const isNorthSouth = vt.wallDirection === 'north' || vt.wallDirection === 'south';
        const mountGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.04, 24);
        const mountMat = new THREE.MeshStandardMaterial({
          color: wallColor,
          metalness: 0.15,
          roughness: 0.35,
          side: THREE.DoubleSide,
        });
        const mountMesh = new THREE.Mesh(mountGeo, mountMat);
        if (isNorthSouth) {
          mountMesh.rotation.x = Math.PI / 2;
          mountMesh.position.set(
            px,
            py,
            vt.wallDirection === 'south' ? pz - wallThickness / 2 - 0.02 : pz + wallThickness / 2 + 0.02
          );
        } else {
          mountMesh.rotation.z = Math.PI / 2;
          mountMesh.position.set(
            vt.wallDirection === 'west' ? px - wallThickness / 2 - 0.02 : px + wallThickness / 2 + 0.02,
            py,
            pz
          );
        }
        mountMesh.userData = { ...wallMesh.userData, isPyramidTerrain: false };
        scene.add(mountMesh);
        tileMeshesRef.current.push(mountMesh);
      });
    }
  }, [boardType, boardSize, halfBoard, spacing, isNightMode]);

  // =========================================================================
  // UPDATE PIECE MESHES (WITH SMOOTH PARABOLIC MOVEMENT INTERPOLATION)
  // =========================================================================
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const currentPieceIds = new Set(pieces.map((p) => p.id));

    // Remove dead pieces
    pieceMeshesRef.current.forEach((mesh, id) => {
      if (!currentPieceIds.has(id)) {
        scene.remove(mesh);
        pieceMeshesRef.current.delete(id);
        animatingPiecesRef.current.delete(id);
      }
    });

    // Add or update living pieces (strictly bound to valid playable tiles in generateBoardTiles)
    pieces.forEach((piece) => {
      const authPos =
        toAuthoritativePosition(boardType, piece.position) ||
        toAuthoritativePosition(boardType, {
          x: piece.position.x,
          y: piece.position.y,
          tier: getTileTier(boardType, piece.position.x, piece.position.y),
          isVerticalWall: false,
        });

      if (piece.rpg.hp <= 0 || !authPos) {
        const existing = pieceMeshesRef.current.get(piece.id);
        if (existing) {
          scene.remove(existing);
          pieceMeshesRef.current.delete(piece.id);
          animatingPiecesRef.current.delete(piece.id);
        }
        return;
      }

      let group = pieceMeshesRef.current.get(piece.id);
      const targetPos = getTileWorldPosition(
        authPos.x,
        authPos.y,
        authPos.tier,
        authPos.isVerticalWall,
        authPos.wallDirection,
        authPos.wallTierStep
      );

      // Compute target orientation euler & quaternion
      const targetEuler = new THREE.Euler();
      if (authPos.isVerticalWall) {
        if (authPos.wallDirection === 'south') {
          targetEuler.set(-Math.PI / 2, 0, 0);
        } else if (authPos.wallDirection === 'north') {
          targetEuler.set(-Math.PI / 2, 0, Math.PI);
        } else if (authPos.wallDirection === 'west') {
          targetEuler.set(-Math.PI / 2, 0, Math.PI / 2);
        } else {
          targetEuler.set(-Math.PI / 2, 0, -Math.PI / 2);
        }
      } else {
        const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
        let rotY = 0;
        if (facing === 'north') rotY = 0;
        else if (facing === 'south') rotY = Math.PI;
        else if (facing === 'east') rotY = Math.PI / 2;
        else if (facing === 'west') rotY = -Math.PI / 2;
        targetEuler.set(0, rotY, 0);
      }
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      const isNewMesh =
        !group ||
        group.userData.pieceType !== piece.type ||
        group.userData.isNightMode !== isNightMode;
      const prevPos = group ? group.position.clone() : targetPos.clone();
      const prevQuat = group ? group.quaternion.clone() : targetQuat.clone();

      if (isNewMesh) {
        if (group) {
          scene.remove(group);
          pieceMeshesRef.current.delete(piece.id);
        }
        group = createPieceGeometry(piece.type, piece.color);
        group.userData = { pieceId: piece.id, pieceType: piece.type, isNightMode };
        group.position.copy(prevPos);
        group.quaternion.copy(prevQuat);
        scene.add(group);
        pieceMeshesRef.current.set(piece.id, group);
      }

      if (!group) return;
      if (group.parent !== scene) {
        scene.add(group);
      }

      const distMoved = prevPos.distanceTo(targetPos);
      // Smoothly animate piece movement if it moved to a new tile (and isn't initial spawn)
      if (!isNewMesh && distMoved > 0.08 && distMoved < 38) {
        const isKnightLeap = piece.type === 'knight' || piece.type === 'gargoyle';
        const isElevationChange = Math.abs(targetPos.y - prevPos.y) > 0.3 || !!authPos.isVerticalWall;
        const arcHeight = isKnightLeap ? 1.65 : isElevationChange ? 1.15 : 0.34;
        const duration = isKnightLeap ? 380 : isElevationChange ? 350 : 290;

        animatingPiecesRef.current.set(piece.id, {
          startPos: prevPos,
          endPos: targetPos.clone(),
          startQuat: prevQuat,
          endQuat: targetQuat.clone(),
          startTime: performance.now(),
          duration,
          arcHeight,
          isKnightLeap,
        });
      } else if (!animatingPiecesRef.current.has(piece.id)) {
        group.position.copy(targetPos);
        group.quaternion.copy(targetQuat);
      }

      // Vertical foothold perch anchor (diffed so only rebuilt when wall status changes)
      const isOnWall = Boolean(authPos.isVerticalWall);
      if (group.userData.lastIsWall !== isOnWall) {
        group.userData.lastIsWall = isOnWall;
        const oldPerchAnchor = group.getObjectByName('perchAnchor');
        if (oldPerchAnchor) group.remove(oldPerchAnchor);

        if (isOnWall) {
          const anchorGeo = new THREE.CylinderGeometry(0.5, 0.54, 0.04, 24);
          const anchorMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            metalness: 0.15,
            roughness: 0.4,
          });
          const anchorMesh = new THREE.Mesh(anchorGeo, anchorMat);
          anchorMesh.name = 'perchAnchor';
          anchorMesh.position.y = -0.06;
          group.add(anchorMesh);
        }
      }

      // Update RPG Health Bar (diffed so only rebuilt when HP, MaxHP, or gameMode changes)
      const hpKey = gameMode === 'rpg' ? `${piece.rpg.hp}/${piece.rpg.maxHp}` : 'off';
      if (group.userData.lastHpKey !== hpKey) {
        group.userData.lastHpKey = hpKey;
        const oldHb = group.getObjectByName('healthBar');
        if (oldHb) group.remove(oldHb);

        if (gameMode === 'rpg') {
          const hb = createHealthBarGroup(piece);
          group.add(hb);
        }
      }

      // Vanguard 9 -> 1 Speed Band Floating Badge (diffed so CanvasTexture is only created when range changes)
      if (piece.type === 'vanguard') {
        const { maxTiles } = getVanguardMovementProfile(piece);
        const vanguardKey = `${maxTiles}_${gameMode}`;
        if (group.userData.lastVanguardKey !== vanguardKey) {
          group.userData.lastVanguardKey = vanguardKey;
          const oldVanguardBadge = group.getObjectByName('vanguardRangeBadge');
          if (oldVanguardBadge) group.remove(oldVanguardBadge);
          const badge = createVanguardBadgeSprite(maxTiles);
          group.add(badge);
        }
      } else if (group.userData.lastVanguardKey) {
        group.userData.lastVanguardKey = undefined;
        const oldVanguardBadge = group.getObjectByName('vanguardRangeBadge');
        if (oldVanguardBadge) group.remove(oldVanguardBadge);
      }

      // Ascendant Stage I / II / III Tiered Aura Ring (diffed by stride stage)
      if (piece.type === 'ascendant') {
        const profile = getAscendantProfile(piece, boardSize);
        if (group.userData.lastAscendantStride !== profile.maxStride) {
          group.userData.lastAscendantStride = profile.maxStride;
          const oldAscAura = group.getObjectByName('ascendantStageAura');
          if (oldAscAura) group.remove(oldAscAura);
          const aura = createAscendantAuraGroup(piece);
          group.add(aura);
        }
      } else if (group.userData.lastAscendantStride) {
        group.userData.lastAscendantStride = undefined;
        const oldAscAura = group.getObjectByName('ascendantStageAura');
        if (oldAscAura) group.remove(oldAscAura);
      }

      // Night Mode Long-Distance Piece Emblem Badge (makes every piece type readable from across a dark room)
      const nightEmblemKey = isNightMode ? `${piece.type}_${piece.color}` : 'off';
      if (group.userData.lastNightEmblemKey !== nightEmblemKey) {
        group.userData.lastNightEmblemKey = nightEmblemKey;
        const oldNightEmblem = group.getObjectByName('nightDistanceEmblem');
        if (oldNightEmblem) group.remove(oldNightEmblem);
        if (isNightMode) {
          const emblem = createNightDistanceEmblemSprite(piece.type, piece.color);
          group.add(emblem);
        }
      }

      // Selection halo under active piece (diffed)
      const isPieceSelected = Boolean(selectedPiece && selectedPiece.id === piece.id);
      if (group.userData.lastSelected !== isPieceSelected) {
        group.userData.lastSelected = isPieceSelected;
        const oldHalo = group.getObjectByName('selectionHalo');
        if (oldHalo) group.remove(oldHalo);

        if (isPieceSelected) {
          const haloGeo = new THREE.RingGeometry(0.36, 0.54, 32);
          const haloMat = new THREE.MeshBasicMaterial({
            color: 0xfbbf24,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.name = 'selectionHalo';
          halo.rotation.x = -Math.PI / 2;
          halo.position.y = 0.02;
          group.add(halo);
        }
      }

      // King In-Check 3D Crimson Alert Ring (diffed)
      const isKingInCheckNow = Boolean(inCheck && piece.type === 'king' && piece.color === currentTurn);
      if (group.userData.lastInCheck !== isKingInCheckNow) {
        group.userData.lastInCheck = isKingInCheckNow;
        const oldCheckHalo = group.getObjectByName('checkHalo');
        if (oldCheckHalo) group.remove(oldCheckHalo);

        if (isKingInCheckNow) {
          const checkGeo = new THREE.RingGeometry(0.38, 0.62, 32);
          const checkMat = new THREE.MeshBasicMaterial({
            color: 0xf43f5e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          });
          const checkHalo = new THREE.Mesh(checkGeo, checkMat);
          checkHalo.name = 'checkHalo';
          checkHalo.rotation.x = -Math.PI / 2;
          checkHalo.position.y = 0.025;
          group.add(checkHalo);
        }
      }
    });
  }, [
    pieces,
    selectedPiece,
    inCheck,
    currentTurn,
    gameMode,
    boardType,
    boardSize,
    getTileWorldPosition,
    createPieceGeometry,
    createHealthBarGroup,
    createVanguardBadgeSprite,
    createAscendantAuraGroup,
    createNightDistanceEmblemSprite,
    isNightMode,
  ]);

  // =========================================================================
  // LAST MOVE ORIGIN & DESTINATION 3D HIGHLIGHTS + TRAIL
  // =========================================================================
  useEffect(() => {
    if (!lastMoveGroupRef.current) return;
    const group = lastMoveGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!lastMove) return;

    const fromPos = getTileWorldPosition(
      lastMove.from.x,
      lastMove.from.y,
      lastMove.from.tier,
      lastMove.from.isVerticalWall,
      lastMove.from.wallDirection,
      lastMove.from.wallTierStep
    );

    const toPos = getTileWorldPosition(
      lastMove.to.x,
      lastMove.to.y,
      lastMove.to.tier,
      lastMove.to.isVerticalWall,
      lastMove.to.wallDirection,
      lastMove.to.wallTierStep
    );

    const trailColor = lastMove.isRookExchange ? 0x10b981 : lastMove.isCapture ? 0xf43f5e : 0x38bdf8;

    // Origin Tile Marker Ring (supports both horizontal tiles and vertical walls)
    const addMoveMarkerRing = (pos: Position, worldPos: THREE.Vector3, innerR: number, outerR: number, opacity: number) => {
      const markerRing = new THREE.Mesh(
        new THREE.RingGeometry(innerR, outerR, pos.isVerticalWall ? 24 : 4),
        new THREE.MeshBasicMaterial({
          color: trailColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity,
        })
      );
      if (pos.isVerticalWall) {
        const step = pos.wallTierStep || 1;
        const lowerH = TIER_HEIGHTS[step - 1] || 0;
        const upperH = TIER_HEIGHTS[step] || 1.25;
        const midY = (lowerH + upperH) / 2 + 0.05;
        const halfTile = 1.25 / 2;
        const wx = (pos.x - halfBoard) * spacing;
        const wz = (pos.y - halfBoard) * spacing;
        const wallOffset = halfTile + 0.21;

        if (pos.wallDirection === 'south') {
          markerRing.position.set(wx, midY, wz - wallOffset);
          markerRing.rotation.set(0, 0, 0);
        } else if (pos.wallDirection === 'north') {
          markerRing.position.set(wx, midY, wz + wallOffset);
          markerRing.rotation.set(0, Math.PI, 0);
        } else if (pos.wallDirection === 'west') {
          markerRing.position.set(wx - wallOffset, midY, wz);
          markerRing.rotation.set(0, -Math.PI / 2, 0);
        } else {
          markerRing.position.set(wx + wallOffset, midY, wz);
          markerRing.rotation.set(0, Math.PI / 2, 0);
        }
      } else {
        markerRing.rotation.x = -Math.PI / 2;
        markerRing.rotation.z = Math.PI / 4;
        markerRing.position.set(worldPos.x, worldPos.y - 0.08, worldPos.z);
      }
      group.add(markerRing);
    };

    addMoveMarkerRing(lastMove.from, fromPos, 0.42, 0.52, 0.55);
    addMoveMarkerRing(lastMove.to, toPos, 0.44, 0.56, 0.78);

    // Subtle parabolic trail connecting origin to destination
    const mid = new THREE.Vector3(
      (fromPos.x + toPos.x) / 2,
      Math.max(fromPos.y, toPos.y) + 0.55,
      (fromPos.z + toPos.z) / 2
    );
    const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);
    const pts = curve.getPoints(24);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineDashedMaterial({
      color: trailColor,
      dashSize: 0.28,
      gapSize: 0.18,
      transparent: true,
      opacity: 0.55,
    });
    const trailLine = new THREE.Line(lineGeo, lineMat);
    trailLine.computeLineDistances();
    group.add(trailLine);

    // Trebuchet Ranged Bombardment High-Arcing Siege Projectile Animation
    if (lastMove.isBombard && sceneRef.current) {
      const boulderGroup = new THREE.Group();
      const coreMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28, 1),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xdc2626,
          emissiveIntensity: 0.9,
          roughness: 0.35,
        })
      );
      const glowHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.45,
        })
      );
      boulderGroup.add(coreMesh, glowHalo);
      boulderGroup.position.copy(fromPos);
      sceneRef.current.add(boulderGroup);

      projectilesRef.current.push({
        mesh: boulderGroup,
        startPos: fromPos.clone().add(new THREE.Vector3(0, 0.8, 0)),
        endPos: toPos.clone().add(new THREE.Vector3(0, 0.3, 0)),
        startTime: performance.now(),
        duration: 520,
        arcHeight: 4.2,
      });
    }
  }, [lastMove, getTileWorldPosition]);

  // =========================================================================
  // MOVE INDICATORS: CLICKABLE, GUARANTEED DESTINATION TARGETS
  // =========================================================================
  useEffect(() => {
    if (!indicatorGroupRef.current || !sceneRef.current) return;
    const group = indicatorGroupRef.current;
    const scene = sceneRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (trajectoryArcRef.current) {
      scene.remove(trajectoryArcRef.current);
      trajectoryArcRef.current = null;
    }

    if (ghostMeshRef.current) {
      scene.remove(ghostMeshRef.current);
      ghostMeshRef.current = null;
    }

    const activeMoves = validMoves.length > 0 ? validMoves : hoverMoves;
    const isHoverOnly = validMoves.length === 0 && hoverMoves.length > 0;

    // Determine active piece for specialized 3D board overlays (Trebuchet Dead Zone & Vanguard Speed Bands)
    const activeOverlayPiece =
      selectedPiece ||
      (activeMoves.length > 0 ? pieces.find((p) => p.id === activeMoves[0].pieceId) || null : null);

    // 1. Trebuchet Minimum-Range "Dead Zone" Ring (1-2 tile close-range blind spot shading)
    if (activeOverlayPiece && activeOverlayPiece.type === 'trebuchet') {
      const tx = activeOverlayPiece.position.x;
      const ty = activeOverlayPiece.position.y;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (dx === 0 && dy === 0) continue;
          const bx = tx + dx;
          const by = ty + dy;
          if (bx < 0 || bx >= boardSize || by < 0 || by >= boardSize) continue;
          const bTier = getTileTier(boardType, bx, by);
          const bPos = getTileWorldPosition(bx, by, bTier);

          // Subtle amber-crimson blind-spot tile overlay
          const blindTile = new THREE.Mesh(
            new THREE.PlaneGeometry(1.06, 1.06),
            new THREE.MeshBasicMaterial({
              color: 0xf59e0b,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.14,
            })
          );
          blindTile.rotation.x = -Math.PI / 2;
          blindTile.position.set(bPos.x, bPos.y + 0.015, bPos.z);
          group.add(blindTile);

          // Outer perimeter dashed border around the 2-tile dead zone
          if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) {
            const borderRing = new THREE.Mesh(
              new THREE.RingGeometry(0.46, 0.54, 4),
              new THREE.MeshBasicMaterial({
                color: 0xf97316,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.45,
              })
            );
            borderRing.rotation.x = -Math.PI / 2;
            borderRing.rotation.z = Math.PI / 4;
            borderRing.position.set(bPos.x, bPos.y + 0.022, bPos.z);
            group.add(borderRing);
          }
        }
      }
    }

    // 2. Vanguard 9 -> 1 Speed Band Corridor Overlay when Vanguard is selected/hovered
    if (activeOverlayPiece && activeOverlayPiece.type === 'vanguard' && boardType === 'pyramid') {
      const vx = activeOverlayPiece.position.x;
      const vy = activeOverlayPiece.position.y;
      const facing = activeOverlayPiece.facing || (activeOverlayPiece.color === 'white' ? 'north' : 'south');
      const fdy = facing === 'north' ? 1 : -1;
      const isVanguardOnSummit =
        !activeOverlayPiece.position.isVerticalWall && isSummitTile(boardType, vx, vy);
      const { maxTiles: baseMaxTiles } = getVanguardMovementProfile(activeOverlayPiece);
      const maxTiles = isVanguardOnSummit ? 1 : baseMaxTiles;

      for (let step = 1; step <= maxTiles; step++) {
        const sy = vy + fdy * step;
        if (sy < 0 || sy >= boardSize) break;
        const sTier = getTileTier(boardType, vx, sy);
        const sPos = getTileWorldPosition(vx, sy, sTier);

        const bandTile = new THREE.Mesh(
          new THREE.PlaneGeometry(1.12, 1.12),
          new THREE.MeshBasicMaterial({
            color: step === maxTiles ? 0x34d399 : 0x06b6d4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.16,
          })
        );
        bandTile.rotation.x = -Math.PI / 2;
        bandTile.position.set(sPos.x, sPos.y + 0.014, sPos.z);
        group.add(bandTile);
      }
    }

    activeMoves.forEach((rawMove) => {
      const authTo = toAuthoritativePosition(boardType, rawMove.to);
      if (!authTo) return;
      const move: Move = {
        ...rawMove,
        to: authTo,
      };
      const pos = getTileWorldPosition(
        authTo.x,
        authTo.y,
        authTo.tier,
        authTo.isVerticalWall,
        authTo.wallDirection,
        authTo.wallTierStep
      );
      const isCap = move.isCapture;

      // Indicator metadata for guaranteed click execution (only clickable when a piece is actively selected)
      const indicatorUserData = {
        isMoveIndicator: !isHoverOnly,
        move: !isHoverOnly ? move : undefined,
        tileX: authTo.x,
        tileY: authTo.y,
        isVerticalWall: authTo.isVerticalWall,
        wallDirection: authTo.wallDirection,
      };

      if (authTo.isVerticalWall) {
        const step = authTo.wallTierStep || 1;
        const lowerH = TIER_HEIGHTS[step - 1] || 0;
        const upperH = TIER_HEIGHTS[step] || 1.25;
        // Must include +0.05 and offset > halfTile + 0.20 so vertical wall indicators sit cleanly IN FRONT of mountMesh!
        const midY = (lowerH + upperH) / 2 + 0.05;
        const halfTile = 1.25 / 2;
        const wallFrontOffset = halfTile + 0.215;

        const wx = (move.to.x - halfBoard) * spacing;
        const wz = (move.to.y - halfBoard) * spacing;

        let indX = wx;
        const indY = midY;
        let indZ = wz;
        let rotY = 0;

        if (move.to.wallDirection === 'south') {
          indZ = wz - wallFrontOffset;
          rotY = 0;
        } else if (move.to.wallDirection === 'north') {
          indZ = wz + wallFrontOffset;
          rotY = Math.PI;
        } else if (move.to.wallDirection === 'west') {
          indX = wx - wallFrontOffset;
          rotY = -Math.PI / 2;
        } else {
          indX = wx + wallFrontOffset;
          rotY = Math.PI / 2;
        }

        if (move.isRookExchange) {
          const exchRing = new THREE.Mesh(
            new THREE.RingGeometry(0.34, 0.54, 28),
            new THREE.MeshBasicMaterial({
              color: 0x10b981,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: isHoverOnly ? 0.85 : 0.98,
            })
          );
          exchRing.position.set(indX, indY, indZ);
          exchRing.rotation.y = rotY;
          exchRing.userData = indicatorUserData;
          group.add(exchRing);
        } else if (move.isBombard) {
          const bombardRing = new THREE.Mesh(
            new THREE.RingGeometry(0.32, 0.52, 24),
            new THREE.MeshBasicMaterial({
              color: 0xf59e0b,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: isHoverOnly ? 0.85 : 0.98,
            })
          );
          bombardRing.position.set(indX, indY, indZ);
          bombardRing.rotation.y = rotY;
          bombardRing.userData = indicatorUserData;
          group.add(bombardRing);
        } else if (isCap) {
          const capRing = new THREE.Mesh(
            new THREE.RingGeometry(0.32, 0.52, 28),
            new THREE.MeshBasicMaterial({
              color: gameMode === 'rpg' ? 0xf43f5e : isHoverOnly ? 0xf87171 : 0xef4444,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: isHoverOnly ? 0.88 : 0.98,
            })
          );
          capRing.position.set(indX, indY, indZ);
          capRing.rotation.y = rotY;
          capRing.userData = indicatorUserData;
          group.add(capRing);

          const capInnerDot = new THREE.Mesh(
            new THREE.CircleGeometry(0.16, 20),
            new THREE.MeshBasicMaterial({
              color: 0xfda4af,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: isHoverOnly ? 0.78 : 0.92,
            })
          );
          capInnerDot.position.set(indX, indY, indZ);
          capInnerDot.rotation.y = rotY;
          capInnerDot.userData = indicatorUserData;
          group.add(capInnerDot);
        } else {
          // High-visibility vertical wall destination ring + glowing center target disc
          const wallRing = new THREE.Mesh(
            new THREE.RingGeometry(0.30, 0.46, 28),
            new THREE.MeshBasicMaterial({
              color: isHoverOnly ? 0x38bdf8 : 0xfbbf24,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: isHoverOnly ? 0.78 : 0.95,
            })
          );
          wallRing.position.set(indX, indY, indZ);
          wallRing.rotation.y = rotY;
          wallRing.userData = indicatorUserData;
          group.add(wallRing);

          const moveDot = new THREE.Mesh(
            new THREE.CircleGeometry(0.22, 24),
            new THREE.MeshBasicMaterial({
              color: isHoverOnly ? 0x38bdf8 : 0xffffff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: isHoverOnly ? 0.68 : 0.92,
            })
          );
          moveDot.position.set(indX, indY, indZ);
          moveDot.rotation.y = rotY;
          moveDot.userData = indicatorUserData;
          group.add(moveDot);
        }
        return;
      }

      // Horizontal ground tile indicator
      if (move.isRookExchange) {
        const outerSwapRing = new THREE.Mesh(
          new THREE.RingGeometry(0.38, 0.56, 28),
          new THREE.MeshBasicMaterial({
            color: 0x10b981,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isHoverOnly ? 0.78 : 0.95,
          })
        );
        outerSwapRing.rotation.x = -Math.PI / 2;
        outerSwapRing.position.set(pos.x, pos.y + 0.045, pos.z);
        outerSwapRing.userData = indicatorUserData;
        group.add(outerSwapRing);

        const innerSwapRing = new THREE.Mesh(
          new THREE.RingGeometry(0.18, 0.28, 24),
          new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isHoverOnly ? 0.75 : 0.92,
          })
        );
        innerSwapRing.rotation.x = -Math.PI / 2;
        innerSwapRing.position.set(pos.x, pos.y + 0.055, pos.z);
        innerSwapRing.userData = indicatorUserData;
        group.add(innerSwapRing);
      } else if (move.isBombard) {
        const outerBombardRing = new THREE.Mesh(
          new THREE.RingGeometry(0.36, 0.54, 28),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isHoverOnly ? 0.78 : 0.94,
          })
        );
        outerBombardRing.rotation.x = -Math.PI / 2;
        outerBombardRing.position.set(pos.x, pos.y + 0.045, pos.z);
        outerBombardRing.userData = indicatorUserData;
        group.add(outerBombardRing);

        const innerBombardRing = new THREE.Mesh(
          new THREE.RingGeometry(0.16, 0.26, 24),
          new THREE.MeshBasicMaterial({
            color: 0xf97316,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isHoverOnly ? 0.75 : 0.9,
          })
        );
        innerBombardRing.rotation.x = -Math.PI / 2;
        innerBombardRing.position.set(pos.x, pos.y + 0.055, pos.z);
        innerBombardRing.userData = indicatorUserData;
        group.add(innerBombardRing);
      } else if (isCap) {
        const capRing = new THREE.Mesh(
          new THREE.RingGeometry(0.32, 0.48, 24),
          new THREE.MeshBasicMaterial({
            color: gameMode === 'rpg' ? 0xf43f5e : isHoverOnly ? 0xf87171 : 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isHoverOnly ? 0.75 : 0.9,
          })
        );
        capRing.rotation.x = -Math.PI / 2;
        capRing.position.set(pos.x, pos.y + 0.04, pos.z);
        capRing.userData = indicatorUserData;
        group.add(capRing);

        if (gameMode === 'rpg') {
          const innerDot = new THREE.Mesh(
            new THREE.CircleGeometry(0.12, 16),
            new THREE.MeshBasicMaterial({
              color: 0xfb7185,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.85,
            })
          );
          innerDot.rotation.x = -Math.PI / 2;
          innerDot.position.set(pos.x, pos.y + 0.05, pos.z);
          innerDot.userData = indicatorUserData;
          group.add(innerDot);
        }
      } else {
        const moveDot = new THREE.Mesh(
          new THREE.CircleGeometry(0.22, 24),
          new THREE.MeshBasicMaterial({
            color: isHoverOnly ? 0x38bdf8 : 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: isHoverOnly ? 0.5 : 0.8,
          })
        );
        moveDot.rotation.x = -Math.PI / 2;
        moveDot.position.set(pos.x, pos.y + 0.04, pos.z);
        moveDot.userData = indicatorUserData;
        group.add(moveDot);
      }
    });

    // Preview trajectory arc + 3D Translucent Ghost Piece Preview (works on horizontal tiles AND vertical cliff walls!)
    const activePreview = previewMove || hoveredDestMove;
    if (activePreview) {
      const start = getTileWorldPosition(
        activePreview.from.x,
        activePreview.from.y,
        activePreview.from.tier,
        activePreview.from.isVerticalWall,
        activePreview.from.wallDirection,
        activePreview.from.wallTierStep
      );
      const end = getTileWorldPosition(
        activePreview.to.x,
        activePreview.to.y,
        activePreview.to.tier,
        activePreview.to.isVerticalWall,
        activePreview.to.wallDirection,
        activePreview.to.wallTierStep
      );

      const mid = new THREE.Vector3(
        (start.x + end.x) / 2,
        Math.max(start.y, end.y) + 1.35,
        (start.z + end.z) / 2
      );

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(28);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const previewColor = activePreview.isRookExchange
        ? 0x10b981
        : activePreview.isCapture || activePreview.isBombard
        ? 0xf43f5e
        : 0x38bdf8;
      const lineMat = new THREE.LineBasicMaterial({
        color: previewColor,
        linewidth: 3,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      trajectoryArcRef.current = line;

      // Spawn 3D Ghost Piece Preview at destination (including perched sideways on Vertical Walls!)
      const previewPiece =
        pieces.find((p) => p.id === activePreview.pieceId) || selectedPiece;
      if (previewPiece && !activePreview.isBombard) {
        const ghostGroup = createPieceGeometry(
          activePreview.promotionType || previewPiece.type,
          previewPiece.color
        );
        const ghostTint = activePreview.isCapture
          ? 0xf43f5e
          : activePreview.isRookExchange
          ? 0x10b981
          : previewPiece.color === 'white'
          ? 0xfbbf24
          : 0x38bdf8;

        ghostGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.material = new THREE.MeshStandardMaterial({
              color: ghostTint,
              emissive: ghostTint,
              emissiveIntensity: 0.65,
              roughness: 0.25,
              metalness: 0.3,
              transparent: true,
              opacity: 0.58,
              depthWrite: false,
            });
          }
        });

        ghostGroup.position.copy(end);

        // Orient ghost piece sideways on vertical cliff walls so vertical wall previews are 100% accurate
        const ghostEuler = new THREE.Euler();
        if (activePreview.to.isVerticalWall) {
          if (activePreview.to.wallDirection === 'south') {
            ghostEuler.set(-Math.PI / 2, 0, 0);
          } else if (activePreview.to.wallDirection === 'north') {
            ghostEuler.set(-Math.PI / 2, 0, Math.PI);
          } else if (activePreview.to.wallDirection === 'west') {
            ghostEuler.set(-Math.PI / 2, 0, Math.PI / 2);
          } else {
            ghostEuler.set(-Math.PI / 2, 0, -Math.PI / 2);
          }
        } else {
          const facing =
            previewPiece.facing || (previewPiece.color === 'white' ? 'north' : 'south');
          let rotY = 0;
          if (facing === 'north') rotY = 0;
          else if (facing === 'south') rotY = Math.PI;
          else if (facing === 'east') rotY = Math.PI / 2;
          else if (facing === 'west') rotY = -Math.PI / 2;
          ghostEuler.set(0, rotY, 0);
        }
        ghostGroup.quaternion.setFromEuler(ghostEuler);

        scene.add(ghostGroup);
        ghostMeshRef.current = ghostGroup;
      }
    }
  }, [
    validMoves,
    hoverMoves,
    previewMove,
    hoveredDestMove,
    selectedPiece,
    pieces,
    boardType,
    boardSize,
    gameMode,
    halfBoard,
    spacing,
    getTileWorldPosition,
    createPieceGeometry,
  ]);

  // =========================================================================
  // REAL-TIME LINE-OF-SIGHT TRANSPARENCY THROUGH PYRAMID (RULE 25 OPACITY SLIDER)
  // =========================================================================
  const updateLineOfSightTransparency = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current) return;
    const camera = cameraRef.current;
    const transparencySetting = visibilitySettings?.terrainTransparency ?? 'auto';
    const userOpacity = Math.max(0.01, Math.min(1.0, (visibilitySettings?.pyramidOpacity ?? 25) / 100));

    // If turned completely off or opacity slider set to 100%
    if (transparencySetting === 'off' || userOpacity >= 1.0) {
      tileMeshesRef.current.forEach((mesh) => {
        if (mesh.userData?.isPyramidTerrain && mesh.material instanceof THREE.Material) {
          if (mesh.material.transparent) {
            mesh.material.transparent = false;
            mesh.material.opacity = 1.0;
            mesh.material.depthWrite = true;
            mesh.material.needsUpdate = true;
          }
        }
      });
      return;
    }

    // If forced 'on': apply player-selected Pyramid Opacity across all elevated tiers and walls
    if (transparencySetting === 'on') {
      tileMeshesRef.current.forEach((mesh) => {
        if (mesh.userData?.isPyramidTerrain && mesh.material instanceof THREE.MeshStandardMaterial) {
          if (!mesh.material.transparent || mesh.material.opacity !== userOpacity) {
            mesh.material.transparent = true;
            mesh.material.opacity = userOpacity;
            mesh.material.depthWrite = false;
            mesh.material.roughness = isNightMode ? 0.32 : 0.08;
            mesh.material.metalness = 0.04;
            mesh.material.needsUpdate = true;
          }
        }
      });
      return;
    }

    // Auto Mode: Fast Line-of-Sight raycasting from camera to key objects
    const targetPoints: THREE.Vector3[] = [];

    if (selectedPiece) {
      targetPoints.push(
        getTileWorldPosition(
          selectedPiece.position.x,
          selectedPiece.position.y,
          selectedPiece.position.tier,
          selectedPiece.position.isVerticalWall,
          selectedPiece.position.wallDirection,
          selectedPiece.position.wallTierStep
        )
      );
    }

    if (tacticalLine) {
      targetPoints.push(
        getTileWorldPosition(
          tacticalLine.from.x,
          tacticalLine.from.y,
          tacticalLine.from.tier,
          tacticalLine.from.isVerticalWall,
          tacticalLine.from.wallDirection,
          tacticalLine.from.wallTierStep
        ),
        getTileWorldPosition(
          tacticalLine.to.x,
          tacticalLine.to.y,
          tacticalLine.to.tier,
          tacticalLine.to.isVerticalWall,
          tacticalLine.to.wallDirection,
          tacticalLine.to.wallTierStep
        )
      );
    }

    // Sample only pieces near the base/lower terraces so we don't cast 120 rays per frame
    const samplePieces = pieces.filter((p) => p.rpg.hp > 0 && p.position.tier <= 1).slice(0, 8);
    samplePieces.forEach((p) => {
      targetPoints.push(
        getTileWorldPosition(
          p.position.x,
          p.position.y,
          p.position.tier,
          p.position.isVerticalWall,
          p.position.wallDirection,
          p.position.wallTierStep
        ).add(new THREE.Vector3(0, 0.7, 0))
      );
    });

    const terrainMeshes = tileMeshesRef.current.filter((m) => m.userData?.isPyramidTerrain);
    let hasAnyObstruction = isActionOccluded;

    if (!hasAnyObstruction && targetPoints.length > 0 && terrainMeshes.length > 0) {
      const camPos = camera.position;
      const ray = new THREE.Raycaster();

      for (const targetPos of targetPoints) {
        const dir = new THREE.Vector3().subVectors(targetPos, camPos);
        const dist = dir.length();
        if (dist < 0.2) continue;
        dir.normalize();
        ray.set(camPos, dir);

        const hits = ray.intersectObjects(terrainMeshes, false);
        if (hits.some((hit) => hit.distance < dist - 0.25)) {
          hasAnyObstruction = true;
          break;
        }
      }
    }

    terrainMeshes.forEach((mesh) => {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        const isObstructing = hasAnyObstruction;
        const targetOpacity = isObstructing ? userOpacity : 1.0;
        const targetTransparent = isObstructing;

        if (mesh.material.opacity !== targetOpacity || mesh.material.transparent !== targetTransparent) {
          const transparencyChanged = mesh.material.transparent !== targetTransparent;
          mesh.material.transparent = targetTransparent;
          mesh.material.opacity = targetOpacity;
          mesh.material.depthWrite = !targetTransparent;
          mesh.material.roughness = isObstructing ? (isNightMode ? 0.32 : 0.08) : isNightMode ? 0.78 : 0.35;
          mesh.material.metalness = isObstructing ? 0.04 : isNightMode ? 0.08 : 0.15;
          if (transparencyChanged) {
            mesh.material.needsUpdate = true;
          }
        }
      }
    });
  }, [
    selectedPiece,
    tacticalLine,
    pieces,
    visibilitySettings?.terrainTransparency,
    visibilitySettings?.pyramidOpacity,
    isNightMode,
    isActionOccluded,
    getTileWorldPosition,
  ]);

  // Trigger line-of-sight updates on relevant state changes
  useEffect(() => {
    updateLineOfSightTransparency();
  }, [updateLineOfSightTransparency]);

  // =========================================================================
  // ELEVATED, PRIORITIZED BEACONS WITH DYNAMIC MULTI-SAMPLE OCCLUSION TEST
  // =========================================================================
  const updateBeacons = useCallback(() => {
    const emitBeacons = onBeaconsUpdateRef.current;
    if (!emitBeacons) return;

    // Rule 20 & Rule 24: Beacons are available ONLY on Quick Pyramid and Grand Pyramid, when not 'off'
    const isPyramidBoard = boardType === 'quick_pyramid' || boardType === 'pyramid';
    const isBeaconOff =
      !visibilitySettings?.hiddenPieceBeacons || visibilitySettings?.beaconSide === 'off';
    if (!isPyramidBoard || isBeaconOff) {
      if (lastBeaconsSignatureRef.current !== 'EMPTY') {
        lastBeaconsSignatureRef.current = 'EMPTY';
        emitBeacons([]);
      }
      return;
    }

    if (!cameraRef.current || !containerRef.current) return;
    const camera = cameraRef.current;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (width === 0 || height === 0) return;

    // Ensure camera world and projection matrices are 100% up-to-date during active rotation/zoom
    camera.updateMatrixWorld();

    const detectedBeacons: PieceBeaconInfo[] = [];
    const activePieces = pieces.filter((p) => p.rpg.hp > 0);
    const terrainMeshes = tileMeshesRef.current.filter((m) => m.userData?.isPyramidTerrain);

    // 1. Calculate Summit Apex Height: every visible flag MUST rise above the highest point of the Pyramid
    const summitApexH =
      boardType === 'pyramid'
        ? (TIER_HEIGHTS[4] || 5.0)
        : boardType === 'quick_pyramid'
        ? (TIER_HEIGHTS[3] || 3.75)
        : 0.0;

    // Base clearance for lowest flag row is strictly above the pyramid summit silhouette
    const baseClearance = Math.max(5.5, summitApexH + 2.2);

    // 2. Camera horizontal forward & right vectors for depth-row organization and silhouette sampling
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    const camForwardH = new THREE.Vector2(camForward.x, camForward.z);
    if (camForwardH.lengthSq() > 0.0001) {
      camForwardH.normalize();
    } else {
      camForwardH.set(0, 1);
    }
    const camRight = new THREE.Vector3(-camForwardH.y, 0, camForwardH.x);

    // 3. Calculate camera depth for all active pieces (using live interpolated 3D position when moving!)
    const pieceDataList: {
      piece: Piece;
      basePos: THREE.Vector3;
      anchorPos: THREE.Vector3;
      depthDist: number;
    }[] = [];

    let minDepth = Infinity;
    let maxDepth = -Infinity;

    activePieces.forEach((p) => {
      const liveMesh = pieceMeshesRef.current.get(p.id);
      const baseWorldPos = liveMesh
        ? liveMesh.position.clone()
        : getTileWorldPosition(
            p.position.x,
            p.position.y,
            p.position.tier,
            p.position.isVerticalWall,
            p.position.wallDirection,
            p.position.wallTierStep
          );
      const anchorWorldPos = baseWorldPos.clone().add(new THREE.Vector3(0, 0.75, 0));
      const depthDist = baseWorldPos.x * camForwardH.x + baseWorldPos.z * camForwardH.y;
      if (depthDist < minDepth) minDepth = depthDist;
      if (depthDist > maxDepth) maxDepth = depthDist;

      pieceDataList.push({
        piece: p,
        basePos: baseWorldPos,
        anchorPos: anchorWorldPos,
        depthDist,
      });
    });

    const depthRange = Math.max(0.1, maxDepth - minDepth);
    const camPos = camera.position;
    const sampleRay = new THREE.Raycaster();

    // Helper for piece vertical stature so we test whether the FULL piece is visible
    const getPieceFullHeight = (type: PieceType): number => {
      switch (type) {
        case 'king':
          return 1.58;
        case 'queen':
          return 1.34;
        case 'bishop':
          return 1.32;
        case 'vanguard':
          return 1.28;
        case 'rook':
          return 1.08;
        case 'knight':
          return 0.96;
        default:
          return 0.85;
      }
    };

    // 4. Fast 2-Point Visibility/Occlusion Test from active camera for each piece
    pieceDataList.forEach(({ piece: p, basePos, anchorPos, depthDist }) => {
      // Pieces on the Summit Apex are at the highest point and cannot be occluded by the pyramid
      if (isSummitTile(boardType, p.position.x, p.position.y)) {
        return;
      }

      const fullH = getPieceFullHeight(p.type);

      // 2-point sample (lower body & top crown) for fast, lag-free occlusion detection
      const samplePoints: THREE.Vector3[] = [
        basePos.clone().add(new THREE.Vector3(0, 0.28, 0)), // Lower body
        basePos.clone().add(new THREE.Vector3(0, fullH * 0.88, 0)), // Crown / top finial
      ];

      let blockedSamples = 0;

      for (const samplePt of samplePoints) {
        const dir = new THREE.Vector3().subVectors(samplePt, camPos);
        const distToSample = dir.length();
        if (distToSample < 0.2) continue;
        dir.normalize();

        sampleRay.set(camPos, dir);
        const hits = sampleRay.intersectObjects(terrainMeshes, false);

        const isSampleBlocked = hits.some((h) => {
          if (!h.object.userData?.isPyramidTerrain) return false;
          const ud = h.object.userData;
          const isSameTile =
            ud.tileX === p.position.x &&
            ud.tileY === p.position.y &&
            Boolean(ud.isVerticalWall) === Boolean(p.position.isVerticalWall);
          // Ignore self-tile grazed near the piece base; any other pyramid terrace/wall in front obscures the piece
          const clearanceThreshold = isSameTile ? 0.55 : 0.18;
          return h.distance < distToSample - clearanceThreshold;
        });

        if (isSampleBlocked) {
          blockedSamples++;
        }
      }

      // Rule 21: Full piece clearly visible -> Beacon OFF!
      // Piece partially hidden (1..4 samples blocked) or completely hidden (5 samples blocked) -> Beacon ON!
      if (blockedSamples === 0) {
        return;
      }

      const isOccluded = true;
      const occlusionLevel: 'full' | 'partial' =
        blockedSamples >= samplePoints.length ? 'full' : 'partial';

      // Rule 23: Preserve the Stacked Elevation Row System when beacons are needed
      const normDepth = Math.max(0, Math.min(1, (depthDist - minDepth) / depthRange));
      const cameraDepthTier = Math.min(3, Math.floor(normDepth * 4)); // 0: Near, 1: Mid-Near, 2: Mid-Far, 3: Far
      // Combine actual piece elevation tier (0..3) with camera depth tier so rows reflect elevation & depth
      const depthTier = Math.min(3, Math.max(p.position.tier, cameraDepthTier));
      const depthRowOffset = depthTier * 0.95;

      // Flag Top Y = Pyramid Clearance + Depth Row Offset
      // Pole Length = Flag Top Y - Piece Elevation
      const flagTopWorldY = baseClearance + depthRowOffset;
      const poleHeight3D = flagTopWorldY - anchorPos.y;
      const flagWorldPos = new THREE.Vector3(basePos.x, flagTopWorldY, basePos.z);

      const isKing = p.type === 'king';
      const isSelected = selectedPiece?.id === p.id;
      const isActiveMover = p.color === currentTurn && (p.id === focusPieceId || isSelected);

      const isTarget =
        (selectedPiece &&
          validMoves.some(
            (m) =>
              m.isCapture &&
              (m.capturedPieceId === p.id ||
                (m.to.x === p.position.x &&
                  m.to.y === p.position.y &&
                  (m.to.isVerticalWall ? !!p.position.isVerticalWall : !p.position.isVerticalWall)))
          )) ||
        (tacticalLine &&
          tacticalLine.to.x === p.position.x &&
          tacticalLine.to.y === p.position.y &&
          (tacticalLine.to.isVerticalWall ? !!p.position.isVerticalWall : !p.position.isVerticalWall));

      let priority = 2;
      let status: PieceBeaconInfo['status'] = 'hidden';

      if (isKing && p.color === currentTurn) {
        status = 'in_check';
        priority = 1;
      } else if (isSelected) {
        status = 'selected';
        priority = 1;
      } else if (isActiveMover) {
        status = 'active_mover';
        priority = 1;
      } else if (isTarget) {
        status = 'target';
        priority = 1;
      } else {
        status = 'hidden';
        priority = 2;
      }

      // Project anchor point (on piece) and flag top (above Pyramid)
      const projAnchor = anchorPos.clone().project(camera);
      const anchorX = (projAnchor.x * 0.5 + 0.5) * width;
      const anchorY = (-projAnchor.y * 0.5 + 0.5) * height;

      const projFlag = flagWorldPos.clone().project(camera);
      // Lock horizontal coordinate to anchorX so the beacon pole rises straight vertically
      const screenX = anchorX;
      const screenY = (-projFlag.y * 0.5 + 0.5) * height;

      if (projFlag.z < 1) {
        const tierLabel = p.position.isVerticalWall
          ? `Cliff Wall`
          : p.position.tier > 0
          ? `Tier ${p.position.tier}`
          : `Lower Plain`;

        detectedBeacons.push({
          piece: p,
          screenX,
          screenY,
          anchorX,
          anchorY,
          isOccluded,
          occlusionLevel,
          status,
          priority,
          poleHeight3D,
          depthTier,
          worldFlagY: flagTopWorldY,
          worldPieceY: anchorPos.y,
          label: `${p.color.toUpperCase()} ${p.type.toUpperCase()} · ${tierLabel}`,
        });
      }
    });

    const nextSignature =
      detectedBeacons.length === 0
        ? 'EMPTY'
        : detectedBeacons
            .map(
              (b) =>
                `${b.piece.id}:${b.status}:${b.occlusionLevel}:${Math.round(b.screenX)},${Math.round(b.screenY)},${Math.round(b.anchorX ?? 0)},${Math.round(b.anchorY ?? 0)}`
            )
            .join('|');

    if (nextSignature !== lastBeaconsSignatureRef.current) {
      lastBeaconsSignatureRef.current = nextSignature;
      emitBeacons(detectedBeacons);
    }
  }, [
    pieces,
    currentTurn,
    selectedPiece,
    validMoves,
    tacticalLine,
    focusPieceId,
    visibilitySettings?.hiddenPieceBeacons,
    visibilitySettings?.beaconSide,
    boardType,
    getTileWorldPosition,
  ]);

  // Rule 22: React to state changes without running a heavy 50ms raycast polling loop
  useEffect(() => {
    updateBeacons();
  }, [updateBeacons]);

  // Trigger beacon & transparency updates when camera preset or vertical wall side changes
  useEffect(() => {
    updateLineOfSightTransparency();
    updateBeacons();
  }, [
    cameraPreset,
    cameraPresetTrigger,
    verticalWallSide,
    isCameraOnSideRoll,
    boardType,
    updateLineOfSightTransparency,
    updateBeacons,
  ]);

  // =========================================================================
  // CAMERA ASSISTANCE:
  // - Human Play (human_vs_ai / human_vs_human): NEVER moves camera when selecting,
  //   touching, lifting, or hovering a piece! Only switches camera to the active side
  //   AFTER a move has been placed (when turn changes), and switches back after the
  //   other side plays.
  // - AI vs AI Mode: Smoothly focuses active AI move when Auto-Focus is ON.
  // - Manual Beacon / History Click: Always focuses the requested piece.
  // =========================================================================
  const lastManualFocusTriggerRef = useRef(0);
  const prevTurnForCameraRef = useRef<PieceColor>(currentTurn);
  const prevLastMoveForCameraRef = useRef<Move | null>(lastMove);

  const animateCameraToTheta = useCallback(
    (targetTheta: number) => {
      if (!cameraRef.current) return;
      stopActiveCameraAnimation();

      let step = 0;
      const initialTheta = cameraThetaRef.current;
      let diff = targetTheta - initialTheta;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) < 0.02) return;

      cameraAnimIntervalRef.current = setInterval(() => {
        if (isRotatingRef.current || isDraggingRef.current) {
          stopActiveCameraAnimation();
          return;
        }
        step += 0.08;
        if (step >= 1) {
          cameraThetaRef.current = targetTheta;
          updateCameraPosition();
          updateLineOfSightTransparency();
          updateBeacons();
          stopActiveCameraAnimation();
        } else {
          cameraThetaRef.current = initialTheta + diff * Math.sin((step * Math.PI) / 2);
          updateCameraPosition();
        }
      }, 16);
    },
    [stopActiveCameraAnimation, updateCameraPosition, updateLineOfSightTransparency, updateBeacons]
  );

  // 1. Explicit Manual Beacon / Piece Focus Click (works in all modes)
  useEffect(() => {
    if (!cameraRef.current) return;
    const isManualBeaconClick =
      manualFocusTrigger > 0 && manualFocusTrigger !== lastManualFocusTriggerRef.current;
    if (!isManualBeaconClick) return;
    lastManualFocusTriggerRef.current = manualFocusTrigger;

    const targetPiece = focusPieceId ? pieces.find((p) => p.id === focusPieceId) : null;
    if (!targetPiece) return;

    const dx = targetPiece.position.x - halfBoard + 0.5;
    const dz = targetPiece.position.y - halfBoard + 0.5;
    const targetTheta =
      Math.hypot(dx, dz) < 0.4 ? cameraThetaRef.current + 0.45 : Math.atan2(dx, dz) + 0.25;
    animateCameraToTheta(targetTheta);
  }, [manualFocusTrigger, focusPieceId, pieces, halfBoard, animateCameraToTheta]);

  // 2. Human Play Turn-Side Camera Switch:
  //    ONLY switches camera to the other side AFTER a move has been placed (never when touching/selecting a piece!)
  useEffect(() => {
    const turnChanged = prevTurnForCameraRef.current !== currentTurn;
    const movePlaced = lastMove !== null && lastMove !== prevLastMoveForCameraRef.current;
    prevTurnForCameraRef.current = currentTurn;
    prevLastMoveForCameraRef.current = lastMove;

    if (playerMode === 'ai_vs_ai') return;
    if (!visibilitySettings?.focusCameraOnActiveMove) return;
    if (cameraPreset === 'top_down' || cameraPreset === 'vertical_side') return;

    if (turnChanged && movePlaced) {
      // Switch camera to the side whose turn it now is (White = Math.PI South, Black = 0 North)
      const targetSideTheta = currentTurn === 'white' ? Math.PI : 0;
      animateCameraToTheta(targetSideTheta);
    }
  }, [
    currentTurn,
    lastMove,
    playerMode,
    visibilitySettings?.focusCameraOnActiveMove,
    cameraPreset,
    animateCameraToTheta,
  ]);

  // 3. AI vs AI Spectator Mode Auto-Focus ( strictly disabled whenever humans are playing! )
  useEffect(() => {
    if (playerMode !== 'ai_vs_ai') return;
    if (!visibilitySettings?.focusCameraOnActiveMove) return;
    if (cameraPreset === 'top_down' || cameraPreset === 'vertical_side') return;

    let focusX: number | null = null;
    let focusY: number | null = null;

    if (tacticalLine) {
      focusX = (tacticalLine.from.x + tacticalLine.to.x) * 0.5;
      focusY = (tacticalLine.from.y + tacticalLine.to.y) * 0.5;
    } else if (lastMove) {
      focusX = lastMove.to.x;
      focusY = lastMove.to.y;
    }

    if (focusX === null || focusY === null) return;

    const dx = focusX - halfBoard + 0.5;
    const dz = focusY - halfBoard + 0.5;
    let targetTheta: number;

    if (Math.hypot(dx, dz) < 0.4) {
      if (tacticalLine) {
        targetTheta =
          Math.atan2(
            tacticalLine.to.x - tacticalLine.from.x,
            tacticalLine.to.y - tacticalLine.from.y
          ) + 0.35;
      } else if (lastMove) {
        targetTheta =
          Math.atan2(lastMove.to.x - lastMove.from.x, lastMove.to.y - lastMove.from.y) + 0.35;
      } else {
        targetTheta = cameraThetaRef.current + 0.45;
      }
    } else {
      targetTheta = Math.atan2(dx, dz) + 0.25;
    }

    animateCameraToTheta(targetTheta);
  }, [
    playerMode,
    visibilitySettings?.focusCameraOnActiveMove,
    cameraPreset,
    tacticalLine,
    lastMove,
    halfBoard,
    animateCameraToTheta,
  ]);

  // Tactical target line rendering
  useEffect(() => {
    if (!tacticalLineGroupRef.current) return;
    const group = tacticalLineGroupRef.current;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!tacticalLine) return;

    const start = getTileWorldPosition(
      tacticalLine.from.x,
      tacticalLine.from.y,
      tacticalLine.from.tier,
      tacticalLine.from.isVerticalWall,
      tacticalLine.from.wallDirection,
      tacticalLine.from.wallTierStep
    );

    const end = getTileWorldPosition(
      tacticalLine.to.x,
      tacticalLine.to.y,
      tacticalLine.to.tier,
      tacticalLine.to.isVerticalWall,
      tacticalLine.to.wallDirection,
      tacticalLine.to.wallTierStep
    );

    const isProminent = tacticalLine.isProminent ?? true;
    const arcHeight = isProminent ? 2.6 : 1.6;
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      Math.max(start.y, end.y) + arcHeight,
      (start.z + end.z) / 2
    );

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const lineColor = tacticalLine.color || (isProminent ? 0xfbbf24 : 0x38bdf8);

    if (isProminent) {
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.08, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: lineColor,
        emissive: lineColor,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      group.add(tubeMesh);

      const ringGeo = new THREE.RingGeometry(0.35, 0.48, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: lineColor, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(end.x, end.y + 0.06, end.z);
      group.add(ringMesh);

      const arrowGeo = new THREE.ConeGeometry(0.2, 0.45, 16);
      const arrowMat = new THREE.MeshStandardMaterial({
        color: lineColor,
        emissive: lineColor,
        emissiveIntensity: 0.7,
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      arrowMesh.position.set(end.x, end.y + 0.5, end.z);
      arrowMesh.rotation.x = Math.PI;
      group.add(arrowMesh);
    } else {
      const points = curve.getPoints(36);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineDashedMaterial({
        color: lineColor,
        dashSize: 0.5,
        gapSize: 0.25,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      group.add(line);
    }
  }, [tacticalLine, boardType, getTileWorldPosition]);

  // Combat clash animation (Lunges attacker to target tile and sends attacking loser back to original tile)
  useEffect(() => {
    if (!clashingPieces || !sceneRef.current) return;
    const { attackerId, defenderId, damageText, attackerReturned, fromPos, toPos } = clashingPieces;
    const attackerMesh = pieceMeshesRef.current.get(attackerId);
    const defenderMesh = pieceMeshesRef.current.get(defenderId);

    const origAttackerPos = fromPos
      ? getTileWorldPosition(
          fromPos.x,
          fromPos.y,
          fromPos.tier,
          fromPos.isVerticalWall,
          fromPos.wallDirection,
          fromPos.wallTierStep
        )
      : attackerMesh
      ? attackerMesh.position.clone()
      : new THREE.Vector3();

    const origDefenderPos = toPos
      ? getTileWorldPosition(
          toPos.x,
          toPos.y,
          toPos.tier,
          toPos.isVerticalWall,
          toPos.wallDirection,
          toPos.wallTierStep
        )
      : defenderMesh
      ? defenderMesh.position.clone()
      : new THREE.Vector3();

    let lungeInterval: NodeJS.Timeout | null = null;

    if (attackerMesh && defenderMesh) {
      // Stop any competing standard movement interpolation so clash lunge + return is authoritative
      if (attackerReturned) {
        animatingPiecesRef.current.delete(attackerId);
      }

      let progress = 0;
      const clashPoint = new THREE.Vector3().lerpVectors(origAttackerPos, origDefenderPos, 0.82);

      lungeInterval = setInterval(() => {
        progress += 0.06;
        if (progress <= 0.45) {
          // Attacker lunges toward the defender's tile
          const t = progress / 0.45;
          attackerMesh.position.lerpVectors(origAttackerPos, clashPoint, t);
          attackerMesh.position.y += Math.sin(t * Math.PI) * 0.45;
        } else if (progress <= 1.0) {
          // If sent back, attacker rebounds all the way back to its original tile before it attacked
          const t = (progress - 0.45) / 0.55;
          if (attackerReturned) {
            attackerMesh.position.lerpVectors(clashPoint, origAttackerPos, t);
            attackerMesh.position.y += Math.sin(t * Math.PI) * 0.55;
          }
          defenderMesh.position.copy(origDefenderPos);
        } else {
          if (attackerReturned) {
            attackerMesh.position.copy(origAttackerPos);
          }
          defenderMesh.position.copy(origDefenderPos);
          if (lungeInterval) clearInterval(lungeInterval);
        }
      }, 20);
    }

    if (damageText && sceneRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = damageText.includes('CRIT')
          ? '#f59e0b'
          : damageText.includes('DODGE') || damageText.includes('SENT BACK')
          ? '#38bdf8'
          : '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText(damageText, 160, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2.0, 0.8, 1);
        sprite.position.set(origDefenderPos.x, origDefenderPos.y + 1.8, origDefenderPos.z);
        sceneRef.current.add(sprite);

        floatingTextsRef.current.push({
          id: Math.random().toString(),
          sprite,
          velocityY: 0.02,
          life: 1.15,
        });
      }
    }

    return () => {
      if (lungeInterval) clearInterval(lungeInterval);
    };
  }, [clashingPieces, getTileWorldPosition]);

  // Dice roll & RPS 3D visual above the combat tile
  useEffect(() => {
    if (!diceRollVisual || !sceneRef.current) {
      if (diceMeshRef.current && sceneRef.current) {
        sceneRef.current.remove(diceMeshRef.current);
        diceMeshRef.current = null;
      }
      return;
    }

    const scene = sceneRef.current;
    if (diceMeshRef.current) scene.remove(diceMeshRef.current);

    const baseWorld = diceRollVisual.position
      ? getTileWorldPosition(
          diceRollVisual.position.x,
          diceRollVisual.position.y,
          diceRollVisual.position.tier,
          diceRollVisual.position.isVerticalWall,
          diceRollVisual.position.wallDirection,
          diceRollVisual.position.wallTierStep
        )
      : new THREE.Vector3(0, 4.5, 0);

    if (!diceRollVisual.rpsText) {
      const diceGeo = new THREE.IcosahedronGeometry(0.46);
      const diceMat = new THREE.MeshStandardMaterial({
        color: diceRollVisual.isAttacker ? 0xf59e0b : 0x3b82f6,
        metalness: 0.55,
        roughness: 0.2,
        emissive: diceRollVisual.isAttacker ? 0x92400e : 0x1e3a8a,
      });
      const diceMesh = new THREE.Mesh(diceGeo, diceMat);
      diceMesh.position.set(baseWorld.x, baseWorld.y + 2.5, baseWorld.z);
      scene.add(diceMesh);
      diceMeshRef.current = diceMesh;
    }

    // Spawn 3D floating D20 Roll or RPS Clash Banner Sprite right over the battle tile
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 320;
    badgeCanvas.height = 96;
    const bCtx = badgeCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      bCtx.strokeStyle = diceRollVisual.rpsText ? '#fbbf24' : '#f59e0b';
      bCtx.lineWidth = 4;
      bCtx.beginPath();
      bCtx.roundRect(8, 12, 304, 72, 20);
      bCtx.fill();
      bCtx.stroke();

      bCtx.font = 'bold 30px monospace';
      bCtx.fillStyle = '#fef08a';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      const labelText = diceRollVisual.rpsText
        ? diceRollVisual.rpsText
        : `🎲${diceRollVisual.roll} vs 🎲${diceRollVisual.defenderRoll ?? 10}`;
      bCtx.fillText(labelText, 160, 48);

      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const badgeMat = new THREE.SpriteMaterial({
        map: badgeTex,
        transparent: true,
        depthTest: false,
      });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.scale.set(2.1, 0.65, 1);
      badgeSprite.position.set(baseWorld.x, baseWorld.y + 3.25, baseWorld.z);
      scene.add(badgeSprite);

      floatingTextsRef.current.push({
        id: `roll_${Date.now()}`,
        sprite: badgeSprite,
        velocityY: 0.008,
        life: 1.35,
      });
    }

    const timer = setTimeout(() => {
      if (diceMeshRef.current && sceneRef.current) {
        sceneRef.current.remove(diceMeshRef.current);
        diceMeshRef.current = null;
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [diceRollVisual, getTileWorldPosition]);

  // =========================================================================
  // POINTER EVENT HANDLERS: GUARANTEED PIECE PLACEMENT & LEGAL MOVES
  // =========================================================================
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    previousPointerRef.current = { x: e.clientX, y: e.clientY };

    // Right-click or middle-click or Alt+click: Rotate board
    if (e.button === 2 || e.button === 1 || e.altKey) {
      isRotatingRef.current = true;
      return;
    }

    // Left-click raycast
    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // 1. Direct Click on a Legal Move Indicator Dot or Capture Ring (only when a piece is selected)
    if (selectedPiece && indicatorGroupRef.current) {
      const indHits = raycasterRef.current.intersectObjects(
        indicatorGroupRef.current.children,
        true
      );
      if (indHits.length > 0) {
        let cur: THREE.Object3D | null = indHits[0].object;
        while (cur && !cur.userData?.isMoveIndicator) {
          cur = cur.parent;
        }
        if (cur && cur.userData?.move) {
          const candMove: Move = cur.userData.move;
          if (candMove.isRookExchange) {
            const partner = pieces.find((p) => p.id === candMove.exchangePartnerId && p.rpg.hp > 0);
            if (
              selectedPiece.type !== 'vanguard' ||
              !partner ||
              partner.type !== 'rook' ||
              partner.color !== selectedPiece.color
            ) {
              return;
            }
          }
          onMoveExecute(candMove);
          return;
        }
      }
    }

    // 2. Click Piece (Select friendly piece or target enemy piece)
    const pieceGroups = Array.from(pieceMeshesRef.current.values());
    const pieceIntersects = raycasterRef.current.intersectObjects(pieceGroups, true);

    if (pieceIntersects.length > 0) {
      let currentObj: THREE.Object3D | null = pieceIntersects[0].object;
      while (currentObj && !currentObj.userData.pieceId) {
        currentObj = currentObj.parent;
      }

      if (currentObj && currentObj.userData.pieceId) {
        const piece = pieces.find((p) => p.id === currentObj?.userData.pieceId);
        if (piece) {
          if (piece.color === currentTurn) {
            // Check if clicking friendly Rook is a legal Vanguard Rook Exchange (strictly Vanguard -> own team's Rook only)
            if (
              selectedPiece &&
              selectedPiece.id !== piece.id &&
              selectedPiece.type === 'vanguard' &&
              piece.type === 'rook' &&
              piece.color === selectedPiece.color
            ) {
              const exchangeMove = validMoves.find(
                (m) => m.isRookExchange && m.exchangePartnerId === piece.id
              );
              if (exchangeMove) {
                onMoveExecute(exchangeMove);
                return;
              }
            }
            isDraggingRef.current = true;
            draggedPieceRef.current = piece;
            onPieceSelect(piece);
            return;
          } else if (selectedPiece) {
            // Check if clicking enemy piece is a legal capture or Trebuchet Bombardment knockback
            const capMove = validMoves.find(
              (m) =>
                (m.isCapture || m.isBombard) &&
                (m.capturedPieceId === piece.id ||
                  (m.to.x === piece.position.x &&
                    m.to.y === piece.position.y &&
                    (m.to.isVerticalWall ? !!piece.position.isVerticalWall : !piece.position.isVerticalWall)))
            );
            if (capMove) {
              onMoveExecute(capMove);
              return;
            }
          }
        }
      }
    }
  }, [pieces, currentTurn, selectedPiece, validMoves, onMoveExecute, onPieceSelect]);

  const emitHoveredDestIfChanged = useCallback((move: Move | null) => {
    const nextKey = move
      ? `${move.pieceId}:${move.to.x},${move.to.y},${!!move.to.isVerticalWall},${move.to.wallDirection || ''}`
      : 'none';
    if (nextKey !== lastHoveredDestKeyRef.current) {
      lastHoveredDestKeyRef.current = nextKey;
      setHoveredDestMove(move);
    }
  }, []);

  const computePieceTargetQuaternion = useCallback((piece: Piece, pos: Position): THREE.Quaternion => {
    const targetEuler = new THREE.Euler();
    if (pos.isVerticalWall) {
      if (pos.wallDirection === 'south') {
        targetEuler.set(-Math.PI / 2, 0, 0);
      } else if (pos.wallDirection === 'north') {
        targetEuler.set(-Math.PI / 2, 0, Math.PI);
      } else if (pos.wallDirection === 'west') {
        targetEuler.set(-Math.PI / 2, 0, Math.PI / 2);
      } else {
        targetEuler.set(-Math.PI / 2, 0, -Math.PI / 2);
      }
    } else {
      const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
      let rotY = 0;
      if (facing === 'north') rotY = 0;
      else if (facing === 'south') rotY = Math.PI;
      else if (facing === 'east') rotY = Math.PI / 2;
      else if (facing === 'west') rotY = -Math.PI / 2;
      targetEuler.set(0, rotY, 0);
    }
    return new THREE.Quaternion().setFromEuler(targetEuler);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const now = performance.now();

    // Orbit rotation (roll-aware so dragging in 90° On-Side Vertical Wall mode orbits naturally)
    if (isRotatingRef.current) {
      stopActiveCameraAnimation();
      const dx = e.clientX - previousPointerRef.current.x;
      const dy = e.clientY - previousPointerRef.current.y;
      previousPointerRef.current = { x: e.clientX, y: e.clientY };

      const roll = cameraRollRef.current;
      const effDx = dx * Math.cos(roll) - dy * Math.sin(roll);
      const effDy = dx * Math.sin(roll) + dy * Math.cos(roll);

      cameraThetaRef.current -= effDx * 0.007;
      cameraPhiRef.current = Math.max(0.08, Math.min(Math.PI * 0.49, cameraPhiRef.current - effDy * 0.007));
      updateCameraPosition();

      // Throttle expensive line-of-sight & beacon raycasts during continuous drag rotation
      if (now - lastCamUpdateTimeRef.current > 90) {
        lastCamUpdateTimeRef.current = now;
        updateLineOfSightTransparency();
        updateBeacons();
      }
      return;
    }

    // Dragging piece visual update (supports snapping & 3D orientation on BOTH horizontal tiles and vertical cliff walls!)
    if (isDraggingRef.current && draggedPieceRef.current && containerRef.current && cameraRef.current) {
      stopActiveCameraAnimation();
      const draggedPiece = draggedPieceRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      mouseRef.current.set(x, y);
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const mesh = pieceMeshesRef.current.get(draggedPiece.id);

      // 1. Check if pointer is over a legal move indicator (including on vertical walls!)
      let matchedLegalMove: Move | null = null;
      if (indicatorGroupRef.current) {
        const indHits = raycasterRef.current.intersectObjects(
          indicatorGroupRef.current.children,
          true
        );
        if (indHits.length > 0) {
          let cur: THREE.Object3D | null = indHits[0].object;
          while (cur && !cur.userData?.isMoveIndicator) {
            cur = cur.parent;
          }
          if (cur && cur.userData?.move) {
            matchedLegalMove = cur.userData.move as Move;
          }
        }
      }

      // 2. Check 3D board tiles & vertical cliff walls
      const tileIntersects = raycasterRef.current.intersectObjects(tileMeshesRef.current);
      const hitTile = tileIntersects.find(
        (h) => h.object.userData && h.object.userData.tileX !== undefined
      );

      if (!matchedLegalMove && hitTile) {
        const ud = hitTile.object.userData;
        matchedLegalMove =
          validMoves.find((m) => {
            if (m.to.x !== ud.tileX || m.to.y !== ud.tileY) return false;
            if (ud.isVerticalWall) {
              return (
                !!m.to.isVerticalWall &&
                (!ud.wallDirection || m.to.wallDirection === ud.wallDirection)
              );
            }
            return !m.to.isVerticalWall;
          }) || null;
      }

      if (matchedLegalMove) {
        emitHoveredDestIfChanged(matchedLegalMove);
        if (mesh) {
          const snapPos = getTileWorldPosition(
            matchedLegalMove.to.x,
            matchedLegalMove.to.y,
            matchedLegalMove.to.tier,
            matchedLegalMove.to.isVerticalWall,
            matchedLegalMove.to.wallDirection,
            matchedLegalMove.to.wallTierStep
          );
          mesh.position.copy(snapPos);
          mesh.quaternion.copy(computePieceTargetQuaternion(draggedPiece, matchedLegalMove.to));
        }
        return;
      }

      emitHoveredDestIfChanged(null);

      // If over any 3D board surface/wall (even if not a legal move), follow the 3D surface instead of sinking to y=0
      if (hitTile && mesh) {
        const ud = hitTile.object.userData;
        const hoverPos = getTileWorldPosition(
          ud.tileX,
          ud.tileY,
          ud.tier,
          ud.isVerticalWall,
          ud.wallDirection,
          ud.wallTierStep
        );
        if (ud.isVerticalWall) {
          mesh.position.copy(hoverPos);
          mesh.quaternion.copy(
            computePieceTargetQuaternion(draggedPiece, {
              x: ud.tileX,
              y: ud.tileY,
              tier: ud.tier ?? 0,
              isVerticalWall: true,
              wallDirection: ud.wallDirection,
              wallTierStep: ud.wallTierStep,
            })
          );
        } else {
          mesh.position.set(hoverPos.x, hoverPos.y + 0.55, hoverPos.z);
          mesh.quaternion.copy(
            computePieceTargetQuaternion(draggedPiece, {
              x: ud.tileX,
              y: ud.tileY,
              tier: ud.tier ?? 0,
              isVerticalWall: false,
            })
          );
        }
        return;
      }

      // Fallback plane at the piece's own authoritative tile elevation
      const fallbackTier = draggedPiece.position.isVerticalWall
        ? draggedPiece.position.wallTierStep || 1
        : getTileTier(boardType, draggedPiece.position.x, draggedPiece.position.y);
      const fallbackHeight = TIER_HEIGHTS[fallbackTier] || 0;
      dragPlaneRef.current.constant = -fallbackHeight;
      const intersectionPoint = new THREE.Vector3();
      if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPoint) && mesh) {
        mesh.position.set(intersectionPoint.x, fallbackHeight + 0.8, intersectionPoint.z);
        mesh.quaternion.copy(computePieceTargetQuaternion(draggedPiece, draggedPiece.position));
      }
      return;
    }

    // Throttle hover preview raycast when idle (max ~20Hz instead of 120Hz) and deduplicate callbacks!
    if (
      !isDraggingRef.current &&
      !isRotatingRef.current &&
      containerRef.current &&
      cameraRef.current
    ) {
      if (now - lastHoverRaycastTimeRef.current < 48) {
        return;
      }
      lastHoverRaycastTimeRef.current = now;

      const emitHoverIfChanged = (p: Piece | null, t: Piece | null) => {
        if (!onPieceHover) return;
        const nextKey = `${p?.id || 'none'}:${t?.id || 'none'}`;
        if (nextKey !== lastHoveredKeyRef.current) {
          lastHoveredKeyRef.current = nextKey;
          onPieceHover(p, t);
        }
      };

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      mouseRef.current.set(x, y);
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const activeMoves = selectedPiece ? validMoves : hoverMoves;
      const activeAttacker =
        selectedPiece ||
        (hoverMoves.length > 0 ? pieces.find((p) => p.id === hoverMoves[0].pieceId) || null : null);

      // 1. Check if hovering directly over a legal move indicator (including on vertical cliff walls!)
      if (selectedPiece && indicatorGroupRef.current) {
        const indHits = raycasterRef.current.intersectObjects(
          indicatorGroupRef.current.children,
          true
        );
        if (indHits.length > 0) {
          let cur: THREE.Object3D | null = indHits[0].object;
          while (cur && !cur.userData?.isMoveIndicator) {
            cur = cur.parent;
          }
          if (cur && cur.userData?.move) {
            const indMove = cur.userData.move as Move;
            emitHoveredDestIfChanged(indMove);
            if (indMove.isCapture) {
              const enemyPiece = pieces.find(
                (p) =>
                  p.id === indMove.capturedPieceId ||
                  (p.position.x === indMove.to.x &&
                    p.position.y === indMove.to.y &&
                    p.color !== selectedPiece.color &&
                    p.rpg.hp > 0 &&
                    (indMove.to.isVerticalWall
                      ? !!p.position.isVerticalWall &&
                        (!indMove.to.wallDirection || p.position.wallDirection === indMove.to.wallDirection)
                      : !p.position.isVerticalWall))
              );
              if (enemyPiece) {
                emitHoverIfChanged(selectedPiece, enemyPiece);
                return;
              }
            }
            emitHoverIfChanged(selectedPiece, null);
            return;
          }
        }
      }

      // 2. Check pieces for hover
      const pieceGroups = Array.from(pieceMeshesRef.current.values());
      const pieceIntersects = raycasterRef.current.intersectObjects(pieceGroups, true);

      if (pieceIntersects.length > 0) {
        let currentObj: THREE.Object3D | null = pieceIntersects[0].object;
        while (currentObj && !currentObj.userData.pieceId) {
          currentObj = currentObj.parent;
        }

        if (currentObj && currentObj.userData.pieceId) {
          const hoveredTarget = pieces.find((p) => p.id === currentObj?.userData.pieceId);
          if (hoveredTarget) {
            if (selectedPiece) {
              if (hoveredTarget.color !== selectedPiece.color) {
                const matchingCapMove = validMoves.find(
                  (m) =>
                    (m.isCapture || m.isBombard) &&
                    (m.capturedPieceId === hoveredTarget.id ||
                      (m.to.x === hoveredTarget.position.x &&
                        m.to.y === hoveredTarget.position.y &&
                        (m.to.isVerticalWall
                          ? !!hoveredTarget.position.isVerticalWall &&
                            (!m.to.wallDirection ||
                              hoveredTarget.position.wallDirection === m.to.wallDirection)
                          : !hoveredTarget.position.isVerticalWall)))
                );
                if (matchingCapMove) {
                  emitHoveredDestIfChanged(matchingCapMove);
                  emitHoverIfChanged(selectedPiece, hoveredTarget);
                } else {
                  emitHoveredDestIfChanged(null);
                  emitHoverIfChanged(hoveredTarget, null);
                }
              } else {
                const exchangeMove = validMoves.find(
                  (m) => m.isRookExchange && m.exchangePartnerId === hoveredTarget.id
                );
                emitHoveredDestIfChanged(exchangeMove || null);
                emitHoverIfChanged(hoveredTarget, null);
              }
              return;
            } else {
              emitHoveredDestIfChanged(null);
              emitHoverIfChanged(hoveredTarget, null);
              return;
            }
          }
        }
      }

      // 3. Check if hovering any legal destination tile or vertical wall face
      if (activeAttacker && activeMoves.length > 0) {
        const tileIntersects = raycasterRef.current.intersectObjects(tileMeshesRef.current);
        const hitTile = tileIntersects.find(
          (h) => h.object.userData && h.object.userData.tileX !== undefined
        );

        if (hitTile) {
          const ud = hitTile.object.userData;
          const destMove = activeMoves.find((m) => {
            if (m.to.x !== ud.tileX || m.to.y !== ud.tileY) return false;
            if (ud.isVerticalWall) {
              return (
                !!m.to.isVerticalWall &&
                (!ud.wallDirection || m.to.wallDirection === ud.wallDirection)
              );
            }
            return !m.to.isVerticalWall;
          });

          if (destMove) {
            emitHoveredDestIfChanged(destMove);
            if (destMove.isCapture) {
              const enemyPiece = pieces.find(
                (p) =>
                  p.id === destMove.capturedPieceId ||
                  (p.position.x === ud.tileX &&
                    p.position.y === ud.tileY &&
                    p.color !== activeAttacker.color &&
                    p.rpg.hp > 0 &&
                    (ud.isVerticalWall
                      ? !!p.position.isVerticalWall &&
                        (!ud.wallDirection || p.position.wallDirection === ud.wallDirection)
                      : !p.position.isVerticalWall))
              );
              if (enemyPiece) {
                emitHoverIfChanged(activeAttacker, enemyPiece);
                return;
              }
            }
            if (selectedPiece) {
              emitHoverIfChanged(selectedPiece, null);
            }
            return;
          }
        }
      }

      emitHoveredDestIfChanged(null);
      emitHoverIfChanged(null, null);
    }
  }, [
    pieces,
    selectedPiece,
    validMoves,
    hoverMoves,
    onPieceHover,
    emitHoveredDestIfChanged,
    computePieceTargetQuaternion,
    getTileWorldPosition,
    stopActiveCameraAnimation,
    updateCameraPosition,
    updateLineOfSightTransparency,
    updateBeacons,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const movedDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    const wasActualDrag = isDraggingRef.current && draggedPieceRef.current && movedDist >= 6;
    const draggedPiece = draggedPieceRef.current;
    isDraggingRef.current = false;
    draggedPieceRef.current = null;
    emitHoveredDestIfChanged(null);

    // Always snap dragged piece visual & orientation back to authoritative board position before move execution
    if (draggedPiece) {
      const mesh = pieceMeshesRef.current.get(draggedPiece.id);
      if (mesh) {
        const origPos = getTileWorldPosition(
          draggedPiece.position.x,
          draggedPiece.position.y,
          draggedPiece.position.tier,
          draggedPiece.position.isVerticalWall,
          draggedPiece.position.wallDirection,
          draggedPiece.position.wallTierStep
        );
        mesh.position.copy(origPos);
        mesh.quaternion.copy(computePieceTargetQuaternion(draggedPiece, draggedPiece.position));
      }
    }

    if (isRotatingRef.current) {
      isRotatingRef.current = false;
      return;
    }

    if (containerRef.current && cameraRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      mouseRef.current.set(x, y);
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // 1. PRIMARY CHECK: CLICK ON LEGAL MOVE INDICATOR (Dot or Capture Ring)
      // This guarantees that clicking any highlighted destination ALWAYS places the selected piece!
      if (selectedPiece && indicatorGroupRef.current) {
        const indHits = raycasterRef.current.intersectObjects(
          indicatorGroupRef.current.children,
          true
        );
        if (indHits.length > 0) {
          let cur: THREE.Object3D | null = indHits[0].object;
          while (cur && !cur.userData?.isMoveIndicator) {
            cur = cur.parent;
          }
          if (cur && cur.userData?.move) {
            const candMove: Move = cur.userData.move;
            if (candMove.isRookExchange) {
              const partner = pieces.find((p) => p.id === candMove.exchangePartnerId && p.rpg.hp > 0);
              if (
                selectedPiece.type !== 'vanguard' ||
                !partner ||
                partner.type !== 'rook' ||
                partner.color !== selectedPiece.color
              ) {
                return;
              }
            }
            onMoveExecute(candMove);
            return;
          }
        }
      }

      // 2. SECONDARY CHECK: CLICK ON PIECE
      const pieceGroups = Array.from(pieceMeshesRef.current.values());
      const pieceIntersects = raycasterRef.current.intersectObjects(pieceGroups, true);

      if (pieceIntersects.length > 0) {
        let currentObj: THREE.Object3D | null = pieceIntersects[0].object;
        while (currentObj && !currentObj.userData.pieceId) {
          currentObj = currentObj.parent;
        }

        if (currentObj && currentObj.userData.pieceId) {
          const piece = pieces.find((p) => p.id === currentObj?.userData.pieceId);
          if (piece) {
            if (piece.color === currentTurn) {
              // Check if clicking friendly Rook is a legal Vanguard Rook Exchange (strictly Vanguard -> own team's Rook only)
              if (
                selectedPiece &&
                selectedPiece.id !== piece.id &&
                selectedPiece.type === 'vanguard' &&
                piece.type === 'rook' &&
                piece.color === selectedPiece.color
              ) {
                const exchangeMove = validMoves.find(
                  (m) => m.isRookExchange && m.exchangePartnerId === piece.id
                );
                if (exchangeMove) {
                  onMoveExecute(exchangeMove);
                  return;
                }
              }
              onPieceSelect(piece);
              return;
            } else if (selectedPiece) {
              // Clicked enemy piece -> check legal capture or Trebuchet Bombardment knockback move
              const capMove = validMoves.find(
                (m) =>
                  (m.isCapture || m.isBombard) &&
                  (m.capturedPieceId === piece.id ||
                    (m.to.x === piece.position.x &&
                      m.to.y === piece.position.y &&
                      (m.to.isVerticalWall ? !!piece.position.isVerticalWall : !piece.position.isVerticalWall)))
              );
              if (capMove) {
                onMoveExecute(capMove);
                return;
              }
              onTileClick(
                piece.position.x,
                piece.position.y,
                piece.position.isVerticalWall,
                piece.position.wallDirection
              );
              return;
            }
          }
        }
      }

      // 3. TERTIARY CHECK: CLICK ON TILE SURFACE
      const tileIntersects = raycasterRef.current.intersectObjects(tileMeshesRef.current);
      const hitTile = tileIntersects.find(
        (h) => h.object.userData && h.object.userData.tileX !== undefined
      );

      if (hitTile) {
        const ud = hitTile.object.userData;

        if (selectedPiece) {
          // Check matching move in validMoves
          const matchMove = validMoves.find((m) => {
            if (m.to.x !== ud.tileX || m.to.y !== ud.tileY) return false;
            if (m.isRookExchange) {
              if (selectedPiece.type !== 'vanguard' || !m.exchangePartnerId) return false;
              const partner = pieces.find((p) => p.id === m.exchangePartnerId && p.rpg.hp > 0);
              if (!partner || partner.type !== 'rook' || partner.color !== selectedPiece.color) {
                return false;
              }
            }
            if (ud.isVerticalWall) {
              return !!m.to.isVerticalWall && (!ud.wallDirection || m.to.wallDirection === ud.wallDirection);
            }
            return !m.to.isVerticalWall;
          });

          if (matchMove) {
            onMoveExecute(matchMove);
            return;
          }
        }

        onTileClick(ud.tileX, ud.tileY, ud.isVerticalWall, ud.wallDirection);
      }
    }
  }, [
    pieces,
    currentTurn,
    selectedPiece,
    validMoves,
    getTileWorldPosition,
    computePieceTargetQuaternion,
    emitHoveredDestIfChanged,
    onMoveExecute,
    onPieceSelect,
    onTileClick,
  ]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    stopActiveCameraAnimation();
    cameraDistanceRef.current = Math.max(6, Math.min(95, cameraDistanceRef.current + e.deltaY * 0.025));
    updateCameraPosition();
    updateLineOfSightTransparency();
    updateBeacons();
  }, [stopActiveCameraAnimation, updateCameraPosition, updateLineOfSightTransparency, updateBeacons]);

  const handleZoomByStep = useCallback((delta: number) => {
    stopActiveCameraAnimation();
    cameraDistanceRef.current = Math.max(6, Math.min(95, cameraDistanceRef.current + delta));
    updateCameraPosition();
    updateLineOfSightTransparency();
    updateBeacons();
  }, [stopActiveCameraAnimation, updateCameraPosition, updateLineOfSightTransparency, updateBeacons]);

  const handleResetZoom = useCallback(() => {
    stopActiveCameraAnimation();
    const baseDist =
      boardType === 'classic' ? 19 : boardType === 'quick_pyramid' ? 26 : 40;
    cameraDistanceRef.current =
      cameraPreset === 'top_down'
        ? baseDist * 1.22
        : cameraPreset === 'vertical_side'
        ? baseDist * 0.88
        : cameraPreset === 'side_profile'
        ? baseDist * 1.08
        : baseDist;
    updateCameraPosition();
    updateLineOfSightTransparency();
    updateBeacons();
  }, [boardType, cameraPreset, stopActiveCameraAnimation, updateCameraPosition, updateLineOfSightTransparency, updateBeacons]);

  const handlePointerLeave = useCallback(() => {
    emitHoveredDestIfChanged(null);
    onPieceHover?.(null, null);
  }, [emitHoveredDestIfChanged, onPieceHover]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />

      {/* Dedicated On-Screen Zoom + Vertical Wall On-Side Controls */}
      <div className="absolute bottom-20 left-4 md:left-6 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800/90 shadow-xl">
          <button
            onClick={() => handleZoomByStep(-4)}
            title="Zoom In (+)"
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-slate-800 text-xs font-black transition-all"
          >
            + Zoom In
          </button>
          <button
            onClick={() => handleZoomByStep(4)}
            title="Zoom Out (-)"
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-800 text-xs font-black transition-all"
          >
            − Zoom Out
          </button>
          <button
            onClick={handleResetZoom}
            title="Fit Entire Board & Pieces in View"
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold transition-all"
          >
            Fit Board
          </button>
        </div>

        {/* Vertical Wall (On Side) Wall Face & 90° Roll Selector Pill */}
        {cameraPreset === 'vertical_side' && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/95 backdrop-blur-md border border-amber-500/50 shadow-xl">
            <span className="text-[10px] font-black uppercase text-amber-300 px-1.5">
              Vertical Wall:
            </span>
            {(
              [
                { id: 'south', label: 'South' },
                { id: 'east', label: 'East' },
                { id: 'north', label: 'North' },
                { id: 'west', label: 'West' },
              ] as const
            ).map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setVerticalWallSide(w.id);
                  applyVerticalWallSideCamera(w.id, isCameraOnSideRoll);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                  verticalWallSide === w.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
            <button
              onClick={() => {
                const nextRoll = !isCameraOnSideRoll;
                setIsCameraOnSideRoll(nextRoll);
                applyVerticalWallSideCamera(verticalWallSide, nextRoll);
              }}
              title="Toggle 90° On-Side Camera Roll (places camera on its side looking down onto the vertical wall)"
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                isCameraOnSideRoll
                  ? 'bg-sky-500/25 border-sky-400/60 text-sky-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {isCameraOnSideRoll ? '90° On-Side: ON' : '90° On-Side: OFF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
