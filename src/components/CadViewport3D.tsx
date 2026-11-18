import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  VARIANT_A_PARAMS,
  VARIANT_B_PARAMS,
  evaluateDiscInvariants,
} from '../data/deliverablesContent';
import { generateAssemblyOpenScad, generateDiscOpenScad } from '../generators/cadOpenScad';
import { downloadDiscStl, downloadHousingStl, downloadTextFile, triggerBlobDownload } from '../generators/bundleExporter';
import {
  createBrushedMetalTexture,
  createCalibrationBackdropTexture,
  createDiscNumberRingTexture,
  createHopperScaleTexture,
  createOledDisplayTexture,
  createTrashBinTexture,
  createWorkbenchTexture,
} from '../generators/proceduralTextures';
import { buildHousingPrintGroup, buildParametricDiscGroup } from '../generators/stlExporter';
import { DiscParams } from '../types/engineering';
import { MachineControllerState, PcOperatorConsole } from './PcOperatorConsole';

interface CadViewport3DProps {
  params: DiscParams;
  onChangeParams: (next: DiscParams) => void;
}

type CameraPreset = 'iso' | 'front' | 'section' | 'top';

interface LiveCameraEvent {
  uid: number;
  seq: number;
  cellIdx: number;
  cupLabel: string;
  outcome: '1' | '2+' | '0' | 'МУСОР';
  timestamp: string;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _bufSize = new THREE.Vector2();

const CUP_COUNT = 8;
const CUP_SPACING = 24;
const CAM_PANEL_W = 320;
const CAM_FEED_H = 216;

function createTslot2020Shape(): THREE.Shape {
  const s = new THREE.Shape();
  const h = 10;
  const g = 3.0;
  const d = 4.2;
  s.moveTo(-h, -h);
  s.lineTo(-g, -h);
  s.lineTo(-g, -h + d);
  s.lineTo(g, -h + d);
  s.lineTo(g, -h);
  s.lineTo(h, -h);

  s.lineTo(h, -g);
  s.lineTo(h - d, -g);
  s.lineTo(h - d, g);
  s.lineTo(h, g);
  s.lineTo(h, h);

  s.lineTo(g, h);
  s.lineTo(g, h - d);
  s.lineTo(-g, h - d);
  s.lineTo(-g, h);
  s.lineTo(-h, h);

  s.lineTo(-h, g);
  s.lineTo(-h + d, g);
  s.lineTo(-h + d, -g);
  s.lineTo(-h, -g);
  s.closePath();

  const bore = new THREE.Path();
  bore.absarc(0, 0, 2.5, 0, Math.PI * 2, true);
  s.holes.push(bore);
  return s;
}

function createCupNumberBadgeTexture(num: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(4, 4, 56, 56, 12);
  ctx.fill();
  ctx.strokeStyle = '#14B8A6';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 32px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const CadViewport3D: React.FC<CadViewport3DProps> = ({ params, onChangeParams }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const camFeedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [controllerState, setControllerState] = useState<MachineControllerState>('RUNNING');
  const [exploded, setExploded] = useState(0);
  const [showSection, setShowSection] = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [showCameraFeed, setShowCameraFeed] = useState(true);
  const [trashAutoMode, setTrashAutoMode] = useState(true);
  const [stressMode, setStressMode] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoveredPart, setHoveredPart] = useState<string>('Сменный ячеистый диск (PETG)');

  const [liveTelemetry, setLiveTelemetry] = useState({
    pulseCount: 0,
    activeCell: 1,
    activeCup: 1,
    cupFilled: Array(CUP_COUNT).fill(false) as boolean[],
    ledActive: false,
    laserAlert: false,
    singles: 0,
    doubles: 0,
    misses: 0,
    trash: 0,
    jamsCleared: 0,
  });
  const [cameraEvents, setCameraEvents] = useState<LiveCameraEvent[]>([]);
  const [serialLog, setSerialLog] = useState<string[]>([
    'BOOT_READY,STATE=IDLE,AUTOSTART=DISABLED',
    'START,rate_sps=2.00,revs=10 (Оператор нажал ПУСК)',
  ]);

  const appendSerial = (line: string) => {
    setSerialLog((prev) => [...prev.slice(-24), line]);
  };

  const invariants = useMemo(() => evaluateDiscInvariants(params), [params]);

  const stateRef = useRef({
    params,
    isRunning,
    exploded,
    showSection,
    showCover,
    showCameraFeed,
    trashAutoMode,
    stressMode,
  });
  stateRef.current.params = params;
  stateRef.current.isRunning = isRunning;
  stateRef.current.exploded = exploded;
  stateRef.current.showSection = showSection;
  stateRef.current.showCover = showCover;
  stateRef.current.showCameraFeed = showCameraFeed;
  stateRef.current.trashAutoMode = trashAutoMode;
  stateRef.current.stressMode = stressMode;

  const rebuildDiscRef = useRef<((p: DiscParams) => void) | null>(null);
  const applyPresetRef = useRef<((preset: CameraPreset) => void) | null>(null);
  const injectTrashRef = useRef<(() => void) | null>(null);
  const triggerJamRef = useRef<(() => void) | null>(null);
  const resetCupsRef = useRef<(() => void) | null>(null);
  const refreshOledRef = useRef<((p: DiscParams, running: boolean) => void) | null>(null);
  const eventUidRef = useRef(0);

  useEffect(() => {
    if (rebuildDiscRef.current) {
      rebuildDiscRef.current(params);
    }
  }, [
    params.outerDiameter,
    params.pitchDiameter,
    params.thickness,
    params.cellCount,
    params.cellDiameter,
    params.cellDepth,
    params.entryChamfer,
    params.shaftDiameter,
    params.printClearance,
  ]);

  useEffect(() => {
    refreshOledRef.current?.(params, isRunning);
  }, [params.targetRateSps, params.cellCount, isRunning]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglError('WebGL недоступен. Используйте 2D-чертежи во вкладке «Чертежи и Печать».');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 540;
    renderer.setSize(width, height);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('Контекст WebGL временно приостановлен.');
    };
    const handleContextRestored = () => setWebglError(null);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#DDE5EE');
    scene.fog = new THREE.Fog('#DDE5EE', 520, 1060);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // Primary Inspection Camera (framed so all 8 cups #1..#8 remain fully inside viewport)
    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1800);
    camera.position.set(172, 64, 385);

    // Secondary Machine-Vision Camera (placed cleanly at lens tip, facing discharge, laser, cups & reject branch)
    const inspectionCam = new THREE.PerspectiveCamera(40, CAM_PANEL_W / CAM_FEED_H, 1, 600);
    inspectionCam.position.set(22, -52, 92);
    inspectionCam.lookAt(8, -74, 16);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.target.set(10, -4, 6);
    controls.minDistance = 95;
    controls.maxDistance = 620;

    let cameraTargetGoal: THREE.Vector3 | null = null;
    let cameraPosGoal: THREE.Vector3 | null = null;
    controls.addEventListener('start', () => {
      cameraPosGoal = null;
      cameraTargetGoal = null;
    });

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight('#F0F9FF', '#64748B', 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.65);
    keyLight.position.set(170, 220, 180);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -200;
    keyLight.shadow.camera.right = 200;
    keyLight.shadow.camera.top = 200;
    keyLight.shadow.camera.bottom = -200;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#93C5FD', 0.85);
    rimLight.position.set(-180, 95, -160);
    scene.add(rimLight);

    // Procedural Textures
    const benchTex = createWorkbenchTexture(maxAnisotropy);
    const brushedTex = createBrushedMetalTexture();
    const backdropTex = createCalibrationBackdropTexture(maxAnisotropy);
    const hopperScaleTex = createHopperScaleTexture(maxAnisotropy);
    const trashBinTex = createTrashBinTexture(maxAnisotropy);
    const oled = createOledDisplayTexture(maxAnisotropy);

    const benchY = -126;
    const benchMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(760, 760),
      new THREE.MeshStandardMaterial({
        map: benchTex,
        roughness: 0.78,
        metalness: 0.05,
      })
    );
    benchMesh.rotation.x = -Math.PI / 2;
    benchMesh.position.y = benchY;
    benchMesh.receiveShadow = true;
    scene.add(benchMesh);

    const sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

    // Materials
    const discMat = new THREE.MeshStandardMaterial({
      color: '#0F766E',
      roughness: 0.34,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.62,
      metalness: 0.14,
      side: THREE.DoubleSide,
    });
    const aluminumMat = new THREE.MeshStandardMaterial({
      color: '#CBD5E1',
      roughness: 0.3,
      metalness: 0.86,
      bumpMap: brushedTex,
      bumpScale: 0.12,
    });
    const darkAnodizedMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.42,
      metalness: 0.68,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#E2E8F0',
      roughness: 0.2,
      metalness: 0.94,
      bumpMap: brushedTex,
      bumpScale: 0.08,
    });
    const hopperMat = new THREE.MeshPhysicalMaterial({
      color: '#BAE6FD',
      roughness: 0.14,
      metalness: 0.04,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coverMat = new THREE.MeshPhysicalMaterial({
      color: '#BAE6FD',
      roughness: 0.08,
      metalness: 0.04,
      transparent: true,
      opacity: isSoftwareGl ? 0.22 : 0.26,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cupGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#E0F2FE',
      roughness: 0.1,
      metalness: 0.04,
      transparent: true,
      opacity: isSoftwareGl ? 0.24 : 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const trashBinMat = new THREE.MeshPhysicalMaterial({
      color: '#FECACA',
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cutoffMat = new THREE.MeshStandardMaterial({
      color: '#D97706',
      roughness: 0.34,
      metalness: 0.24,
    });
    const pcbMat = new THREE.MeshStandardMaterial({
      color: '#15803D',
      roughness: 0.45,
      metalness: 0.12,
    });
    const bluePlasticMat = new THREE.MeshStandardMaterial({
      color: '#1D4ED8',
      roughness: 0.38,
      metalness: 0.18,
    });
    const redAccentMat = new THREE.MeshStandardMaterial({
      color: '#DC2626',
      roughness: 0.36,
      metalness: 0.15,
    });
    const yellowSafetyMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      roughness: 0.35,
      metalness: 0.1,
    });
    const syncLedMat = new THREE.MeshStandardMaterial({
      color: '#10B981',
      emissive: '#10B981',
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
    const irBeamMat = new THREE.MeshBasicMaterial({
      color: '#06B6D4',
    });
    const irGlowMat = new THREE.MeshBasicMaterial({
      color: '#22D3EE',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const laserCoreMat = new THREE.MeshBasicMaterial({
      color: '#FF1E42',
    });
    const laserGlowMat = new THREE.MeshBasicMaterial({
      color: '#EF4444',
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });

    const tagPart = (obj: THREE.Object3D, label: string) => {
      obj.userData.partLabel = label;
      obj.traverse((c) => {
        c.userData.partLabel = label;
      });
    };

    const assemblyGroup = new THREE.Group();
    scene.add(assemblyGroup);

    // =========================================================================
    // 1. REAL T-SLOT 2020 ALUMINUM LAB RIG + ANGLED OLED CONSOLE + CABLES
    // =========================================================================
    const standGroup = new THREE.Group();
    const tslotShape = createTslot2020Shape();
    const makeBeam = (length: number) =>
      new THREE.ExtrudeGeometry(tslotShape, { depth: length, bevelEnabled: false });

    const sideRailGeo = makeBeam(210);
    const colGeo = makeBeam(152);
    const crossBeamGeo = makeBeam(260);

    for (const sx of [-120, 120]) {
      const rail = new THREE.Mesh(sideRailGeo, aluminumMat);
      rail.position.set(sx, benchY + 14, -110);
      rail.castShadow = true;
      rail.receiveShadow = true;
      standGroup.add(rail);

      for (const sz of [-96, 82]) {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 4, 20), darkAnodizedMat);
        foot.position.set(sx, benchY + 2, sz);
        standGroup.add(foot);
      }

      const col = new THREE.Mesh(colGeo, aluminumMat);
      col.rotation.x = -Math.PI / 2;
      col.position.set(sx, benchY + 24, -22);
      col.castShadow = true;
      standGroup.add(col);

      const gusset = new THREE.Mesh(new THREE.BoxGeometry(18, 24, 24), darkAnodizedMat);
      gusset.position.set(sx, benchY + 30, -6);
      standGroup.add(gusset);
    }

    const rearCross = new THREE.Mesh(crossBeamGeo, aluminumMat);
    rearCross.rotation.y = Math.PI / 2;
    rearCross.position.set(-130, benchY + 14, -100);
    const bridgeCross = new THREE.Mesh(crossBeamGeo, aluminumMat);
    bridgeCross.rotation.y = Math.PI / 2;
    bridgeCross.position.set(-130, -10, -22);
    standGroup.add(rearCross, bridgeCross);

    for (const sx of [-120, 120]) {
      // End-caps on front/rear of 2020 side rails and top of columns
      for (const ez of [-110, 100]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(20.6, 20.6, 3), darkAnodizedMat);
        cap.position.set(sx, benchY + 14, ez);
        standGroup.add(cap);
      }
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(20.6, 3, 20.6), darkAnodizedMat);
      topCap.position.set(sx, benchY + 177, -22);
      standGroup.add(topCap);

      // L-shaped corner gusset bracket + M5 bolts
      const gussetArm = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 30), darkAnodizedMat);
      gussetArm.position.set(sx, benchY + 25, -22);
      standGroup.add(gussetArm);
    }

    // Electronics Control Console on Left Column with Live OLED Screen, Rate Buttons, USB & E-Stop
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-132, -30, 8);
    consoleGroup.rotation.y = 0.24;

    const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(60, 86, 36), darkAnodizedMat);
    ctrlBox.castShadow = true;

    const oledBezel = new THREE.Mesh(new THREE.BoxGeometry(54, 30, 3), housingMat);
    oledBezel.position.set(0, 21, 17.5);
    const oledScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 25),
      new THREE.MeshBasicMaterial({ map: oled.texture })
    );
    oledScreen.position.set(0, 21, 19.3);

    const estopCollar = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 2, 24), yellowSafetyMat);
    estopCollar.rotation.x = Math.PI / 2;
    estopCollar.position.set(0, -11, 18.2);
    const estopMushroom = new THREE.Mesh(new THREE.CylinderGeometry(8, 7, 7, 24), redAccentMat);
    estopMushroom.rotation.x = Math.PI / 2;
    estopMushroom.position.set(0, -11, 21);

    const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3.5, 20), syncLedMat);
    startBtn.rotation.x = Math.PI / 2;
    startBtn.position.set(-16, -30, 18.5);
    const stopBtn = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3.5, 20), redAccentMat);
    stopBtn.rotation.x = Math.PI / 2;
    stopBtn.position.set(16, -30, 18.5);

    // Hardware RATE- / RATE+ buttons & USB-B PC Link Socket
    const rateMinusBtn = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 3), aluminumMat);
    rateMinusBtn.position.set(-5, -30, 18.5);
    const ratePlusBtn = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 3), cutoffMat);
    ratePlusBtn.position.set(5, -30, 18.5);
    const usbPort = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 4), steelMat);
    usbPort.position.set(29, -32, 0);

    consoleGroup.add(
      ctrlBox,
      oledBezel,
      oledScreen,
      estopCollar,
      estopMushroom,
      startBtn,
      stopBtn,
      rateMinusBtn,
      ratePlusBtn,
      usbPort
    );
    standGroup.add(consoleGroup);

    // Braided Cable Harnesses + USB-B Cable toward Operator PC
    const motorCable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-110, -32, -8),
          new THREE.Vector3(-82, -52, -48),
          new THREE.Vector3(-36, -42, -74),
          new THREE.Vector3(-8, -22, -76),
        ]),
        28,
        2.3,
        10,
        false
      ),
      darkAnodizedMat
    );
    const sensorCable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-110, -48, -4),
          new THREE.Vector3(-72, -68, -12),
          new THREE.Vector3(-38, -64, 2),
          new THREE.Vector3(-32, -65, 10),
        ]),
        24,
        1.4,
        8,
        false
      ),
      redAccentMat
    );
    const usbPcCable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-103, -62, 8),
          new THREE.Vector3(-106, -98, 22),
          new THREE.Vector3(-140, -122, 60),
        ]),
        20,
        1.8,
        10,
        false
      ),
      bluePlasticMat
    );
    standGroup.add(motorCable, sensorCable, usbPcCable);

    tagPart(standGroup, 'Стенд 2020 · Блок управления (OLED, E-Stop, RATE+/−, кабель USB→ПК)');
    assemblyGroup.add(standGroup);

    // Mounted Metrology Calibration Target Plate behind Drop Zone (replaces plain "paper"!)
    const backdropGroup = new THREE.Group();
    const backdropFrame = new THREE.Mesh(new THREE.BoxGeometry(88, 82, 4), darkAnodizedMat);
    backdropFrame.position.set(0, -76, -19);
    const backdropFace = new THREE.Mesh(
      new THREE.PlaneGeometry(82, 76),
      new THREE.MeshStandardMaterial({ map: backdropTex, roughness: 0.55, metalness: 0.1 })
    );
    backdropFace.position.set(0, -76, -16.8);

    // Two horizontal aluminum support arms bolting the calibration target to the 2020 rig
    for (const by of [-52, -100]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(236, 7, 6), aluminumMat);
      arm.position.set(0, by, -22);
      backdropGroup.add(arm);
    }
    // 4 corner M3 hex mounting screws on calibration target frame
    for (const bx of [-40, 40]) {
      for (const by of [-39, -113]) {
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 3, 6), steelMat);
        screw.rotation.x = Math.PI / 2;
        screw.position.set(bx, by, -16.5);
        backdropGroup.add(screw);
      }
    }
    backdropGroup.add(backdropFrame, backdropFace);
    tagPart(
      backdropGroup,
      'Калибровочная мишень А4 (шкала 1 мм) — эталонная сетка за каналом сброса для камеры 60 fps'
    );
    assemblyGroup.add(backdropGroup);

    // =========================================================================
    // 2. LINEAR CUP-INDEXING RAIL & 8 NUMBERED COLLECTION CUPS (#1..#8)
    //    Strictly aligned along Z = 9 (completely separate from foreground Trash Bin!)
    // =========================================================================
    const cupRailGroup = new THREE.Group();
    const railSpan = 370;
    for (const rz of [0, 18]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, railSpan, 16), steelMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, benchY + 18, rz);
      cupRailGroup.add(rod);
    }
    for (const rx of [-railSpan / 2, railSpan / 2]) {
      const endBlock = new THREE.Mesh(new THREE.BoxGeometry(12, 22, 34), darkAnodizedMat);
      endBlock.position.set(rx, benchY + 15, 9);
      cupRailGroup.add(endBlock);
    }
    const trayBelt = new THREE.Mesh(new THREE.BoxGeometry(railSpan - 12, 2.5, 8), darkAnodizedMat);
    trayBelt.position.set(0, benchY + 15, 9);
    // Belt tensioner pulley + NEMA 14 stepper motor on left end-block
    const railMotor = new THREE.Mesh(new THREE.BoxGeometry(28, 28, 24), darkAnodizedMat);
    railMotor.position.set(-railSpan / 2, benchY + 16, -12);
    const pulleyLeft = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8, 20), aluminumMat);
    pulleyLeft.rotation.x = Math.PI / 2;
    pulleyLeft.position.set(-railSpan / 2 + 4, benchY + 15, 9);
    const pulleyRight = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8, 20), aluminumMat);
    pulleyRight.rotation.x = Math.PI / 2;
    pulleyRight.position.set(railSpan / 2 - 4, benchY + 15, 9);
    cupRailGroup.add(trayBelt, railMotor, pulleyLeft, pulleyRight);
    tagPart(cupRailGroup, 'Линейный привод индексации стаканчиков (ремень GT2 + ШД NEMA 14)');
    assemblyGroup.add(cupRailGroup);

    const cupTrayGroup = new THREE.Group();
    const trayBase = new THREE.Mesh(
      new THREE.BoxGeometry(CUP_COUNT * CUP_SPACING + 12, 5, 28),
      darkAnodizedMat
    );
    trayBase.position.set(((CUP_COUNT - 1) * CUP_SPACING) / 2, benchY + 23, 9);
    trayBase.castShadow = true;
    cupTrayGroup.add(trayBase);

    // 4x SC8UU Linear Bearing Pillow Blocks sliding along the twin 8mm steel rods
    for (const bx of [18, (CUP_COUNT - 1) * CUP_SPACING - 18]) {
      for (const bz of [0, 18]) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 10), aluminumMat);
        block.position.set(bx, benchY + 18, bz);
        cupTrayGroup.add(block);
      }
    }

    const cupBadgeTextures: THREE.CanvasTexture[] = [];
    for (let c = 0; c < CUP_COUNT; c++) {
      const cx = c * CUP_SPACING;
      const cupWall = new THREE.Mesh(
        new THREE.CylinderGeometry(9.4, 7.4, 22, 24, 1, true),
        cupGlassMat
      );
      cupWall.position.set(cx, benchY + 36.5, 9);
      cupWall.renderOrder = 7;

      const cupRim = new THREE.Mesh(new THREE.TorusGeometry(9.4, 0.65, 10, 28), discMat);
      cupRim.rotation.x = Math.PI / 2;
      cupRim.position.set(cx, benchY + 47.5, 9);

      const cupBottom = new THREE.Mesh(
        new THREE.CylinderGeometry(7.4, 7.4, 1.5, 24),
        cupGlassMat
      );
      cupBottom.position.set(cx, benchY + 26, 9);

      const badgeTex = createCupNumberBadgeTexture(c + 1);
      cupBadgeTextures.push(badgeTex);
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(9.5, 8.5),
        new THREE.MeshBasicMaterial({ map: badgeTex })
      );
      // Placed on the front carriage lip below cup floor so cup seeds #1..#8 stay 100% visible
      badge.position.set(cx, benchY + 22.8, 23.2);

      cupTrayGroup.add(cupWall, cupRim, cupBottom, badge);
    }
    tagPart(cupTrayGroup, 'Подвижная каретка со стаканчиками #1..#8 на подшипниках SC8UU');
    assemblyGroup.add(cupTrayGroup);

    // =========================================================================
    // 3. OPEN-FRAME HOUSING WITH REAL Ø17MM DROP HOLE + Y-DIVERTER + TRASH BIN
    // =========================================================================
    const housingGroup = buildHousingPrintGroup(housingMat);

    // Real Open Drop-Hole Throat & Machined Chamfered Aluminum Nozzle at (0, -53..-59, 9)!
    const holeInnerWall = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 6.2, 32, 1, true),
      darkAnodizedMat
    );
    holeInnerWall.position.set(0, -56, 9);
    const holeTopBevel = new THREE.Mesh(new THREE.TorusGeometry(8.8, 1.05, 12, 32), aluminumMat);
    holeTopBevel.rotation.x = Math.PI / 2;
    holeTopBevel.position.set(0, -53, 9);
    const holeBottomNozzle = new THREE.Mesh(new THREE.TorusGeometry(8.8, 1.15, 12, 32), steelMat);
    holeBottomNozzle.rotation.x = Math.PI / 2;
    holeBottomNozzle.position.set(0, -59.1, 9);
    // Transparent polycarbonate protective skirt around throat so seeds are 100% visible passing through the hole
    const throatGlassSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(11.5, 11.5, 6, 28, 1, true),
      coverMat
    );
    throatGlassSleeve.position.set(0, -56, 9);
    housingGroup.add(holeInnerWall, holeTopBevel, holeBottomNozzle, throatGlassSleeve);

    // M5 Hex Mounting Bolts fixing the housing flange to 2020 frame brackets
    for (const mx of [-52, 52]) {
      const boltHead = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 3.2, 6), steelMat);
      boltHead.position.set(mx, -51.4, 9);
      housingGroup.add(boltHead);
    }

    // Side structural frame struts (clear open view front & center)
    for (const sx of [-16, 16]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(2.6, 15, 6), aluminumMat);
      post.position.set(sx, -66, 0);
      housingGroup.add(post);
    }

    // Foreground-Right Reject Branch Chute from (4, -71, 9) -> (68, -82, 58)
    // Completely forward of Z=20 so it NEVER touches the 8 sliding cups at Z=9!
    const trashBinX = 72;
    const trashBinZ = 60;
    const rejectCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4, -71, 11),
      new THREE.Vector3(36, -77, 34),
      new THREE.Vector3(trashBinX - 4, -84, trashBinZ - 4),
    ]);
    const rejectTubeGeo = new THREE.TubeGeometry(rejectCurve, 18, 6.2, 12, false);
    const rejectChuteMesh = new THREE.Mesh(
      rejectTubeGeo,
      new THREE.MeshPhysicalMaterial({
        color: '#FCA5A5',
        roughness: 0.22,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    rejectChuteMesh.renderOrder = 4;
    housingGroup.add(rejectChuteMesh);

    // Curved Guide Track
    const guideShape = new THREE.Shape();
    guideShape.absarc(0, 0, 64.5, Math.PI * 0.72, Math.PI * 1.44, false);
    guideShape.absarc(0, 0, 60.45, Math.PI * 1.44, Math.PI * 0.72, true);
    guideShape.closePath();
    const guideMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(guideShape, { depth: 11, bevelEnabled: false, curveSegments: 48 }),
      cutoffMat
    );
    guideMesh.position.z = 4.2;
    housingGroup.add(guideMesh);
    tagPart(housingGroup, 'Корпус + открытое окно лазера + отводящая ветка мусора');
    assemblyGroup.add(housingGroup);

    // Motorized SG90 Diverter Servo + Mounting Ears + White Servo Horn + Swinging Flap
    const diverterGroup = new THREE.Group();
    diverterGroup.position.set(6, -73, 10);
    const servoBody = new THREE.Mesh(new THREE.BoxGeometry(12, 11, 22), bluePlasticMat);
    servoBody.position.set(7, 2, -13);
    const servoEars = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 22), bluePlasticMat);
    servoEars.position.set(7, 5, -13);
    const servoCable = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 16), redAccentMat);
    servoCable.position.set(7, -2, -26);
    const flapPivot = new THREE.Group();
    const servoHorn = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 2.5),
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.35 })
    );
    servoHorn.position.set(-5, 0, -2);
    const flapPaddle = new THREE.Mesh(new THREE.BoxGeometry(16, 2.8, 15), cutoffMat);
    flapPaddle.position.set(-7, 0, 0);
    const flapAxle = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 22, 14), steelMat);
    flapAxle.rotation.x = Math.PI / 2;
    flapPivot.add(flapPaddle, flapAxle, servoHorn);
    flapPivot.rotation.z = 0.85;
    diverterGroup.add(servoBody, servoEars, servoCable, flapPivot);
    tagPart(diverterGroup, 'Серво-заслонка SG90 с качалкой (переключает поток в ветку мусора)');
    assemblyGroup.add(diverterGroup);

    // Dedicated "МУСОР / ВЕТКА ОТБРАКОВКИ" Bin positioned cleanly forward-right (X=72, Z=60)
    const trashBinGroup = new THREE.Group();
    const binWall = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 13, 30, 24, 1, true),
      trashBinMat
    );
    binWall.position.set(trashBinX, benchY + 31, trashBinZ);
    binWall.renderOrder = 7;
    const binRim = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 10, 28), redAccentMat);
    binRim.rotation.x = Math.PI / 2;
    binRim.position.set(trashBinX, benchY + 46, trashBinZ);
    const binBottom = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 2, 24), darkAnodizedMat);
    binBottom.position.set(trashBinX, benchY + 16, trashBinZ);
    const binLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 12),
      new THREE.MeshBasicMaterial({ map: trashBinTex })
    );
    binLabel.position.set(trashBinX, benchY + 29, trashBinZ + 16.2);
    const binPedestal = new THREE.Mesh(new THREE.BoxGeometry(34, 15, 34), darkAnodizedMat);
    binPedestal.position.set(trashBinX, benchY + 8, trashBinZ);
    trashBinGroup.add(binWall, binRim, binBottom, binLabel, binPedestal);
    tagPart(trashBinGroup, 'Отдельная урна «МУСОР» (вынесена вперёд, Z=60 мм)');
    assemblyGroup.add(trashBinGroup);

    // =========================================================================
    // 4. CONICAL INDUSTRIAL HOPPER WITH FUNNEL THROAT, LID, RIBS & FILL SCALE
    // =========================================================================
    const hopperGroup = new THREE.Group();
    const throatCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(46, 62, 13),
      new THREE.Vector3(43, 45, 12),
      new THREE.Vector3(38, 30, 11.5),
    ]);
    const throatDuct = new THREE.Mesh(new THREE.TubeGeometry(throatCurve, 16, 9.5, 18, false), hopperMat);
    throatDuct.renderOrder = 3;

    const funnelBody = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 11.5, 52, 28, 1, true),
      hopperMat
    );
    funnelBody.position.set(46, 88, 13);
    funnelBody.renderOrder = 3;

    const funnelRim = new THREE.Mesh(new THREE.TorusGeometry(30.5, 2.0, 12, 32), aluminumMat);
    funnelRim.rotation.x = Math.PI / 2;
    funnelRim.position.set(46, 114, 13);

    const funnelThroatCollar = new THREE.Mesh(new THREE.TorusGeometry(11.8, 1.4, 10, 24), discMat);
    funnelThroatCollar.rotation.x = Math.PI / 2;
    funnelThroatCollar.position.set(46, 62, 13);

    const hopperLid = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 30, 3.5, 28),
      new THREE.MeshPhysicalMaterial({
        color: '#E0F2FE',
        roughness: 0.15,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    hopperLid.position.set(46, 116.5, 13);
    const lidHandle = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 6, 16), cutoffMat);
    lidHandle.position.set(46, 121, 13);

    for (let r = 0; r < 4; r++) {
      const ra = (r * Math.PI) / 2 + Math.PI / 4;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(2, 50, 2.5), aluminumMat);
      rib.position.set(46 + Math.cos(ra) * 21, 88, 13 + Math.sin(ra) * 21);
      rib.rotation.z = -Math.cos(ra) * 0.34;
      rib.rotation.x = Math.sin(ra) * 0.34;
      hopperGroup.add(rib);
    }
    const hopperArm = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 10), darkAnodizedMat);
    hopperArm.position.set(22, 68, 4);

    const scaleDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({ map: hopperScaleTex, transparent: true, depthWrite: false })
    );
    scaleDecal.position.set(46, 89, 36);
    scaleDecal.renderOrder = 8;

    hopperGroup.add(
      throatDuct,
      funnelBody,
      funnelRim,
      funnelThroatCollar,
      hopperLid,
      lidHandle,
      hopperArm,
      scaleDecal
    );
    tagPart(hopperGroup, 'Конусный бункер со шкалой 75% и горловиной подачи');
    assemblyGroup.add(hopperGroup);

    // =========================================================================
    // 5. ADJUSTABLE CUTOFF SCRAPER + JAMMED SEED VISUALIZER
    // =========================================================================
    const cutoffGroup = new THREE.Group();
    const cutoffBody = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 7), cutoffMat);
    cutoffBody.position.set(-34, 34, 14.5);
    cutoffBody.rotation.z = Math.PI * 0.25;
    const cutoffKnob = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 9, 18), steelMat);
    cutoffKnob.rotation.x = Math.PI / 2;
    cutoffKnob.position.set(-43, 43, 18);
    cutoffGroup.add(cutoffBody, cutoffKnob);
    tagPart(cutoffGroup, 'Регулируемый отсекатель дублей (зазор 0.5–3.0 мм)');
    assemblyGroup.add(cutoffGroup);

    // Oversized Jammed Seed Wedge Mesh (shown only during Jam simulation!)
    const wedgedSeedMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(5.1, 0),
      new THREE.MeshStandardMaterial({
        color: '#B45309',
        emissive: '#92400E',
        emissiveIntensity: 0.45,
        roughness: 0.55,
      })
    );
    wedgedSeedMesh.visible = false;
    assemblyGroup.add(wedgedSeedMesh);

    // =========================================================================
    // 6. ROTATING DISC + NUMBERED RING + D-SHAFT + M5 THUMBNUT
    // =========================================================================
    const rotorGroup = new THREE.Group();
    rotorGroup.position.z = 4.6;
    assemblyGroup.add(rotorGroup);

    let discSubGroup: THREE.Group | null = null;
    let numberRingMesh: THREE.Mesh | null = null;
    let numberRingTex: THREE.CanvasTexture | null = null;

    const rebuildDisc = (p: DiscParams) => {
      if (discSubGroup) {
        rotorGroup.remove(discSubGroup);
        discSubGroup.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry.dispose();
        });
      }
      if (numberRingMesh) {
        rotorGroup.remove(numberRingMesh);
        numberRingMesh.geometry.dispose();
      }
      if (numberRingTex) numberRingTex.dispose();

      discSubGroup = buildParametricDiscGroup(p, discMat);
      tagPart(
        discSubGroup,
        `Сменный диск (N=${p.cellCount}, D_яч=${p.cellDiameter.toFixed(1)} мм, фаска=${p.entryChamfer.toFixed(1)} мм)`
      );
      rotorGroup.add(discSubGroup);

      numberRingTex = createDiscNumberRingTexture(
        p.cellCount,
        p.outerDiameter,
        p.pitchDiameter,
        maxAnisotropy
      );
      const ringGeo = new THREE.RingGeometry(
        p.pitchDiameter / 2 + p.cellDiameter / 2 + p.entryChamfer + 0.4,
        p.outerDiameter / 2 - 0.3,
        64
      );
      const ringMat = new THREE.MeshBasicMaterial({
        map: numberRingTex,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        depthWrite: false,
      });
      numberRingMesh = new THREE.Mesh(ringGeo, ringMat);
      numberRingMesh.position.z = p.thickness + 0.06;
      rotorGroup.add(numberRingMesh);
    };
    rebuildDisc(stateRef.current.params);
    rebuildDiscRef.current = rebuildDisc;

    const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 70, 28), steelMat);
    shaftMesh.rotation.x = Math.PI / 2;
    shaftMesh.position.z = -14;
    tagPart(shaftMesh, 'Калиброванный D-вал Ø8.0 мм');
    rotorGroup.add(shaftMesh);

    const thumbnutGroup = new THREE.Group();
    const nutCore = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 8, 24), cutoffMat);
    nutCore.rotation.x = Math.PI / 2;
    const nutWing = new THREE.Mesh(new THREE.BoxGeometry(21, 4, 7), cutoffMat);
    thumbnutGroup.add(nutCore, nutWing);
    thumbnutGroup.position.z = 17.5;
    tagPart(thumbnutGroup, 'Гайка-барашек М5 (быстрый съём <45 с)');
    assemblyGroup.add(thumbnutGroup);

    // =========================================================================
    // 7. REAR DRIVE: DETAILED 608ZZ BALL BEARING, JAW COUPLER, GUARD, NEMA 17
    // =========================================================================
    const rearDriveGroup = new THREE.Group();
    const bearingOuter = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 7, 32, 1, true), steelMat);
    bearingOuter.rotation.x = Math.PI / 2;
    bearingOuter.position.z = -3.5;
    const bearingInner = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 7, 24), steelMat);
    bearingInner.rotation.x = Math.PI / 2;
    bearingInner.position.z = -3.5;
    const bearingShield = new THREE.Mesh(new THREE.RingGeometry(5.6, 10.6, 28), darkAnodizedMat);
    bearingShield.position.z = -7.05;
    rearDriveGroup.add(bearingOuter, bearingInner, bearingShield);
    for (let bi = 0; bi < 7; bi++) {
      const ba = (bi * Math.PI * 2) / 7;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1.75, 12, 12), steelMat);
      ball.position.set(Math.cos(ba) * 8.1, Math.sin(ba) * 8.1, -3.5);
      rearDriveGroup.add(ball);
    }

    const couplerHub1 = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 9, 24), aluminumMat);
    couplerHub1.rotation.x = Math.PI / 2;
    couplerHub1.position.z = -18;
    const couplerSpider = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 5, 16), redAccentMat);
    couplerSpider.rotation.x = Math.PI / 2;
    couplerSpider.position.z = -24;
    const couplerHub2 = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 9, 24), aluminumMat);
    couplerHub2.rotation.x = Math.PI / 2;
    couplerHub2.position.z = -30;
    rearDriveGroup.add(couplerHub1, couplerSpider, couplerHub2);

    const guardMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });
    const guardMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 34, 32, 1, true),
      guardMat
    );
    guardMesh.rotation.x = Math.PI / 2;
    guardMesh.position.z = -22;
    rearDriveGroup.add(guardMesh);

    const motorFrontBell = new THREE.Mesh(new THREE.BoxGeometry(42, 42, 8), aluminumMat);
    motorFrontBell.position.z = -44;
    const motorStator = new THREE.Mesh(new THREE.BoxGeometry(41, 41, 26), darkAnodizedMat);
    motorStator.position.z = -61;
    const motorRearBell = new THREE.Mesh(new THREE.BoxGeometry(42, 42, 8), aluminumMat);
    motorRearBell.position.z = -78;
    const motorPlug = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 10), new THREE.MeshStandardMaterial({ color: '#F8FAFC' }));
    motorPlug.position.set(0, -21, -74);
    rearDriveGroup.add(motorFrontBell, motorStator, motorRearBell, motorPlug);
    for (const bx of [-15.5, 15.5]) {
      for (const by of [-15.5, 15.5]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 44, 8), steelMat);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(bx, by, -61);
        rearDriveGroup.add(bolt);
      }
    }
    tagPart(rearDriveGroup, 'Привод NEMA 17 + Подшипник 608ZZ + Муфта 5→8 мм + Защитный кожух (Б3)');
    assemblyGroup.add(rearDriveGroup);

    // =========================================================================
    // 8. ULTRA-DETAILED INDUSTRIAL OPTICAL SENSORS (LM393 ENCODER + KY-008 LASER)
    // =========================================================================
    const sensorGroup = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.88, roughness: 0.22 });
    const whiteConnMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.4 });

    // 8A. Detailed LM393 Slotted Optocoupler Encoder Module (R = 27mm)
    const sensorPcb = new THREE.Mesh(new THREE.BoxGeometry(16, 26, 2.2), pcbMat);
    sensorPcb.position.set(0, -33, -5);
    const lm393Chip = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 1.8), darkAnodizedMat);
    lm393Chip.position.set(-3, -34, -3.2);
    const sensorPot = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 5), bluePlasticMat);
    sensorPot.position.set(3.5, -40, -2);
    const potScrew = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.2, 12), brassMat);
    potScrew.rotation.x = Math.PI / 2;
    potScrew.position.set(3.5, -40, 0.8);
    const jstHeaderEnc = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 5), whiteConnMat);
    jstHeaderEnc.position.set(0, -44.5, -2.5);

    const forkBase = new THREE.Mesh(new THREE.BoxGeometry(11, 6, 18), darkAnodizedMat);
    forkBase.position.set(0, -23.5, 9);
    const forkArmFront = new THREE.Mesh(new THREE.BoxGeometry(9, 10, 3.4), darkAnodizedMat);
    forkArmFront.position.set(0, -28, 17);
    const forkArmRear = new THREE.Mesh(new THREE.BoxGeometry(9, 10, 3.4), darkAnodizedMat);
    forkArmRear.position.set(0, -28, 1);

    const irBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 15, 12), irBeamMat);
    irBeam.rotation.x = Math.PI / 2;
    irBeam.position.set(0, -27, 9);
    const irGlow = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 15, 12), irGlowMat);
    irGlow.rotation.x = Math.PI / 2;
    irGlow.position.set(0, -27, 9);

    const syncLedBezel = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4.5, 18), aluminumMat);
    syncLedBezel.rotation.x = Math.PI / 2;
    syncLedBezel.position.set(22, -54, 14);
    const syncLed = new THREE.Mesh(new THREE.SphereGeometry(4, 18, 18), syncLedMat);
    syncLed.position.set(22, -54, 16.5);

    // 8B. Industrial Machined C-Bridge Bracket + KY-008 Brass Collimator + Hooded Receiver (y = -65)
    const bridgeRail = new THREE.Mesh(new THREE.BoxGeometry(72, 4.5, 6), darkAnodizedMat);
    bridgeRail.position.set(0, -65, 1.5);
    for (const sx of [-31, 31]) {
      const clampBracket = new THREE.Mesh(new THREE.BoxGeometry(7, 16, 15), aluminumMat);
      clampBracket.position.set(sx, -65, 6.5);
      const hexScrew = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 3, 6), steelMat);
      hexScrew.rotation.x = Math.PI / 2;
      hexScrew.position.set(sx, -59.5, 14.5);
      sensorGroup.add(clampBracket, hexScrew);
    }

    // Emitter Module (Left)
    const laserEmitterPcb = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 16), pcbMat);
    laserEmitterPcb.position.set(-28, -65, 10);
    const emitterJst = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 7), whiteConnMat);
    emitterJst.position.set(-30.5, -70, 10);
    const emitterPwrLed = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 10), laserCoreMat);
    emitterPwrLed.position.set(-26, -60, 14);
    const laserBrassBarrel = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 11, 20), brassMat);
    laserBrassBarrel.rotation.z = Math.PI / 2;
    laserBrassBarrel.position.set(-21.5, -65, 10);
    const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 3, 20), darkAnodizedMat);
    brassCollar.rotation.z = Math.PI / 2;
    brassCollar.position.set(-16.5, -65, 10);

    // Receiver Module (Right)
    const laserReceiverPcb = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 16), pcbMat);
    laserReceiverPcb.position.set(28, -65, 10);
    const receiverTrimPot = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 6), bluePlasticMat);
    receiverTrimPot.position.set(25.5, -70, 13);
    const receiverHood = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 8, 20, 1, true), darkAnodizedMat);
    receiverHood.rotation.z = Math.PI / 2;
    receiverHood.position.set(22, -65, 10);
    const receiverLens = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2, 18), bluePlasticMat);
    receiverLens.rotation.z = Math.PI / 2;
    receiverLens.position.set(24.5, -65, 10);

    // Crisp 650nm Crimson Laser Beam across the open optical drop zone
    const laserBeamCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 38, 14),
      laserCoreMat
    );
    laserBeamCore.rotation.z = Math.PI / 2;
    laserBeamCore.position.set(0, -65, 10);

    const laserBeamGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 38, 16),
      laserGlowMat
    );
    laserBeamGlow.rotation.z = Math.PI / 2;
    laserBeamGlow.position.set(0, -65, 10);

    const laserHitDot = new THREE.Mesh(new THREE.SphereGeometry(2.5, 14, 14), laserCoreMat);
    laserHitDot.position.set(23, -65, 10);

    sensorGroup.add(
      sensorPcb,
      lm393Chip,
      sensorPot,
      potScrew,
      jstHeaderEnc,
      forkBase,
      forkArmFront,
      forkArmRear,
      irBeam,
      irGlow,
      syncLedBezel,
      syncLed,
      bridgeRail,
      laserEmitterPcb,
      emitterJst,
      emitterPwrLed,
      laserBrassBarrel,
      brassCollar,
      laserReceiverPcb,
      receiverTrimPot,
      receiverHood,
      receiverLens,
      laserBeamCore,
      laserBeamGlow,
      laserHitDot
    );
    tagPart(sensorGroup, 'Высокодетализированные датчики: энкодер LM393 + лазерный детектор KY-008 на мосту');
    assemblyGroup.add(sensorGroup);

    // =========================================================================
    // 9. CAMERA BOLTED TO 2020 FRAME VIA RIGID CANTILEVER BRACKET ARM
    // =========================================================================
    const cameraRigGroup = new THREE.Group();
    const camX = 28;
    const camY = -56;
    const camZ = 112;

    const clampOnColumn = new THREE.Mesh(new THREE.BoxGeometry(28, 28, 28), darkAnodizedMat);
    clampOnColumn.position.set(120, camY, -22);

    const camSideArm = new THREE.Mesh(makeBeam(136), aluminumMat);
    camSideArm.position.set(120, camY, -22);
    camSideArm.castShadow = true;

    const frontElbow = new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), darkAnodizedMat);
    frontElbow.position.set(120, camY, camZ);

    const camCrossArm = new THREE.Mesh(makeBeam(94), aluminumMat);
    camCrossArm.rotation.y = -Math.PI / 2;
    camCrossArm.position.set(120, camY, camZ);
    camCrossArm.castShadow = true;

    const thumbKnobClamp = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 18), cutoffMat);
    thumbKnobClamp.position.set(camX + 12, camY + 14, camZ);

    const ballHead = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), steelMat);
    ballHead.position.set(camX, camY, camZ);

    const camBody = new THREE.Mesh(new THREE.BoxGeometry(28, 18, 12), darkAnodizedMat);
    camBody.position.set(camX, camY, camZ - 8);
    camBody.lookAt(8, -74, 16);

    const camLensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7, 8, 24), aluminumMat);
    camLensBarrel.rotation.x = Math.PI / 2;
    camLensBarrel.position.set(0, 0, 8);
    const camLensGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.2, 1.5, 24),
      new THREE.MeshPhysicalMaterial({ color: '#0F172A', roughness: 0.05, metalness: 0.2, clearcoat: 1 })
    );
    camLensGlass.rotation.x = Math.PI / 2;
    camLensGlass.position.set(0, 0, 12);
    const camRingLight = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.9, 10, 24),
      new THREE.MeshBasicMaterial({ color: '#F8FAFC' })
    );
    camRingLight.position.set(0, 0, 11.5);
    camBody.add(camLensBarrel, camLensGlass, camRingLight);

    cameraRigGroup.add(
      clampOnColumn,
      camSideArm,
      frontElbow,
      camCrossArm,
      thumbKnobClamp,
      ballHead,
      camBody
    );
    tagPart(cameraRigGroup, 'Камера 60 fps на жёстком кронштейне к профилю 2020 (А4)');
    assemblyGroup.add(cameraRigGroup);

    // =========================================================================
    // 10. FRONT REMOVABLE TRANSPARENT COVER + 4x M4 THUMBSCREWS
    // =========================================================================
    const coverGroup = new THREE.Group();
    const coverPlate = new THREE.Mesh(new THREE.CylinderGeometry(66, 66, 3, 48), coverMat);
    coverPlate.rotation.x = Math.PI / 2;
    coverPlate.renderOrder = 6;
    coverGroup.add(coverPlate);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 8, 16), cutoffMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(Math.cos(a) * 63.5, Math.sin(a) * 63.5, 3);
      coverGroup.add(knob);
    }
    coverGroup.position.z = 17.5;
    tagPart(coverGroup, 'Прозрачная крышка ПЭТГ 3 мм + 4 барашка М4');
    assemblyGroup.add(coverGroup);

    // =========================================================================
    // 11. ANIMATED SEEDS + TRASH + JAM RECOVERY PHYSICS
    // =========================================================================
    const seedGeo = new THREE.SphereGeometry(3.45, 16, 12);
    const seedMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.44,
      metalness: 0.02,
    });
    const maxSeeds = 76;
    const seedsMesh = new THREE.InstancedMesh(seedGeo, seedMat, maxSeeds);
    seedsMesh.frustumCulled = false;

    const palette = [new THREE.Color('#A3E635'), new THREE.Color('#BEF264'), new THREE.Color('#84CC16')];
    for (let i = 0; i < maxSeeds; i++) {
      seedsMesh.setColorAt(i, palette[i % palette.length]);
    }
    if (seedsMesh.instanceColor) seedsMesh.instanceColor.needsUpdate = true;
    assemblyGroup.add(seedsMesh);

    const trashGeo = new THREE.DodecahedronGeometry(3.5, 0);
    const trashMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.85,
      metalness: 0.08,
    });
    const maxTrash = 14;
    const trashMesh = new THREE.InstancedMesh(trashGeo, trashMat, maxTrash);
    trashMesh.frustumCulled = false;
    const trashColors = [new THREE.Color('#451A03'), new THREE.Color('#57534E'), new THREE.Color('#78350F')];
    for (let i = 0; i < maxTrash; i++) {
      trashMesh.setColorAt(i, trashColors[i % trashColors.length]);
    }
    if (trashMesh.instanceColor) trashMesh.instanceColor.needsUpdate = true;
    assemblyGroup.add(trashMesh);

    const hopperDrops: Array<{ active: boolean; t: number }> = [
      { active: true, t: 0.1 },
      { active: true, t: 0.55 },
    ];

    interface DropParticle {
      active: boolean;
      isTrash: boolean;
      laserHit: boolean;
      routePhase: 'freefall' | 'branch';
      branchT: number;
      x: number;
      y: number;
      z: number;
      vy: number;
      targetCup: number;
      roundId: number;
    }
    const dropParticles: DropParticle[] = Array.from({ length: 16 }, () => ({
      active: false,
      isTrash: false,
      laserHit: false,
      routePhase: 'freefall',
      branchT: 0,
      x: 0,
      y: -47,
      z: 9,
      vy: 0,
      targetCup: 0,
      roundId: 0,
    }));

    const cupSeedCounts: number[] = Array(CUP_COUNT).fill(0);
    let currentRoundId = 0;
    let trashInBinCount = 0;
    let activeCupIdx = 0;
    let trayVisualCupIdx = 0;
    let trayOffsetX = 0;
    let forceNextTrash = false;
    let cellIsTrashFlag = -1;

    resetCupsRef.current = () => {
      currentRoundId++;
      cupSeedCounts.fill(0);
      activeCupIdx = 0;
      trayVisualCupIdx = 0;
      for (const dp of dropParticles) dp.active = false;
      setLiveTelemetry((prev) => ({
        ...prev,
        activeCup: 1,
        cupFilled: Array(CUP_COUNT).fill(false),
      }));
      appendSerial('> CMD: RESET_CUPS (Все стаканчики #1..#8 очищены)');
    };

    // Jam Simulation State Machine inside Animation Loop
    let jamPhase: 'none' | 'stalled' | 'reversing' = 'none';
    let jamTimer = 0;
    let jamsClearedCount = 0;

    injectTrashRef.current = () => {
      forceNextTrash = true;
      appendSerial('> CMD: INJECT_TRASH_PARTICLE (тест лазера KY-008)');
    };

    triggerJamRef.current = () => {
      if (!stateRef.current.isRunning || jamPhase !== 'none') return;
      jamPhase = 'stalled';
      jamTimer = 0.75;
      wedgedSeedMesh.position.set(-33, 33, 13.5);
      wedgedSeedMesh.visible = true;
      setControllerState('ANTI_JAM_REVERSE');
      appendSerial('WARN,NO_ROTATION_FEEDBACK (нет импульсов LM393 у отсекателя!)');
    };

    // Raycaster for Part Inspection
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let lastRaycastMs = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 110) return;
      lastRaycastMs = now;
      const rect = canvas.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(assemblyGroup, true);
      if (hits.length > 0) {
        const label = hits[0].object.userData.partLabel;
        if (label) setHoveredPart(label);
      }
    };
    canvas.addEventListener('pointermove', handlePointerMove);

    applyPresetRef.current = (preset: CameraPreset) => {
      if (preset === 'iso') {
        cameraPosGoal = new THREE.Vector3(172, 64, 385);
        cameraTargetGoal = new THREE.Vector3(10, -4, 6);
      } else if (preset === 'front') {
        cameraPosGoal = new THREE.Vector3(10, -22, 355);
        cameraTargetGoal = new THREE.Vector3(10, -22, 4);
      } else if (preset === 'section') {
        cameraPosGoal = new THREE.Vector3(245, -6, 16);
        cameraTargetGoal = new THREE.Vector3(0, -20, -10);
      } else {
        cameraPosGoal = new THREE.Vector3(10, 270, 95);
        cameraTargetGoal = new THREE.Vector3(0, -20, 4);
      }
    };

    let totalDiscAngle = 0;
    let prevCellCount = stateRef.current.params.cellCount;
    let lastTriggeredTick = Math.floor(
      (totalDiscAngle + Math.PI / 2) / ((Math.PI * 2) / prevCellCount)
    );
    setCameraEvents([]);
    let totalPulses = 0;
    let singlesCount = 0;
    let doublesCount = 0;
    let missesCount = 0;
    let trashEventsCount = 0;
    let ledTimer = 0;
    let diverterTimer = 0;
    let flapAngle = 0.85;
    let currentExplode = 0;
    let frameId = 0;
    let lastTime = performance.now();

    refreshOledRef.current = (p: DiscParams, running: boolean) => {
      const inv = evaluateDiscInvariants(p);
      oled.update(
        inv.rpm,
        p.targetRateSps,
        totalPulses,
        1,
        trashEventsCount,
        diverterTimer > 0 || jamPhase !== 'none',
        running
      );
    };

    const updateClipping = (enabled: boolean) => {
      const planes = enabled ? [sectionPlane] : [];
      discMat.clippingPlanes = planes;
      housingMat.clippingPlanes = planes;
      hopperMat.clippingPlanes = planes;
      coverMat.clippingPlanes = planes;
      guardMat.clippingPlanes = planes;
      darkAnodizedMat.clippingPlanes = planes;
      aluminumMat.clippingPlanes = planes;
    };

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 70);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 70);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const st = stateRef.current;
      const inv = evaluateDiscInvariants(st.params);
      const N = st.params.cellCount;
      const stepAngle = (Math.PI * 2) / N;

      updateClipping(st.showSection);
      coverGroup.visible = st.showCover;

      // Exploded View smooth damping
      currentExplode = THREE.MathUtils.damp(currentExplode, st.exploded, 7, dt);
      rotorGroup.position.z = 4.6 + currentExplode * 30;
      thumbnutGroup.position.z = 17.5 + currentExplode * 56;
      coverGroup.position.z = 17.5 + currentExplode * 82;
      rearDriveGroup.position.z = -currentExplode * 52;
      hopperGroup.position.z = currentExplode * 20;
      cutoffGroup.position.z = currentExplode * 42;

      // Smooth Cup Tray indexing (holds active target cup under nozzle until seed lands!)
      const targetTrayX = -trayVisualCupIdx * CUP_SPACING;
      trayOffsetX = THREE.MathUtils.damp(trayOffsetX, targetTrayX, 16, dt);
      cupTrayGroup.position.x = trayOffsetX;

      // Smooth Servo Diverter Flap Animation
      const targetFlapAngle = diverterTimer > 0 ? -0.52 : 0.85;
      flapAngle = THREE.MathUtils.damp(flapAngle, targetFlapAngle, 18, dt);
      flapPivot.rotation.z = flapAngle;

      if (diverterTimer > 0) {
        diverterTimer -= dt;
        laserBeamCore.scale.set(1.9, 1, 1.9);
        laserBeamGlow.scale.set(2.3, 1, 2.3);
        laserGlowMat.opacity = 0.85;
        if (diverterTimer <= 0) {
          setLiveTelemetry((prev) => ({ ...prev, laserAlert: false }));
          oled.update(
            inv.rpm,
            st.params.targetRateSps,
            totalPulses,
            1,
            trashEventsCount,
            jamPhase !== 'none',
            st.isRunning
          );
        }
      } else {
        laserBeamCore.scale.set(1, 1, 1);
        laserBeamGlow.scale.set(1, 1, 1);
        laserGlowMat.opacity = 0.44 + Math.sin(now * 0.012) * 0.1;
      }

      if (cameraPosGoal && cameraTargetGoal) {
        camera.position.lerp(cameraPosGoal, 1 - Math.exp(-6 * dt));
        controls.target.lerp(cameraTargetGoal, 1 - Math.exp(-6 * dt));
        if (camera.position.distanceTo(cameraPosGoal) < 0.8) {
          cameraPosGoal = null;
          cameraTargetGoal = null;
        }
      }

      // Disc Rotation + Anti-Jam Reverse Recovery Machine
      if (st.isRunning) {
        const omega = (inv.rpm * Math.PI * 2) / 60;
        if (jamPhase === 'stalled') {
          jamTimer -= dt;
          wedgedSeedMesh.position.x = -33 + Math.sin(now * 0.06) * 0.8;
          if (jamTimer <= 0) {
            jamPhase = 'reversing';
            jamTimer = 0.65;
            appendSerial('INFO,PIN_DIR=LOW (Авто-реверс TMC2209 на -15° для расклинивания)');
          }
        } else if (jamPhase === 'reversing') {
          jamTimer -= dt;
          totalDiscAngle -= omega * 0.7 * dt; // Reverse rotation!
          wedgedSeedMesh.position.x = -33 + Math.sin(now * 0.08) * 1.4;
          wedgedSeedMesh.position.y = 33 - (0.65 - jamTimer) * 14;
          if (jamTimer <= 0) {
            jamPhase = 'none';
            wedgedSeedMesh.visible = false;
            jamsClearedCount++;
            trashEventsCount++;
            diverterTimer = 0.55;
            // Eject loosened jam object straight through laser into trash branch!
            const slot = dropParticles.find((d) => !d.active);
            if (slot) {
              slot.active = true;
              slot.isTrash = true;
              slot.laserHit = false;
              slot.routePhase = 'freefall';
              slot.branchT = 0;
              slot.x = 0;
              slot.y = -46;
              slot.z = 10;
              slot.vy = -120;
              slot.targetCup = activeCupIdx;
            }
            setControllerState('RUNNING');
            setLiveTelemetry((prev) => ({
              ...prev,
              jamsCleared: jamsClearedCount,
              trash: trashEventsCount,
              laserAlert: true,
            }));
            appendSerial('INFO,ANTI_JAM_CLEARED_RESUME_OK (Зерно сброшено в ветку брака)');
          }
        } else {
          totalDiscAngle += omega * dt;
        }
      }
      const discAngle = totalDiscAngle % (Math.PI * 2);
      rotorGroup.rotation.z = discAngle;

      const Rp = st.params.pitchDiameter / 2;
      const seedZ = rotorGroup.position.z + st.params.thickness - st.params.cellDepth / 2;

      // Exact unwrapped cell crossing trigger: NEVER misses a cell or freezes on one cup even at 6.0 sps!
      if (N !== prevCellCount) {
        prevCellCount = N;
        lastTriggeredTick = Math.floor((totalDiscAngle + Math.PI / 2) / stepAngle);
      }
      const currentTick = Math.floor((totalDiscAngle + Math.PI / 2) / stepAngle);
      if (st.isRunning && jamPhase === 'none') {
        while (lastTriggeredTick < currentTick) {
          lastTriggeredTick++;
          const cellIdxZero = ((lastTriggeredTick % N) + N) % N;
          const cellNum = cellIdxZero + 1;
          totalPulses++;
          ledTimer = 0.1;

          const isAutoTrash = st.trashAutoMode && totalPulses % 6 === 0;
          const isTrashEvent = forceNextTrash || cellIsTrashFlag === cellIdxZero || isAutoTrash;
          if (cellIsTrashFlag === cellIdxZero) cellIsTrashFlag = -1;
          if (forceNextTrash) forceNextTrash = false;

          let outcome: '1' | '2+' | '0' | 'МУСОР' = '1';
          if (isTrashEvent) {
            outcome = 'МУСОР';
            trashEventsCount++;
          } else if (st.stressMode) {
            const roll = totalPulses % 9;
            if (roll === 4) outcome = '2+';
            else if (roll === 7) outcome = '0';
          }

          if (outcome === '1') singlesCount++;
          else if (outcome === '2+') doublesCount++;
          else if (outcome === '0') missesCount++;

          const cupToDrop = activeCupIdx;

          if (outcome === 'МУСОР') {
            const slot = dropParticles.find((d) => !d.active);
            if (slot) {
              slot.active = true;
              slot.isTrash = true;
              slot.laserHit = false;
              slot.routePhase = 'freefall';
              slot.branchT = 0;
              slot.x = 0;
              slot.y = -Rp;
              slot.z = 10;
              slot.vy = -(95 + st.params.targetRateSps * 28);
              slot.targetCup = cupToDrop;
              slot.roundId = currentRoundId;
            }
            appendSerial(`EVENT,TRASH_DIVERTED,cell=${cellNum},count=${trashEventsCount}`);
          } else {
            // Clear all 8 cups cleanly at the start of a new #1..#8 round (when Cup #1 enters under hole!)
            if (cupToDrop === 0) {
              currentRoundId++;
              cupSeedCounts.fill(0);
            }
            // Hold tray under cupToDrop while the seed falls straight down; advance after landing (or immediately on miss)
            trayVisualCupIdx = cupToDrop;
            activeCupIdx = (activeCupIdx + 1) % CUP_COUNT;

            const spawnCount = outcome === '1' ? 1 : outcome === '2+' ? 2 : 0;
            if (spawnCount === 0) {
              trayVisualCupIdx = activeCupIdx;
            }
            for (let s = 0; s < spawnCount; s++) {
              const slot = dropParticles.find((d) => !d.active);
              if (slot) {
                slot.active = true;
                slot.isTrash = false;
                slot.laserHit = false;
                slot.routePhase = 'freefall';
                slot.branchT = 0;
                slot.x = (s === 0 ? 0 : 2.8) + (Math.random() - 0.5) * 0.8;
                slot.y = -Rp + s * 5;
                slot.z = 9;
                slot.vy = -(115 + st.params.targetRateSps * 36);
                slot.targetCup = cupToDrop;
                slot.roundId = currentRoundId;
              }
            }
          }

          const timeStr = new Date().toLocaleTimeString('ru-RU', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          oled.update(
            inv.rpm,
            st.params.targetRateSps,
            totalPulses,
            cellNum,
            trashEventsCount,
            diverterTimer > 0,
            st.isRunning
          );
          setLiveTelemetry({
            pulseCount: totalPulses,
            activeCell: cellNum,
            activeCup: cupToDrop + 1,
            cupFilled: cupSeedCounts.map((cnt) => cnt > 0),
            ledActive: true,
            laserAlert: diverterTimer > 0,
            singles: singlesCount,
            doubles: doublesCount,
            misses: missesCount,
            trash: trashEventsCount,
            jamsCleared: jamsClearedCount,
          });
          setCameraEvents((prev) => [
            {
              uid: ++eventUidRef.current,
              seq: totalPulses,
              cellIdx: cellNum,
              cupLabel: outcome === 'МУСОР' ? 'Ветка отвода' : `Стакан #${cupToDrop + 1}`,
              outcome,
              timestamp: timeStr,
            },
            ...prev.slice(0, 4),
          ]);
        }
      }

      // Render Seeds inside Disc Cells
      let idxSeed = 0;
      let idxTrash = 0;

      for (let i = 0; i < N; i++) {
        const cellWorldAngle = i * stepAngle + discAngle;
        let normA = ((cellWorldAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (normA < -Math.PI) normA += Math.PI * 2;

        const inCarryArc = normA > 0.35 || normA < -Math.PI / 2 + 0.08;
        if (inCarryArc && idxSeed < maxSeeds - 30) {
          _vec3.set(Math.cos(cellWorldAngle) * Rp, Math.sin(cellWorldAngle) * Rp, seedZ);
          _scale.set(1, 1, 1);
          _mat4.compose(_vec3, _quat, _scale);
          seedsMesh.setMatrixAt(idxSeed++, _mat4);
        }
      }

      if (ledTimer > 0) {
        ledTimer -= dt;
        syncLedMat.emissiveIntensity = 3.0;
        irBeamMat.color.set('#34D399');
        if (ledTimer <= 0) {
          setLiveTelemetry((prev) => ({ ...prev, ledActive: false }));
          irBeamMat.color.set('#06B6D4');
        }
      } else {
        syncLedMat.emissiveIntensity = 0.18;
      }

      // Hopper Seed Reserve Pile (14 seeds)
      for (let h = 0; h < 14 && idxSeed < maxSeeds - 22; h++) {
        const layer = Math.floor(h / 5);
        const angleH = h * 2.4 + (st.isRunning && jamPhase === 'none' ? now * 0.0012 : 0);
        const radH = (h % 5) * 3.1;
        _vec3.set(46 + Math.cos(angleH) * radH, 68 + layer * 8.5, 13 + Math.sin(angleH) * radH + currentExplode * 20);
        _scale.set(0.95, 1, 0.95);
        _mat4.compose(_vec3, _quat, _scale);
        seedsMesh.setMatrixAt(idxSeed++, _mat4);
      }

      // Falling Seeds from Hopper Throat into Disc Cells
      for (const hd of hopperDrops) {
        if (st.isRunning && jamPhase === 'none') {
          hd.t += dt * Math.max(0.9, st.params.targetRateSps * 0.75);
          if (hd.t > 1) hd.t -= 1;
        }
        if (idxSeed < maxSeeds - 18) {
          _vec3.set(
            THREE.MathUtils.lerp(45, 42, hd.t),
            THREE.MathUtils.lerp(60, 22, hd.t * hd.t),
            THREE.MathUtils.lerp(13, seedZ, hd.t) + currentExplode * 20
          );
          _scale.set(0.96, 0.96, 0.96);
          _mat4.compose(_vec3, _quat, _scale);
          seedsMesh.setMatrixAt(idxSeed++, _mat4);
        }
      }

      // Clean Seeds resting inside the 8 numbered cups
      for (let c = 0; c < CUP_COUNT; c++) {
        const cnt = Math.min(2, cupSeedCounts[c]);
        for (let k = 0; k < cnt && idxSeed < maxSeeds - 10; k++) {
          _vec3.set(
            c * CUP_SPACING + trayOffsetX + (k === 0 ? 0 : 3.4),
            benchY + 30.8,
            9 + (k === 0 ? 0 : 2.2)
          );
          _scale.set(1.08, 1.0, 1.08);
          _mat4.compose(_vec3, _quat, _scale);
          seedsMesh.setMatrixAt(idxSeed++, _mat4);
        }
      }

      // Trash Pieces resting inside the Foreground-Right "МУСОР" Bin (Z = 60!)
      const showTrashInBin = Math.min(6, trashInBinCount);
      for (let t = 0; t < showTrashInBin && idxTrash < maxTrash - 4; t++) {
        _vec3.set(
          trashBinX + ((t % 3) - 1) * 5.2,
          benchY + 19.5 + Math.floor(t / 3) * 4.5,
          trashBinZ + ((t % 2) - 0.5) * 4
        );
        _scale.set(1.15, 0.85, 1.0);
        _mat4.compose(_vec3, _quat, _scale);
        trashMesh.setMatrixAt(idxTrash++, _mat4);
      }

      // Active Falling Seeds & Trash Crossing Laser -> Cups or Foreground-Right Reject Branch!
      const fallAccel = 900 + st.params.targetRateSps * 280;
      for (const p of dropParticles) {
        if (!p.active) continue;

        if (st.isRunning) {
          if (!p.laserHit && p.y <= -62) {
            p.laserHit = true;
            if (p.isTrash) {
              diverterTimer = 0.45;
              setLiveTelemetry((prev) => ({ ...prev, laserAlert: true }));
              oled.update(
                inv.rpm,
                st.params.targetRateSps,
                totalPulses,
                1,
                trashEventsCount,
                true,
                st.isRunning
              );
            }
          }

          if (p.isTrash && p.y <= -70) {
            p.routePhase = 'branch';
          }

          if (p.routePhase === 'branch') {
            p.branchT += dt * 3.0;
            if (p.branchT >= 1) {
              p.active = false;
              trashInBinCount++;
            } else {
              p.x = THREE.MathUtils.lerp(4, trashBinX, p.branchT);
              p.y = THREE.MathUtils.lerp(-71, benchY + 34, p.branchT);
              p.z = THREE.MathUtils.lerp(11, trashBinZ, p.branchT);
            }
          } else {
            p.vy -= fallAccel * dt;
            p.y += p.vy * dt;
            // Track horizontal cup position cleanly so seeds fall directly into their assigned cup!
            const targetWorldX = p.targetCup * CUP_SPACING + trayOffsetX;
            p.x = THREE.MathUtils.damp(p.x, targetWorldX, 18, dt);
            if (p.y <= benchY + 31) {
              p.active = false;
              if (!p.isTrash && p.roundId === currentRoundId) {
                cupSeedCounts[p.targetCup] += 1;
                trayVisualCupIdx = activeCupIdx;
                setLiveTelemetry((prev) => ({
                  ...prev,
                  cupFilled: cupSeedCounts.map((cnt) => cnt > 0),
                }));
              }
            }
          }
        }

        if (p.active) {
          _vec3.set(p.x, p.y, p.z);
          if (p.isTrash && idxTrash < maxTrash) {
            _scale.set(1.2, 0.9, 1.05);
            _mat4.compose(_vec3, _quat, _scale);
            trashMesh.setMatrixAt(idxTrash++, _mat4);
          } else if (!p.isTrash && idxSeed < maxSeeds) {
            _scale.set(1, 1, 1);
            _mat4.compose(_vec3, _quat, _scale);
            seedsMesh.setMatrixAt(idxSeed++, _mat4);
          }
        }
      }

      _scale.set(0, 0, 0);
      _vec3.set(0, 0, -500);
      _mat4.compose(_vec3, _quat, _scale);
      while (idxSeed < maxSeeds) seedsMesh.setMatrixAt(idxSeed++, _mat4);
      while (idxTrash < maxTrash) trashMesh.setMatrixAt(idxTrash++, _mat4);
      seedsMesh.instanceMatrix.needsUpdate = true;
      trashMesh.instanceMatrix.needsUpdate = true;

      const curW = container?.clientWidth || 1000;
      const curH = container?.clientHeight || 540;

      // 1) Render Live 60 fps Machine-Vision Camera Feed directly onto dedicated <canvas>
      const camCanvas = camFeedCanvasRef.current;
      if (st.showCameraFeed && camCanvas && curW >= CAM_PANEL_W && curH >= CAM_FEED_H) {
        const camCtx = camCanvas.getContext('2d');
        if (camCtx) {
          cameraRigGroup.visible = false; // Never let camera housing block its own lens!
          inspectionCam.aspect = CAM_PANEL_W / CAM_FEED_H;
          inspectionCam.updateProjectionMatrix();

          renderer.setScissorTest(true);
          renderer.setViewport(0, 0, CAM_PANEL_W, CAM_FEED_H);
          renderer.setScissor(0, 0, CAM_PANEL_W, CAM_FEED_H);
          renderer.render(scene, inspectionCam);
          renderer.setScissorTest(false);
          cameraRigGroup.visible = true;

          renderer.getDrawingBufferSize(_bufSize);
          const dpr = renderer.getPixelRatio();
          const sw = Math.min(_bufSize.x, Math.round(CAM_PANEL_W * dpr));
          const sh = Math.min(_bufSize.y, Math.round(CAM_FEED_H * dpr));
          const sy = Math.max(0, _bufSize.y - sh);
          camCtx.clearRect(0, 0, CAM_PANEL_W, CAM_FEED_H);
          camCtx.drawImage(canvas, 0, sy, sw, sh, 0, 0, CAM_PANEL_W, CAM_FEED_H);
        }
      }

      // 2) Render Primary Full-Stage 3D Scene
      camera.aspect = Math.max(0.4, curW / curH);
      camera.updateProjectionMatrix();
      renderer.setViewport(0, 0, curW, curH);
      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1000;
      const h = container.clientHeight || 540;
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      benchTex.dispose();
      brushedTex.dispose();
      backdropTex.dispose();
      hopperScaleTex.dispose();
      trashBinTex.dispose();
      oled.texture.dispose();
      cupBadgeTextures.forEach((t) => t.dispose());
      if (numberRingTex) numberRingTex.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, []);

  const handlePresetChange = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === 'section') setShowSection(true);
    applyPresetRef.current?.(preset);
  };

  const handleStart = () => {
    setIsRunning(true);
    setControllerState('RUNNING');
    appendSerial(`> START → START,rate_sps=${params.targetRateSps.toFixed(2)},EN=LOW`);
  };

  const handleStop = () => {
    setIsRunning(false);
    setControllerState('IDLE');
    appendSerial('> STOP → STATE,STOPPED_BY_OPERATOR,EN=HIGH');
  };

  const handleEStop = () => {
    setIsRunning(false);
    setControllerState('STOPPED_BY_USER');
    appendSerial('STATE,E-STOP_ACTIVATED (EN=HIGH, привод обесточен, защита С6)');
  };

  const handleSetRate = (nextRate: number) => {
    const clamped = Math.min(6.0, Math.max(0.5, Math.round(nextRate * 10) / 10));
    onChangeParams({ ...params, targetRateSps: clamped });
    const nextRpm = (clamped * 60) / params.cellCount;
    const stepUs = Math.round(1_000_000 / ((nextRpm / 60) * 3200));
    appendSerial(`> SET_RATE ${clamped.toFixed(1)} → RATE_UPDATED,sps=${clamped.toFixed(2)},step_us=${stepUs}`);
  };

  const handleSerialCommand = (raw: string) => {
    const upper = raw.toUpperCase();
    if (upper === 'START') handleStart();
    else if (upper === 'STOP') handleStop();
    else if (upper === 'ESTOP' || upper === 'E-STOP' || upper === 'RESET') handleEStop();
    else if (upper === 'TRASH') injectTrashRef.current?.();
    else if (upper === 'JAM') triggerJamRef.current?.();
    else if (upper === 'RESET_CUPS') resetCupsRef.current?.();
    else if (upper.startsWith('SET_RATE ')) {
      const val = parseFloat(upper.slice(9));
      if (!Number.isNaN(val)) handleSetRate(val);
    } else {
      appendSerial(`> ${raw} → STATUS,state=${controllerState},sps=${params.targetRateSps.toFixed(1)}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-slate-50">
      {/* Left Parameter & Invariants Console */}
      <aside className="w-full lg:w-[356px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white overflow-y-auto p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Команда Assembler · Кейс AT9-3 (Часть А1)
          </p>
          <h1 className="text-lg font-bold text-slate-900 mt-1">
            Параметрический 3D САПР и стенд
          </h1>
        </div>

        {/* Variant Switcher */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Конструктивный вариант (1 изменяемый параметр)
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeParams(VARIANT_A_PARAMS)}
              className={`px-2.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                params.variantId === 'A'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Вариант A (c = 0 мм)
            </button>
            <button
              type="button"
              onClick={() => onChangeParams(VARIANT_B_PARAMS)}
              className={`px-2.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                params.variantId === 'B'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Вариант B (фаска 1.8)
            </button>
          </div>
        </div>

        {/* Parametric Controls */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700">Число ячеек N (С2)</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {params.cellCount} шт.
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[8, 12, 16].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChangeParams({ ...params, variantId: 'custom', cellCount: n })}
                  className={`py-1.5 text-xs font-mono font-semibold rounded border transition-colors ${
                    params.cellCount === n
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  N = {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Диаметр ячейки D_яч (С1)</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {params.cellDiameter.toFixed(1)} мм
              </span>
            </div>
            <input
              type="range"
              min={8.0}
              max={10.8}
              step={0.1}
              value={params.cellDiameter}
              onChange={(e) =>
                onChangeParams({ ...params, variantId: 'custom', cellDiameter: parseFloat(e.target.value) })
              }
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Глубина ячейки h_яч (С1)</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {params.cellDepth.toFixed(1)} мм
              </span>
            </div>
            <input
              type="range"
              min={6.4}
              max={8.6}
              step={0.1}
              value={params.cellDepth}
              onChange={(e) =>
                onChangeParams({ ...params, variantId: 'custom', cellDepth: parseFloat(e.target.value) })
              }
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Входная фаска c × 45°</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {params.entryChamfer.toFixed(1)} мм
              </span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.6}
              step={0.1}
              value={params.entryChamfer}
              onChange={(e) =>
                onChangeParams({ ...params, variantId: 'custom', entryChamfer: parseFloat(e.target.value) })
              }
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Толщина диска H</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {params.thickness.toFixed(1)} мм
              </span>
            </div>
            <input
              type="range"
              min={8.5}
              max={12.0}
              step={0.5}
              value={params.thickness}
              onChange={(e) =>
                onChangeParams({ ...params, variantId: 'custom', thickness: parseFloat(e.target.value) })
              }
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Скорость подачи Q (С5 · OLED)</span>
              <span className="font-mono font-semibold text-teal-800 tabular-nums">
                {params.targetRateSps.toFixed(1)} сем/с
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.5}
              value={params.targetRateSps}
              onChange={(e) => handleSetRate(parseFloat(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Live Geometric & Kinematic Invariants */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Проверка инвариантов</span>
            {invariants.valid ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Норма
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5" /> Внимание
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500">Перемычка</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {invariants.webThicknessMm.toFixed(2)} мм
              </div>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500">Дно ячейки</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {invariants.bottomFloorMm.toFixed(2)} мм
              </div>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500">Частота вращ.</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {invariants.rpm.toFixed(2)} об/мин
              </div>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded">
              <div className="text-slate-500">Интервал / Зап.</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {invariants.eventIntervalMs.toFixed(0)} / {invariants.fillTimeMs.toFixed(0)} мс
              </div>
            </div>
          </div>

          {!invariants.valid && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
              {invariants.warnings.map((w, idx) => (
                <div key={idx}>{w}</div>
              ))}
            </div>
          )}
        </div>

        {/* Direct CAD Downloads */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() =>
              downloadDiscStl(
                params,
                `disk_${params.variantId}_N${params.cellCount}_c${params.entryChamfer.toFixed(1)}.stl`
              )
            }
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Скачать STL текущего диска
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                downloadTextFile(generateDiscOpenScad(params), 'seeder_disc_parametric.scad')
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Диск .scad
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(generateAssemblyOpenScad(params), 'seeder_assembly.scad')
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Сборка .scad
            </button>
          </div>
          <button
            type="button"
            onClick={downloadHousingStl}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Скачать STL корпуса
          </button>
        </div>
      </aside>

      {/* Right Column: Top 3D Stage + Live Camera Feed + Bottom PC Operator Console */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Row: 3D Stage + Dedicated Live Camera Panel */}
        <div className="flex flex-col md:flex-row h-[540px] lg:h-[58vh] min-h-[480px] bg-slate-200 relative">
          {/* 3D WebGL Canvas */}
          <div className="relative flex-1 min-w-0 h-full overflow-hidden">
            {webglError ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-600 mb-3" />
                <p className="text-sm font-semibold text-slate-900">{webglError}</p>
              </div>
            ) : (
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}

            {/* Top-Left Compact Telemetry & Cycle Readout */}
            <div className="pointer-events-none absolute top-3 left-3 bg-white/95 border border-slate-200 rounded-lg px-3 py-2 shadow-sm max-w-[420px]">
              <div className="text-xs font-semibold text-slate-900">
                Assembler · Бункер → Диск → Лазер → Стакан #1–8 / Ветка мусора
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className="font-semibold text-teal-800">{params.targetRateSps.toFixed(1)} сем/с</span>
                <span aria-hidden="true">·</span>
                <span>Яч.#{liveTelemetry.activeCell}</span>
                <span aria-hidden="true">·</span>
                <span>Ст.#{liveTelemetry.activeCup}</span>
                <span aria-hidden="true">·</span>
                <span className={liveTelemetry.laserAlert ? 'text-red-700 font-bold' : 'text-slate-600'}>
                  {liveTelemetry.laserAlert ? 'ЛАЗЕР: ОТВОД!' : `Мусор: ${liveTelemetry.trash}`}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                Узел: <span className="font-medium text-slate-800">{hoveredPart}</span>
              </div>
            </div>

            {/* Collapsible Bottom Control Dock inside 3D Stage */}
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex flex-col items-center z-20 px-3">
              <div className="pointer-events-auto flex flex-col items-center max-w-full">
                <button
                  type="button"
                  onClick={() => setDockCollapsed((v) => !v)}
                  className="mb-1 inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/95 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 hover:text-slate-900 shadow-sm whitespace-nowrap"
                >
                  {dockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {dockCollapsed ? 'Управление 3D' : 'Свернуть'}
                </button>

                {!dockCollapsed && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white/95 border border-slate-200 rounded-xl px-3 py-1.5 shadow-md">
                    <button
                      type="button"
                      onClick={() => (isRunning ? handleStop() : handleStart())}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        isRunning
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-teal-700 text-white hover:bg-teal-800'
                      }`}
                    >
                      {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isRunning ? 'Стоп' : 'Пуск'}
                    </button>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
                      <Gauge className="w-3.5 h-3.5 text-teal-700" />
                      <button
                        type="button"
                        onClick={() => handleSetRate(params.targetRateSps - 0.5)}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-mono font-bold text-slate-800"
                      >
                        −
                      </button>
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums min-w-[46px] text-center">
                        {params.targetRateSps.toFixed(1)}/с
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetRate(params.targetRateSps + 0.5)}
                        className="px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded text-xs font-mono font-bold text-teal-800"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerJamRef.current?.()}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold whitespace-nowrap"
                      title="Смоделировать заклинивание и автоматический реверс"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      Клин
                    </button>

                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-1.5">
                      <span className="text-[11px] font-medium text-slate-600">Разнос</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={exploded}
                        onChange={(e) => setExploded(parseFloat(e.target.value))}
                        className="w-14 accent-teal-700 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
                      <button
                        type="button"
                        onClick={() => setShowSection((s) => !s)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          showSection
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Scissors className="w-3 h-3" />
                        Сечение
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCover((c) => !c)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          showCover
                            ? 'bg-teal-50 border-teal-300 text-teal-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        Крышка
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCameraFeed((f) => !f)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          showCameraFeed
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        Камера
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
                      {(['iso', 'front', 'section', 'top'] as CameraPreset[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePresetChange(p)}
                          className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            cameraPreset === p
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p === 'iso' ? 'Изо' : p === 'front' ? 'Фронт' : p === 'section' ? 'Сбоку' : 'Верх'}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setExploded(0);
                          setShowSection(false);
                          setShowCover(true);
                          handlePresetChange('iso');
                        }}
                        title="Сбросить вид"
                        className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const canvas = mountRef.current?.querySelector('canvas');
                          if (!canvas) return;
                          canvas.toBlob((blob) => {
                            if (blob) triggerBlobDownload(blob, `AT9-3_3D_${cameraPreset}.png`);
                          }, 'image/png');
                        }}
                        title="Сохранить снимок 3D-модели (.png) для презентации"
                        className="p-1 text-teal-700 hover:text-teal-900 rounded hover:bg-teal-50 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Right Live Camera Panel (Real <canvas> synced every frame!) */}
          {showCameraFeed && (
            <div
              className="hidden md:flex flex-col border-l border-slate-300 bg-white shrink-0 h-full overflow-hidden"
              style={{ width: `${CAM_PANEL_W}px` }}
            >
              {/* Real 2D <canvas> displaying direct feed from 3D inspectionCam */}
              <div className="relative bg-slate-900 border-b border-slate-300 shrink-0" style={{ height: `${CAM_FEED_H}px` }}>
                <canvas
                  ref={camFeedCanvasRef}
                  width={CAM_PANEL_W}
                  height={CAM_FEED_H}
                  className="block w-full h-full"
                />

                {/* Crisp Reticle HUD over Live Camera Video */}
                <div className="pointer-events-none absolute top-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono">
                  <span className="px-2 py-0.5 bg-slate-900/80 text-white rounded">
                    КАМЕРА А4 · 60 FPS
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-semibold ${
                      liveTelemetry.laserAlert
                        ? 'bg-red-600 text-white'
                        : liveTelemetry.ledActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900/75 text-slate-200'
                    }`}
                  >
                    {liveTelemetry.laserAlert
                      ? 'ЛАЗЕР: МУСОР!'
                      : liveTelemetry.ledActive
                        ? 'SYNC LED ON'
                        : 'REC · 1/500 с'}
                  </span>
                </div>

                <div className="pointer-events-none absolute inset-7 border border-dashed border-teal-400/50 rounded" />

                <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white">
                  <span className="px-1.5 py-0.5 bg-slate-900/80 rounded">
                    Яч.#{liveTelemetry.activeCell} → Ст.#{liveTelemetry.activeCup}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-900/80 rounded">Кронштейн 2020</span>
                </div>
              </div>

              {/* Counters, Trash Controls & Frame Log */}
              <div className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto bg-white">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className="text-xs font-bold text-slate-900">
                      Видеорегистрация (А4)
                    </h2>
                    <button
                      type="button"
                      onClick={() => setStressMode((m) => !m)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors ${
                        stressMode
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {stressMode ? 'Стресс (0/2+)' : 'Штатная (1)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs tabular-nums">
                    <div className="p-1.5 bg-teal-50 border border-teal-200 rounded">
                      <div className="text-[10px] text-teal-800">Норма</div>
                      <div className="font-bold text-teal-900">{liveTelemetry.singles}</div>
                    </div>
                    <div className="p-1.5 bg-red-50 border border-red-200 rounded">
                      <div className="text-[10px] text-red-800">Мусор</div>
                      <div className="font-bold text-red-900">{liveTelemetry.trash}</div>
                    </div>
                    <div className="p-1.5 bg-amber-50 border border-amber-200 rounded">
                      <div className="text-[10px] text-amber-800">Дубли</div>
                      <div className="font-bold text-amber-900">{liveTelemetry.doubles}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-600">Проп.</div>
                      <div className="font-bold text-slate-900">{liveTelemetry.misses}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => injectTrashRef.current?.()}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Подбросить мусор
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrashAutoMode((v) => !v)}
                      className={`px-2 py-1.5 text-[11px] font-semibold rounded border transition-colors ${
                        trashAutoMode
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {trashAutoMode ? 'Примесь: авто' : 'Чисто'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {cameraEvents.length === 0 ? (
                      <div className="text-xs text-slate-400 py-1">Ожидание прохода ячейки...</div>
                    ) : (
                      cameraEvents.map((ev) => (
                        <div
                          key={ev.uid}
                          className="flex items-center justify-between px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono tabular-nums"
                        >
                          <span className="text-slate-700">
                            #{ev.seq} · Яч.{ev.cellIdx} → {ev.cupLabel}
                          </span>
                          <span
                            className={`font-semibold ${
                              ev.outcome === '1'
                                ? 'text-teal-700'
                                : ev.outcome === 'МУСОР'
                                  ? 'text-red-700'
                                  : ev.outcome === '2+'
                                    ? 'text-amber-700'
                                    : 'text-slate-600'
                            }`}
                          >
                            {ev.outcome}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explanatory Engineering Callout Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-700">
          <div className="flex items-start gap-2">
            <span className="font-mono font-bold text-teal-800 shrink-0">Ø17 мм</span>
            <span>
              <strong className="text-slate-900">Отверстие сброса:</strong> сквозная горловина с фаской под нижней ячейкой диска для свободного падения семян.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono font-bold text-sky-800 shrink-0">А4 1мм</span>
            <span>
              <strong className="text-slate-900">Табличка сзади — Калибровочная мишень:</strong> эталонная линейка на кронштейнах для точных замеров камеры 60 fps.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono font-bold text-red-700 shrink-0">650 нм</span>
            <span>
              <strong className="text-slate-900">Мост датчиков:</strong> оптопара LM393 (шаг) + лазер KY-008 с фотоприёмником и заслонкой SG90 (отвод мусора).
            </span>
          </div>
        </div>

        {/* Bottom: Realistic PC Operator Program (COM3 · 115200 baud) */}
        <PcOperatorConsole
          params={params}
          isRunning={isRunning}
          controllerState={controllerState}
          liveTelemetry={liveTelemetry}
          serialLog={serialLog}
          onStart={handleStart}
          onStop={handleStop}
          onEStop={handleEStop}
          onSetRate={handleSetRate}
          onInjectTrash={() => injectTrashRef.current?.()}
          onTriggerJam={() => triggerJamRef.current?.()}
          onResetCups={() => resetCupsRef.current?.()}
          onSendCommand={handleSerialCommand}
        />
      </div>
    </div>
  );
};
