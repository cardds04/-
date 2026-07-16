import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { AVATARS, LOCATIONS, MISSIONS, ECONOMY } from "./data.js";
import { evaluateSentence } from "./correction.js";

const $ = (selector) => document.querySelector(selector);
const WORLD_LIMIT = 23;
const CAMERA_LOOK_MIN = -0.9;
const CAMERA_LOOK_MAX = 3.2;
const CAMERA_LOOK_SENSITIVITY = 0.015;
const STORAGE_BASE = "english_travel_3d_v1";
const SELECTED_KID_KEY = "family_todos_selected_kid_id";
const SYNC_STAMP_BASE = "study_game_local_saved_at_v1";
const CHARACTER_EMOJI = {
  "female-a": "👧🏻",
  "male-a": "👦🏻",
};
const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));
const MISSION_SEQUENCE = [...MISSIONS];
const MISSION_SEQUENCE_INDEX = new Map(MISSION_SEQUENCE.map((mission, index) => [mission.id, index]));
const missionAtStep = (step = state?.missionStep || 0) => MISSION_SEQUENCE[step] || null;
const currentMission = () => missionAtStep();
const missionNumber = (mission) => (MISSION_SEQUENCE_INDEX.get(mission?.id) ?? -1) + 1;
const missionLocation = (mission = currentMission()) => LOCATIONS.find((location) => location.id === mission?.locationId) || null;
const displayMissionTitle = (mission) => String(mission?.titleKo || "").replace(/^미션\s*\d+\s*·\s*/, "");

const ASSET = {
  city: "assets/english-travel-3d/models/city",
  roads: "assets/english-travel-3d/models/roads",
  furniture: "assets/english-travel-3d/models/furniture",
  market: "assets/english-travel-3d/models/market",
  food: "assets/english-travel-3d/models/food",
  nature: "assets/english-travel-3d/models/nature",
};

const path = (group, file) => `${ASSET[group]}/${file}.glb`;

const PLACE_CONFIG = {
  airport: {
    building: "building-h",
    props: [
      ["furniture", "kitchenBar", -3.6, 2.2, 1.1, 0],
      ["furniture", "kitchenBar", -.3, 2.2, 1.1, 0],
      ["furniture", "desk", -1.8, -.8, 1.05, 0],
      ["furniture", "televisionModern", 2.6, 2.4, 2.15, 0],
      ["furniture", "bench", 3.4, -.9, .78, Math.PI],
      ["furniture", "bench", -3.5, -2.8, .78, 0],
      ["furniture", "bench", .2, -3.4, .78, 0],
      ["market", "shelf-bags", 5, 1.2, 1.45, Math.PI / 2],
      ["market", "shopping-cart", 4.5, -2.5, .82, -.3],
      ["roads", "sign-highway", -5.4, -.1, 1.9, -.25],
      ["roads", "sign-highway", 5.5, -1.1, 1.9, .25],
      ["roads", "light-square", 6.2, .8, 2.7, 0],
      ["roads", "light-square", -6.2, -2, 2.7, 0],
    ],
  },
  hotel: {
    building: "building-e",
    props: [
      ["furniture", "loungeSofa", -2.1, -.4, .9, .5],
      ["furniture", "lampRoundFloor", 2.2, -.7, 1.5, 0],
      ["furniture", "pottedPlant", 3.1, .7, 1.2, 0],
      ["furniture", "bedDouble", -3, 1.4, .65, .1],
    ],
  },
  restaurant: {
    building: "building-d",
    props: [
      ["city", "detail-parasol-a", -2.5, -.1, 2.1, 0],
      ["furniture", "tableRound", -2.5, -.1, .8, 0],
      ["furniture", "chair", -3.3, -.2, .8, 1.4],
      ["furniture", "kitchenCoffeeMachine", 2.5, .4, .75, -.2],
      ["food", "pizza", -2.5, -.1, .18, 0, .77],
    ],
  },
  shop: {
    building: "building-c",
    props: [
      ["market", "display-bread", -2.4, -.1, 1.15, .25],
      ["market", "display-fruit", 2.2, -.1, 1.15, -.25],
      ["market", "cash-register", .4, -1, .65, Math.PI],
      ["market", "shopping-cart", 3.2, 1, .8, -.5],
      ["city", "detail-awning", 0, 2.5, 1.3, 0],
    ],
  },
  transit: {
    building: "low-detail-building-b",
    props: [
      ["roads", "sign-highway", -2.7, .3, 1.8, .3],
      ["roads", "light-square", 3.1, .3, 2.7, 0],
      ["furniture", "bench", 2.2, -1.1, .75, Math.PI / 2],
    ],
  },
  museum: {
    building: "building-h",
    props: [
      ["furniture", "bookcaseOpen", -2.4, .2, 1.45, .15],
      ["furniture", "bench", 2.5, -.7, .75, -.2],
      ["furniture", "pottedPlant", 3.1, .7, 1.2, 0],
      ["nature", "rock_largeA", -3.4, 1.2, 1.15, 0],
    ],
  },
  park: {
    building: null,
    props: [
      ["nature", "tree_oak", -3.8, 1.2, 4.7, .2],
      ["nature", "tree_default", 3.8, 1.8, 4.2, -.3],
      ["nature", "tree_palm", -3.2, -2, 4.1, .1],
      ["furniture", "bench", 2.2, -.8, .8, -.7],
      ["nature", "flower_redA", 1.2, 1.7, .65, 0],
      ["nature", "flower_yellowA", 2, 1.5, .65, 0],
      ["food", "ice-cream-cup", -.9, -.8, .26, 0],
    ],
  },
  help: {
    building: "building-a",
    props: [
      ["furniture", "desk", -1.9, -.4, 1.05, .2],
      ["furniture", "chairCushion", .1, -1.3, .9, Math.PI],
      ["furniture", "loungeSofa", 2.5, .2, .82, -.25],
      ["furniture", "pottedPlant", 3.2, 1.2, 1.2, 0],
    ],
  },
};

const AMBIENT_CHAT_LINES = [
  { actor: 0, en: "Is this the check-in line?", ko: "여기가 체크인 줄인가요?" },
  { actor: 1, en: "Yes, I think so.", ko: "네, 그런 것 같아요." },
  { actor: 2, en: "Your suitcase is cute!", ko: "여행 가방이 귀엽네요!" },
  { actor: 3, en: "Thank you. Have a nice trip!", ko: "고마워요. 즐거운 여행 되세요!" },
  { actor: 4, en: "The airport is busy today.", ko: "오늘 공항이 붐비네요." },
];

const dom = {
  gameStage: $("#gameStage"),
  canvas: $("#gameCanvas"),
  loadingScreen: $("#loadingScreen"),
  loadingBar: $("#loadingBar"),
  loadingText: $("#loadingText"),
  welcome: $("#welcomeScreen"),
  avatarOptions: $("#avatarOptions"),
  travelerName: $("#travelerName"),
  startButton: $("#startButton"),
  passportButton: $("#passportButton"),
  passportPanel: $("#passportPanel"),
  passportClose: $("#passportClose"),
  passportName: $("#passportName"),
  stampGrid: $("#stampGrid"),
  lifeButton: $("#lifeButton"),
  lifePanel: $("#lifePanel"),
  lifeClose: $("#lifeClose"),
  lifeCoinCount: $("#lifeCoinCount"),
  lifeCurrent: $("#lifeCurrent"),
  lifeCatalog: $("#lifeCatalog"),
  lifeHelp: $("#lifeHelp"),
  surpriseAlert: $("#surpriseAlert"),
  surpriseTitle: $("#surpriseTitle"),
  surpriseMissionTitle: $("#surpriseMissionTitle"),
  surpriseMissionGoal: $("#surpriseMissionGoal"),
  surpriseReward: $("#surpriseReward"),
  surpriseStart: $("#surpriseStart"),
  surpriseLater: $("#surpriseLater"),
  stampCount: $("#stampCount"),
  coinCount: $("#coinCount"),
  levelCount: $("#levelCount"),
  missionTitle: $("#missionTitle"),
  missionBadge: $("#missionBadge"),
  missionGoal: $("#missionGoal"),
  missionDoneCount: $("#missionDoneCount"),
  missionProgressBar: $("#missionProgressBar"),
  needFood: $("#needFood"),
  needEnergy: $("#needEnergy"),
  needConfidence: $("#needConfidence"),
  miniMapGrid: $("#miniMapGrid"),
  areaName: $("#areaName"),
  interactButton: $("#interactButton"),
  interactLabel: $("#interactLabel"),
  interactHint: $("#interactHint"),
  soundToggle: $("#soundToggle"),
  topHud: $(".top-hud"),
  toast: $("#toast"),
  missionWayfinder: $("#missionWayfinder"),
  wayfinderArrow: $("#wayfinderArrow"),
  wayfinderName: $("#wayfinderName"),
  wayfinderDistance: $("#wayfinderDistance"),
  ambientBubble: $("#ambientBubble"),
  ambientBubbleEn: $("#ambientBubbleEn"),
  ambientBubbleKo: $("#ambientBubbleKo"),
  worldConversation: $("#worldConversation"),
  conversationComposer: $("#conversationComposer"),
  npcWorldBubble: $("#npcWorldBubble"),
  npcBubbleName: $("#npcBubbleName"),
  npcBubbleText: $("#npcBubbleText"),
  npcWorldReplay: $("#npcWorldReplay"),
  npcWorldCaptionToggle: $("#npcWorldCaptionToggle"),
  playerWorldBubble: $("#playerWorldBubble"),
  playerBubbleText: $("#playerBubbleText"),
  worldHintPopup: $("#worldHintPopup"),
  worldHintText: $("#worldHintText"),
  worldReplyInput: $("#worldReplyInput"),
  worldClearButton: $("#worldClearButton"),
  worldSendButton: $("#worldSendButton"),
  worldVoiceState: $("#worldVoiceState"),
  worldCoach: $("#worldCoach"),
  dialogue: $("#dialogueSheet"),
  dialogueClose: $("#dialogueClose"),
  npcAvatar: $("#npcAvatar"),
  npcRole: $("#npcRole"),
  npcName: $("#npcName"),
  turnCount: $("#turnCount"),
  dialogueMissionBrief: $("#dialogueMissionBrief"),
  dialogueMissionBadge: $("#dialogueMissionBadge"),
  dialogueMissionTitle: $("#dialogueMissionTitle"),
  dialogueMissionGoal: $("#dialogueMissionGoal"),
  missionGoalList: $("#missionGoalList"),
  npcLine: $("#npcLine"),
  npcListenCue: $("#npcListenCue"),
  npcReplay: $("#npcReplay"),
  lineRevealToggle: $("#lineRevealToggle"),
  translationToggle: $("#translationToggle"),
  npcTranslation: $("#npcTranslation"),
  conversationTrail: $("#conversationTrail"),
  conversationTrailList: $("#conversationTrailList"),
  historyToggle: $("#historyToggle"),
  answerZone: $("#answerZone"),
  answerHint: $("#answerHint"),
  hintToggle: $("#hintToggle"),
  phraseChips: $("#phraseChips"),
  micButton: $("#micButton"),
  answerInput: $("#answerInput"),
  answerSubmit: $("#answerSubmit"),
  evaluationProgress: $("#evaluationProgress"),
  heardBox: $("#heardBox"),
  heardText: $("#heardText"),
  correctionCard: $("#correctionCard"),
  correctionStatus: $("#correctionStatus"),
  correctedSentence: $("#correctedSentence"),
  correctionReason: $("#correctionReason"),
  correctedReplay: $("#correctedReplay"),
  retryButton: $("#retryButton"),
  offlineContinueButton: $("#offlineContinueButton"),
  nextTurnButton: $("#nextTurnButton"),
  rewardScreen: $("#rewardScreen"),
  rewardIcon: $("#rewardIcon"),
  rewardTitle: $("#rewardTitle"),
  rewardPhrase: $("#rewardPhrase"),
  rewardXp: $("#rewardXp"),
  rewardCoins: $("#rewardCoins"),
  rewardExtra: $("#rewardExtra"),
  rewardContinue: $("#rewardContinue"),
  joystickWrap: $("#joystickWrap"),
  joystickBase: $("#joystickBase"),
  joystickKnob: $("#joystickKnob"),
};

function namespacedKey(base) {
  const kid = localStorage.getItem(SELECTED_KID_KEY);
  return kid ? `${base}:${kid}` : base;
}

function defaultState() {
  return {
    version: 3,
    started: false,
    avatarId: AVATARS[0].id,
    travelerName: "Jin",
    xp: 0,
    coins: 0,
    completed: [],
    completedMissions: [],
    completedSurprises: [],
    missionStep: 0,
    rewardGrants: [],
    pendingSurpriseMissionId: null,
    ownedOutfits: [],
    equippedOutfit: null,
    completedActivities: [],
    ownedLodgings: ["standard-room"],
    currentLodging: "standard-room",
    lastRestAt: 0,
    needs: { food: 72, energy: 78, confidence: 55 },
    position: { x: 0, z: 0 },
  };
}

function loadState() {
  const fallback = defaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(namespacedKey(STORAGE_BASE)) || "null");
    if (!stored || typeof stored !== "object") return fallback;
    const positionX = Number(stored.position?.x);
    const positionZ = Number(stored.position?.z);
    const validMissionIds = new Set(MISSIONS.map((mission) => mission.id));
    const validOutfits = new Set(ECONOMY.outfits.map((item) => item.id));
    const validActivities = new Set(ECONOMY.activities.map((item) => item.id));
    const validLodgings = new Set(ECONOMY.lodgings.map((item) => item.id));
    const ownedLodgings = Array.isArray(stored.ownedLodgings)
      ? [...new Set(stored.ownedLodgings.filter((id) => validLodgings.has(id)))]
      : ["standard-room"];
    if (!ownedLodgings.includes("standard-room")) ownedLodgings.unshift("standard-room");
    const isCurrentJourney = Number(stored.version) >= 3;
    return {
      ...fallback,
      ...stored,
      version: 3,
      xp: Math.max(0, Math.floor(Number(stored.xp) || 0)),
      coins: Math.max(0, Math.floor(Number(stored.coins) || 0)),
      completed: isCurrentJourney && Array.isArray(stored.completed)
        ? [...new Set(stored.completed.filter((id) => LOCATIONS.some((loc) => loc.id === id)))]
        : [],
      completedMissions: isCurrentJourney && Array.isArray(stored.completedMissions)
        ? [...new Set(stored.completedMissions.filter((id) => validMissionIds.has(id)))]
        : [],
      completedSurprises: [],
      missionStep: isCurrentJourney
        ? THREE.MathUtils.clamp(Math.floor(Number(stored.missionStep) || 0), 0, MISSION_SEQUENCE.length)
        : 0,
      rewardGrants: Array.isArray(stored.rewardGrants)
        ? [...new Set(stored.rewardGrants.filter((id) => typeof id === "string").slice(-60))]
        : [],
      pendingSurpriseMissionId: null,
      ownedOutfits: Array.isArray(stored.ownedOutfits) ? [...new Set(stored.ownedOutfits.filter((id) => validOutfits.has(id)))] : [],
      equippedOutfit: validOutfits.has(stored.equippedOutfit) ? stored.equippedOutfit : null,
      completedActivities: Array.isArray(stored.completedActivities) ? [...new Set(stored.completedActivities.filter((id) => validActivities.has(id)))] : [],
      ownedLodgings,
      currentLodging: ownedLodgings.includes(stored.currentLodging) ? stored.currentLodging : "standard-room",
      lastRestAt: Number.isFinite(Number(stored.lastRestAt)) ? Number(stored.lastRestAt) : 0,
      needs: { ...fallback.needs, ...(stored.needs || {}) },
      position: {
        x: Number.isFinite(positionX) ? THREE.MathUtils.clamp(positionX, -WORLD_LIMIT, WORLD_LIMIT) : 0,
        z: Number.isFinite(positionZ) ? THREE.MathUtils.clamp(positionZ, -WORLD_LIMIT, WORLD_LIMIT) : 0,
      },
    };
  } catch {
    return fallback;
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(namespacedKey(STORAGE_BASE), JSON.stringify(state));
    localStorage.setItem(namespacedKey(SYNC_STAMP_BASE), String(Date.now()));
  } catch {
    // The game remains playable if private browsing blocks storage.
  }
}

let scene;
let camera;
let renderer;
let clock;
let loader;
let cameraLookOffset = 0;
let cameraLookTarget = 0;
let dialogueCameraBlend = 0;
let dialogueCameraReady = false;
let worldGround;
let worldBorder;
let roadsGroup;
let sceneryGroup;
let player;
let playerActor;
let mapPlayer;
let nearestLocation = null;
let activeLocation = null;
let activeTurnIndex = 0;
let activeMission = null;
let activeMissionGoalIds = new Set();
let activeMissionStateToken = null;
let missionAttemptCount = 0;
let activeResult = null;
// Set when the NPC just asked to clarify/confirm. `question` becomes the next
// currentNpcLine; `sentence` (specific confirmations only) is what a plain
// "yes" from the learner confirms.
let pendingClarify = null;
let started = false;
let soundEnabled = true;
let capturePhase = "idle";
let audioRecorder = null;
let audioStream = null;
let audioChunks = [];
let audioCaptureId = 0;
let audioCaptureContext = null;
let audioMaxTimer = null;
let audioRequestController = null;
let npcSpeaking = false;
let learnerTurnReady = false;
let speechSequence = 0;
let activeUtterance = null;
let playerBubbleTimer = null;
let toastTimer = null;
let loadingFinished = false;
let dialogueSession = 0;
let evaluationSequence = 0;
let evaluationController = null;
let evaluationPending = false;
let conversationHistory = [];
let conversationTrailVisible = false;
let activeLifeTab = "food";
let outfitSprite = null;
let lifeRestTimer = null;
let activeSceneLocationId = "";
let ambientSpeaker = null;
let ambientChatIndex = 0;
let ambientLineEndsAt = 0;
let nextAmbientLineAt = 0;
const dynamicPrompts = new Map();
const followUpCounts = new Map();
const AFFIRMATION_PATTERN = /^(?:yes|yeah|yep|yup|sure|right|correct|okay|ok|exactly|that's right|that is right|yes please|yes it is|yes i did)[\s.,!?]*$/i;
const missionSessionCache = new Map();
const cache = new Map();
const mixers = [];
const npcActors = new Map();
const locationRings = new Map();
const locationLabels = new Map();
const locationGroups = new Map();
const ambientActors = [];
const keys = new Set();
const joystick = new THREE.Vector2();
const cameraTarget = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();
const exploreCameraPosition = new THREE.Vector3();
const exploreCameraTarget = new THREE.Vector3();
const dialogueCameraPosition = new THREE.Vector3();
const dialogueCameraTarget = new THREE.Vector3();
const dialogueMidpoint = new THREE.Vector3();
const movement = new THREE.Vector3();
const projectedPoint = new THREE.Vector3();
const wayfinderTarget = new THREE.Vector3();
const wayfinderView = new THREE.Vector3();
const wayfinderNdc = new THREE.Vector3();
const wayfinderPlayerNdc = new THREE.Vector3();
const wayfinderDelta = new THREE.Vector3();
const wayfinderRight = new THREE.Vector3();
const wayfinderUp = new THREE.Vector3();
let wayfinderMissionId = "";
let wayfinderMeters = -1;
let wayfinderBounds = { left: 90, right: 900, top: 145, bottom: 600 };

function showToast(message, timeout = 2800) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  requestAnimationFrame(refreshWayfinderBounds);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove("is-visible");
    requestAnimationFrame(refreshWayfinderBounds);
  }, timeout);
}

function clampNeed(value) {
  return Math.max(12, Math.min(100, Number(value) || 0));
}

function updateHud() {
  const done = state.missionStep;
  const targetMission = currentMission();
  dom.stampCount.textContent = String(state.completed.length);
  dom.coinCount.textContent = String(state.coins);
  dom.lifeCoinCount.textContent = String(state.coins);
  dom.levelCount.textContent = String(Math.floor(state.xp / 250) + 1);
  dom.missionDoneCount.textContent = String(done);
  dom.missionProgressBar.style.width = `${(done / Math.max(1, MISSION_SEQUENCE.length)) * 100}%`;
  dom.needFood.style.width = `${clampNeed(state.needs.food)}%`;
  dom.needEnergy.style.width = `${clampNeed(state.needs.energy)}%`;
  dom.needConfidence.style.width = `${clampNeed(state.needs.confidence)}%`;
  dom.passportName.textContent = (state.travelerName || "TRAVELER").toUpperCase();

  LOCATIONS.forEach((location) => {
    const doneHere = state.completed.includes(location.id);
    const isTarget = targetMission?.locationId === location.id;
    const dot = dom.miniMapGrid.querySelector(`[data-location="${location.id}"]`);
    dot?.classList.toggle("is-done", doneHere);
    dot?.classList.toggle("is-target", isTarget);
    const stamp = dom.stampGrid.querySelector(`[data-stamp="${location.id}"]`);
    stamp?.classList.toggle("is-done", doneHere);
    const ring = locationRings.get(location.id);
    if (ring) {
      ring.material.color.set(isTarget ? 0xffc147 : doneHere ? 0x40d29c : location.color);
      ring.material.emissive?.set(isTarget ? 0xffc147 : doneHere ? 0x40d29c : location.color);
      ring.material.opacity = isTarget ? 1 : doneHere ? 0.4 : 0.26;
    }
  });
}

function renderStaticUi() {
  dom.avatarOptions.innerHTML = "";
  AVATARS.forEach((avatar) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-option";
    button.dataset.avatar = avatar.id;
    button.innerHTML = `<span aria-hidden="true">${CHARACTER_EMOJI[avatar.id] || "🧒"}</span><b>${avatar.nameKo}</b>`;
    button.addEventListener("click", async () => {
      state.avatarId = avatar.id;
      renderAvatarSelection();
      if (loadingFinished) await swapPlayerActor();
    });
    dom.avatarOptions.appendChild(button);
  });
  dom.travelerName.value = state.travelerName || "Jin";
  renderAvatarSelection();

  dom.stampGrid.innerHTML = "";
  dom.miniMapGrid.innerHTML = "";
  LOCATIONS.forEach((location, index) => {
    const stamp = document.createElement("div");
    stamp.className = "passport-stamp";
    stamp.dataset.stamp = location.id;
    stamp.style.setProperty("--stamp-color", location.color);
    stamp.style.setProperty("--stamp-rotate", `${(index % 2 ? 5 : -5) + index / 2}deg`);
    stamp.innerHTML = `<span>${location.icon}<small>${location.titleEn.toUpperCase()}</small></span>`;
    dom.stampGrid.appendChild(stamp);

    const dot = document.createElement("span");
    dot.className = "map-dot";
    dot.dataset.location = location.id;
    dot.style.setProperty("--dot-color", location.color);
    dot.style.left = `${((location.npc.position[0] + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100}%`;
    dot.style.top = `${((WORLD_LIMIT - location.npc.position[1]) / (WORLD_LIMIT * 2)) * 100}%`;
    dot.textContent = location.icon;
    dom.miniMapGrid.appendChild(dot);
  });
  mapPlayer = document.createElement("span");
  mapPlayer.className = "map-player";
  dom.miniMapGrid.appendChild(mapPlayer);
  updateHud();
}

function renderAvatarSelection() {
  dom.avatarOptions.querySelectorAll(".avatar-option").forEach((button) => {
    const selected = button.dataset.avatar === state.avatarId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function setLoading(percent, message) {
  dom.loadingBar.style.width = `${Math.max(2, Math.min(100, percent))}%`;
  dom.loadingText.textContent = `${message} ${Math.round(percent)}%`;
}

function setupRenderer() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9bddf2);
  scene.fog = new THREE.Fog(0x9bddf2, 31, 67);
  camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 140);
  camera.position.set(9, 9, 12);
  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  clock = new THREE.Clock();
  loader = new GLTFLoader();

  const hemi = new THREE.HemisphereLight(0xdaf7ff, 0x6c9852, 2.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0cf, 3.35);
  sun.position.set(-15, 26, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 75;
  sun.shadow.bias = -0.00035;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(38, 64),
    new THREE.MeshStandardMaterial({ color: 0x83c96d, roughness: .95, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  worldGround = ground;

  const border = new THREE.Mesh(
    new THREE.RingGeometry(37.5, 42, 64),
    new THREE.MeshStandardMaterial({ color: 0x68a7c8, roughness: .8 }),
  );
  border.rotation.x = -Math.PI / 2;
  border.position.y = -.03;
  scene.add(border);
  worldBorder = border;
}

function requiredAssetPaths() {
  const paths = new Set();
  AVATARS.forEach((avatar) => paths.add(avatar.model));
  LOCATIONS.forEach((location) => {
    paths.add(location.npc.model);
    const config = PLACE_CONFIG[location.id];
    if (config?.building) paths.add(path("city", config.building));
    config?.props.forEach(([group, file]) => paths.add(path(group, file)));
  });
  ["road-straight", "road-crossroad", "road-crossing", "road-bend", "light-square"].forEach((file) => paths.add(path("roads", file)));
  ["tree_default", "tree_oak", "plant_bush", "grass_large", "flower_yellowA"].forEach((file) => paths.add(path("nature", file)));
  return [...paths];
}

async function loadAsset(url) {
  if (cache.has(url)) return cache.get(url);
  try {
    const gltf = await loader.loadAsync(url);
    cache.set(url, gltf);
    return gltf;
  } catch (error) {
    console.warn(`Could not load 3D asset: ${url}`, error);
    cache.set(url, null);
    return null;
  }
}

async function preloadAssets() {
  const urls = requiredAssetPaths();
  let complete = 0;
  await Promise.all(urls.map(async (url) => {
    await loadAsset(url);
    complete += 1;
    const percent = 8 + (complete / urls.length) * 58;
    setLoading(percent, complete < urls.length * .45 ? "도시 건물을 세우는 중…" : "캐릭터가 옷을 입는 중…");
  }));
}

function prepareModel(object, options = {}) {
  const {
    height = null,
    footprint = null,
    shadows = true,
  } = options;
  const wrapper = new THREE.Group();
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const horizontal = Math.max(size.x, size.z);
  const scale = height && size.y > 0
    ? height / size.y
    : footprint && horizontal > 0
      ? footprint / horizontal
      : 1;
  object.scale.multiplyScalar(scale);
  object.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = shadows;
    child.receiveShadow = shadows;
    if (child.material?.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
  });
  wrapper.add(object);
  return wrapper;
}

function fallbackModel(color = 0xff8a6a, height = 1) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(.8, height, .8),
    new THREE.MeshStandardMaterial({ color, roughness: .75 }),
  );
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function staticModel(url, options = {}) {
  const gltf = cache.get(url);
  if (!gltf?.scene) return fallbackModel(options.color, options.height || 1);
  return prepareModel(gltf.scene.clone(true), options);
}

function placeStatic(url, x, z, options = {}) {
  const model = staticModel(url, options);
  model.position.set(x, options.y || 0, z);
  model.rotation.y = options.rotation || 0;
  (options.parent || scene).add(model);
  return model;
}

function createActor(url, options = {}) {
  const gltf = cache.get(url);
  const source = gltf?.scene ? cloneSkeleton(gltf.scene) : null;
  const wrapper = source ? prepareModel(source, { height: options.height || 1.72 }) : fallbackModel(options.color, 1.72);
  wrapper.position.set(options.x || 0, options.y || 0, options.z || 0);
  wrapper.rotation.y = options.rotation || 0;
  wrapper.userData.actions = new Map();
  wrapper.userData.currentAction = null;
  wrapper.userData.mixer = null;
  if (source && gltf.animations?.length) {
    const mixer = new THREE.AnimationMixer(source);
    gltf.animations.forEach((clip) => wrapper.userData.actions.set(clip.name, mixer.clipAction(clip)));
    wrapper.userData.mixer = mixer;
    mixers.push(mixer);
    playActor(wrapper, options.animation || "idle", true);
  }
  (options.parent || scene).add(wrapper);
  return wrapper;
}

function playActor(actor, animation, looping = true) {
  if (!actor) return;
  const action = actor.userData.actions?.get(animation) || actor.userData.actions?.get("idle");
  if (!action || actor.userData.currentAction === action) return;
  const previous = actor.userData.currentAction;
  action.reset();
  action.enabled = true;
  action.setLoop(looping ? THREE.LoopRepeat : THREE.LoopOnce, looping ? Infinity : 1);
  action.clampWhenFinished = !looping;
  action.fadeIn(.18).play();
  previous?.fadeOut(.18);
  actor.userData.currentAction = action;
  if (!looping) {
    const mixer = actor.userData.mixer;
    const onFinished = (event) => {
      if (event.action !== action) return;
      mixer.removeEventListener("finished", onFinished);
      playActor(actor, "idle", true);
    };
    mixer?.addEventListener("finished", onFinished);
  }
}

function createAreaPad(location, parent = scene) {
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 40),
    new THREE.MeshStandardMaterial({ color: location.color, transparent: true, opacity: .19, roughness: 1 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(location.npc.position[0], .015, location.npc.position[1]);
  pad.receiveShadow = true;
  parent.add(pad);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, .09, 10, 42),
    new THREE.MeshStandardMaterial({ color: location.color, emissive: location.color, emissiveIntensity: .35, transparent: true, opacity: .78 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(location.npc.position[0], .08, location.npc.position[1]);
  parent.add(ring);
  locationRings.set(location.id, ring);
}

function createLabel(text, subtitle, color = "#18204b") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 170;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.94)";
  context.beginPath();
  if (typeof context.roundRect === "function") context.roundRect(20, 20, 472, 130, 36);
  else context.rect(20, 20, 472, 130);
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = color;
  context.stroke();
  context.fillStyle = "#18204b";
  context.font = "900 45px sans-serif";
  context.textAlign = "center";
  context.fillText(text, 256, 83);
  context.fillStyle = "#64708e";
  context.font = "800 25px sans-serif";
  context.fillText(subtitle, 256, 122);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(4.7, 1.56, 1);
  return sprite;
}

function updateOutfitVisual() {
  if (!playerActor) return;
  if (outfitSprite) {
    playerActor.remove(outfitSprite);
    outfitSprite.material?.map?.dispose?.();
    outfitSprite.material?.dispose?.();
    outfitSprite = null;
  }
  const outfit = ECONOMY.outfits.find((item) => item.id === state.equippedOutfit);
  if (!outfit) return;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(255,255,255,.94)";
  context.beginPath();
  context.arc(80, 80, 63, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 9;
  context.strokeStyle = outfit.color || "#5b8ef1";
  context.stroke();
  context.font = "78px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(outfit.icon, 80, 84);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  outfitSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  outfitSprite.position.set(0, 2.28, 0);
  outfitSprite.scale.set(.75, .75, 1);
  playerActor.add(outfitSprite);
}

function outwardDirection(location) {
  const vector = new THREE.Vector2(location.npc.position[0], location.npc.position[1]);
  if (vector.lengthSq() < .1) return new THREE.Vector2(0, 1);
  return vector.normalize();
}

function rotateOffset(x, z, angle) {
  return {
    x: x * Math.cos(angle) - z * Math.sin(angle),
    z: x * Math.sin(angle) + z * Math.cos(angle),
  };
}

function buildAirportBackdrop(parent, location) {
  const [centerX, centerZ] = location.npc.position;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 24),
    new THREE.MeshStandardMaterial({ color: 0xc7d1d8, roughness: .92, metalness: .02 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, .01, centerZ - 1.5);
  floor.receiveShadow = true;
  parent.add(floor);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f5966, roughness: 1 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(centerX + 10.3, .018, centerZ - 1.5);
  runway.receiveShadow = true;
  parent.add(runway);
  for (let z = centerZ - 10; z <= centerZ + 7; z += 3.2) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(.24, 1.7),
      new THREE.MeshBasicMaterial({ color: 0xf7f5de }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(centerX + 10.3, .025, z);
    parent.add(stripe);
  }

  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x345887, roughness: .45, metalness: .35 });
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x3f68ad, roughness: .7 });
  [-4.8, -2.5, -.2, 2.1].forEach((x, index, list) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .9, 12), poleMaterial);
    pole.position.set(centerX + x, .46, centerZ + .2);
    pole.castShadow = true;
    parent.add(pole);
    if (index < list.length - 1) {
      const rope = new THREE.Mesh(new THREE.BoxGeometry(2.2, .06, .06), ropeMaterial);
      rope.position.set(centerX + x + 1.15, .78, centerZ + .2);
      parent.add(rope);
    }
  });

  const suitcaseMaterial = new THREE.MeshStandardMaterial({ color: 0xe4685d, roughness: .72 });
  [[-5.2, -1.7], [5.2, -3.3], [2.9, -2.3]].forEach(([x, z], index) => {
    const bag = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.5, .75, .32), suitcaseMaterial.clone());
    body.material.color.offsetHSL(index * .11, 0, 0);
    body.position.y = .4;
    body.castShadow = true;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.14, .025, 6, 12, Math.PI), poleMaterial);
    handle.position.set(0, .82, 0);
    bag.add(body, handle);
    bag.position.set(centerX + x, .01, centerZ + z);
    bag.rotation.y = index * .65;
    parent.add(bag);
  });
}

function buildAirportCrowd(parent, location) {
  ambientActors.length = 0;
  const [centerX, centerZ] = location.npc.position;
  const models = [
    LOCATIONS.find((item) => item.id === "hotel")?.npc.model,
    LOCATIONS.find((item) => item.id === "restaurant")?.npc.model,
    LOCATIONS.find((item) => item.id === "shop")?.npc.model,
    LOCATIONS.find((item) => item.id === "museum")?.npc.model,
    LOCATIONS.find((item) => item.id === "park")?.npc.model,
  ];
  const placements = [
    [-5.2, -3.1, .65], [-4.1, -2.5, -2.35], [4.2, .4, 2.2], [5.1, -.3, -1], [1.1, -4.8, .25],
  ];
  placements.forEach(([offsetX, offsetZ, rotation], index) => {
    const actor = createActor(models[index] || AVATARS[index % AVATARS.length].model, {
      x: centerX + offsetX,
      z: centerZ + offsetZ,
      height: 1.62,
      rotation,
      color: 0x7796c9 + index * 0x090503,
      parent,
    });
    actor.userData.ambientTraveler = true;
    ambientActors.push(actor);
  });
  nextAmbientLineAt = performance.now() + 2400;
}

function buildRoads() {
  roadsGroup = new THREE.Group();
  roadsGroup.name = "City roads";
  scene.add(roadsGroup);
  for (let x = -20; x <= 20; x += 5) {
    placeStatic(path("roads", "road-straight"), x, 0, { footprint: 5.1, rotation: Math.PI / 2, shadows: false, parent: roadsGroup });
  }
  for (let z = -20; z <= 20; z += 5) {
    const file = z === 0 ? "road-crossroad" : "road-straight";
    placeStatic(path("roads", file), 0, z, { footprint: 5.1, shadows: false, parent: roadsGroup });
  }
  [-10, 10].forEach((x) => {
    [-10, 10].forEach((z) => placeStatic(path("roads", "road-bend"), x, z, { footprint: 4.7, rotation: (x + z > 0 ? 1 : 0) * Math.PI / 2, shadows: false, parent: roadsGroup }));
  });
}

function addScenery() {
  sceneryGroup = new THREE.Group();
  sceneryGroup.name = "City scenery";
  scene.add(sceneryGroup);
  const trees = [
    [-21, -20, "tree_oak", 4.8], [-20, -9, "tree_default", 4.3], [-21, 7, "tree_oak", 4.5],
    [-20, 20, "tree_default", 4.6], [21, -21, "tree_oak", 4.8], [21, -8, "tree_default", 4.2],
    [21, 3, "tree_oak", 4.4], [20, 21, "tree_default", 4.7], [-8, 22, "tree_oak", 4.1],
    [9, -22, "tree_default", 4.4],
  ];
  trees.forEach(([x, z, file, height], index) => placeStatic(path("nature", file), x, z, { height, rotation: index * .73, parent: sceneryGroup }));
  const bushes = [[-8,-7],[8,7],[-8,7],[8,-7],[-19,14],[18,-12]];
  bushes.forEach(([x,z], index) => placeStatic(path("nature", index % 2 ? "plant_bush" : "grass_large"), x, z, { height: .75, rotation: index, parent: sceneryGroup }));
}

function buildLocations() {
  LOCATIONS.forEach((location, index) => {
    const locationGroup = new THREE.Group();
    locationGroup.name = `Location: ${location.id}`;
    scene.add(locationGroup);
    locationGroups.set(location.id, locationGroup);
    createAreaPad(location, locationGroup);
    const direction = outwardDirection(location);
    const baseAngle = Math.atan2(direction.x, direction.y);
    const config = PLACE_CONFIG[location.id];
    if (config.building) {
      const specialOffset = location.id === "airport"
        ? new THREE.Vector2(-4.7, 1)
        : location.id === "transit"
          ? new THREE.Vector2(4.5, 0)
          : null;
      const buildingX = location.npc.position[0] + (specialOffset?.x ?? direction.x * 4.1);
      const buildingZ = location.npc.position[1] + (specialOffset?.y ?? direction.y * 4.1);
      placeStatic(path("city", config.building), buildingX, buildingZ, {
        height: location.id === "transit" ? 4.7 : 6.2,
        rotation: specialOffset ? Math.atan2(-specialOffset.x, -specialOffset.y) : baseAngle + Math.PI,
        color: location.color,
        parent: locationGroup,
      });
    }
    config.props.forEach(([group, file, offsetX, offsetZ, height, rotation, y = 0]) => {
      const offset = rotateOffset(offsetX, offsetZ, baseAngle);
      placeStatic(path(group, file), location.npc.position[0] + offset.x, location.npc.position[1] + offset.z, {
        height,
        rotation: baseAngle + rotation,
        y,
        color: location.color,
        parent: locationGroup,
      });
    });

    const actor = createActor(location.npc.model, {
      x: location.npc.position[0],
      z: location.npc.position[1],
      height: 1.68,
      rotation: baseAngle + Math.PI,
      color: location.color,
      parent: locationGroup,
    });
    actor.userData.locationId = location.id;
    npcActors.set(location.id, actor);

    const label = createLabel(
      location.id === "airport" ? "✈️ 공항 출국장" : `${location.icon} ${location.titleEn}`,
      location.id === "airport" ? "항공사 체크인" : location.titleKo,
      location.color,
    );
    label.position.set(location.npc.position[0], 3.25, location.npc.position[1]);
    locationGroup.add(label);
    locationLabels.set(location.id, label);

    if (index % 2 === 0 && location.id !== "airport") {
      placeStatic(path("nature", "flower_yellowA"), location.npc.position[0] + 3, location.npc.position[1] - 2.4, { height: .55, rotation: index, parent: locationGroup });
    }
    if (location.id === "airport") {
      buildAirportBackdrop(locationGroup, location);
      buildAirportCrowd(locationGroup, location);
    }
  });
}

function syncMissionScene({ reposition = false } = {}) {
  const targetLocation = missionLocation();
  if (!targetLocation || !locationGroups.size) return;
  if (activeSceneLocationId === targetLocation.id && !reposition) return;
  const changed = activeSceneLocationId !== targetLocation.id;
  activeSceneLocationId = targetLocation.id;
  locationGroups.forEach((group, locationId) => {
    group.visible = locationId === targetLocation.id;
  });
  const airportScene = targetLocation.id === "airport";
  if (roadsGroup) roadsGroup.visible = !airportScene;
  if (sceneryGroup) sceneryGroup.visible = !airportScene;
  if (worldGround?.material?.color) worldGround.material.color.set(airportScene ? 0xaab7c2 : 0x83c96d);
  if (worldBorder?.material?.color) worldBorder.material.color.set(airportScene ? 0x426681 : 0x68a7c8);
  if (!airportScene) {
    ambientSpeaker = null;
    dom.ambientBubble.classList.add("is-hidden");
  }

  if (player && (reposition || (changed && Math.hypot(
    player.position.x - targetLocation.npc.position[0],
    player.position.z - targetLocation.npc.position[1],
  ) > 13))) {
    const direction = outwardDirection(targetLocation);
    player.position.set(
      targetLocation.npc.position[0] - direction.x * 7.2,
      0,
      targetLocation.npc.position[1] - direction.y * 7.2,
    );
    state.position.x = Number(player.position.x.toFixed(2));
    state.position.z = Number(player.position.z.toFixed(2));
    saveState();
  }
}

function updateAmbientChat() {
  const canShow = activeSceneLocationId === "airport" && started && player && camera && renderer &&
    !activeLocation && dom.worldConversation.classList.contains("is-hidden") && !isBlockingOverlayOpen();
  if (!canShow || !ambientActors.length) {
    ambientSpeaker = null;
    dom.ambientBubble.classList.add("is-hidden");
    return;
  }
  const now = performance.now();
  if (ambientSpeaker && now >= ambientLineEndsAt) {
    ambientSpeaker = null;
    dom.ambientBubble.classList.add("is-hidden");
    nextAmbientLineAt = now + 2500;
  }
  if (!ambientSpeaker && now >= nextAmbientLineAt) {
    const line = AMBIENT_CHAT_LINES[ambientChatIndex % AMBIENT_CHAT_LINES.length];
    ambientChatIndex += 1;
    const actor = ambientActors[line.actor % ambientActors.length];
    ambientSpeaker = actor;
    ambientLineEndsAt = now + 2800;
    dom.ambientBubbleEn.textContent = line.en;
    dom.ambientBubbleKo.textContent = line.ko;
    dom.ambientBubble.classList.remove("is-hidden");
    playActor(actor, "interact-right", false);
  }
  if (ambientSpeaker) placeWorldBubble(dom.ambientBubble, ambientSpeaker, 2.05, 0);
}

async function swapPlayerActor() {
  const avatar = AVATARS.find((item) => item.id === state.avatarId) || AVATARS[0];
  const position = playerActor?.position.clone() || new THREE.Vector3(state.position.x, 0, state.position.z);
  const rotation = playerActor?.rotation.y || Math.PI;
  if (playerActor) {
    scene.remove(playerActor);
    const mixer = playerActor.userData.mixer;
    if (mixer) {
      const index = mixers.indexOf(mixer);
      if (index >= 0) mixers.splice(index, 1);
      mixer.stopAllAction();
    }
  }
  playerActor = createActor(avatar.model, { x: position.x, z: position.z, height: 1.72, rotation, animation: "idle", color: 0x5d70e9 });
  playerActor.name = "Traveler";
  player = playerActor;
  updateOutfitVisual();
}

async function buildWorld() {
  setLoading(70, "여행 거리를 꾸미는 중…");
  buildRoads();
  addScenery();
  buildLocations();
  await swapPlayerActor();
  syncMissionScene();
  setLoading(94, "NPC가 오늘의 대화를 연습하는 중…");
}

function pendingSurpriseMission() {
  return null;
}

function isBlockingOverlayOpen() {
  return !dom.loadingScreen.classList.contains("is-hidden")
    || !dom.welcome.classList.contains("is-hidden")
    || !dom.rewardScreen.classList.contains("is-hidden")
    || !dom.passportPanel.classList.contains("is-hidden")
    || !dom.lifePanel.classList.contains("is-hidden")
    || !dom.surpriseAlert.classList.contains("is-hidden");
}

function setMissionCard() {
  const mission = currentMission();
  if (!mission) {
    dom.missionBadge.textContent = `미션 ${MISSION_SEQUENCE.length} / ${MISSION_SEQUENCE.length}`;
    dom.missionTitle.textContent = "여행 영어 일정 완주!";
    dom.missionGoal.textContent = "";
    dom.areaName.textContent = "여행 완료";
    return;
  }
  const selectedLocation = missionLocation(mission);
  const number = missionNumber(mission);
  dom.missionBadge.textContent = `미션 ${number} / ${MISSION_SEQUENCE.length}`;
  dom.missionTitle.textContent = displayMissionTitle(mission);
  dom.missionGoal.textContent = "";
  dom.areaName.textContent = selectedLocation?.titleKo || "다음 장소";
  syncMissionScene();
}

function updateNearestLocation() {
  dom.interactButton.classList.add("is-hidden");
  dom.gameStage.classList.remove("is-interaction-ready");
  if (!player || !started || isBlockingOverlayOpen()) {
    nearestLocation = null;
    return;
  }

  if (activeLocation) {
    const distance = Math.hypot(
      player.position.x - activeLocation.npc.position[0],
      player.position.z - activeLocation.npc.position[1],
    );
    nearestLocation = activeLocation;
    if (distance > 5.35 && !activeResult?.canAdvance) {
      closeDialogue();
      setMissionCard();
      showToast("대화를 잠시 멈췄어요. 다시 가까이 가서 말 걸기 버튼을 눌러 이어가세요.", 3900);
    }
    return;
  }

  const nearest = missionLocation();
  const nearestDistance = nearest
    ? Math.hypot(player.position.x - nearest.npc.position[0], player.position.z - nearest.npc.position[1])
    : Infinity;
  const interactionRange = nearestLocation?.id === nearest?.id ? 3.8 : 3.35;
  if (nearestDistance < interactionRange) {
    nearestLocation = nearest;
    const mission = currentMission();
    if (!mission || mission.locationId !== nearest.id) {
      setMissionCard();
      return;
    }
    const npcName = mission.npcOverride?.name || nearest.npc.name;
    const npcRole = mission.npcOverride?.roleKo || nearest.npc.role;
    dom.interactHint.textContent = `${npcName} · ${npcRole}`;
    dom.interactLabel.textContent = "말 걸기";
    dom.interactButton.setAttribute("aria-label", `${npcName}에게 말 걸기`);
    dom.interactButton.classList.remove("is-hidden");
    dom.gameStage.classList.add("is-interaction-ready");
    setMissionCard();
  } else {
    nearestLocation = null;
    setMissionCard();
  }
}

function beginNearestDialogue() {
  const mission = currentMission();
  if (
    !nearestLocation ||
    activeLocation ||
    isBlockingOverlayOpen() ||
    dom.interactButton.classList.contains("is-hidden") ||
    mission?.locationId !== nearestLocation.id
  ) return;
  try { window.speechSynthesis?.resume?.(); } catch {}
  const location = nearestLocation;
  dom.interactButton.classList.add("is-hidden");
  dom.gameStage.classList.remove("is-interaction-ready");
  openDialogue(location, mission);
}

function updateMiniMap() {
  if (!mapPlayer || !player) return;
  mapPlayer.style.left = `${((player.position.x + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100}%`;
  mapPlayer.style.top = `${((WORLD_LIMIT - player.position.z) / (WORLD_LIMIT * 2)) * 100}%`;
}

function refreshWayfinderBounds() {
  if (!dom.canvas || !dom.missionWayfinder) return;
  const canvasRect = dom.canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return;
  const markerWidth = dom.missionWayfinder.offsetWidth || 170;
  const markerHeight = dom.missionWayfinder.offsetHeight || 52;
  const halfWidth = markerWidth / 2;
  const halfHeight = markerHeight / 2;
  const hudRect = dom.topHud?.getBoundingClientRect();
  const toastRect = dom.toast.classList.contains("is-visible") ? dom.toast.getBoundingClientRect() : null;
  const obstacleBottom = Math.max(hudRect?.bottom || canvasRect.top, toastRect?.bottom || canvasRect.top);
  const compact = innerWidth <= 820 || window.matchMedia?.("(pointer: coarse)")?.matches;
  const bottomInset = Math.min(compact ? 185 : 85, canvasRect.height * .25);
  const maximumCenterY = canvasRect.height - halfHeight - 10;
  const top = Math.min(maximumCenterY, obstacleBottom - canvasRect.top + halfHeight + 12);
  const bottom = Math.max(top, canvasRect.height - bottomInset - halfHeight);
  wayfinderBounds = {
    left: halfWidth + 12,
    right: Math.max(halfWidth + 12, canvasRect.width - halfWidth - 12),
    top,
    bottom,
  };
}

function hideMissionWayfinder() {
  dom.missionWayfinder.classList.add("is-hidden");
  dom.missionWayfinder.classList.remove("is-onscreen", "is-edge");
}

function updateMissionWayfinder() {
  const mission = currentMission();
  const targetLocation = missionLocation(mission);
  if (
    !started || !player || !camera || !renderer || !mission || !targetLocation ||
    activeLocation || !dom.worldConversation.classList.contains("is-hidden") || isBlockingOverlayOpen()
  ) {
    hideMissionWayfinder();
    return;
  }

  const dxWorld = targetLocation.npc.position[0] - player.position.x;
  const dzWorld = targetLocation.npc.position[1] - player.position.z;
  const distance = Math.hypot(dxWorld, dzWorld);
  if (distance < 3.2) {
    hideMissionWayfinder();
    return;
  }

  if (wayfinderMissionId !== mission.id) {
    wayfinderMissionId = mission.id;
    wayfinderMeters = -1;
    dom.wayfinderName.textContent = `${targetLocation.icon} ${targetLocation.titleKo}`;
    dom.missionWayfinder.classList.remove("is-hidden");
    refreshWayfinderBounds();
  } else {
    dom.missionWayfinder.classList.remove("is-hidden");
  }

  const meters = Math.max(1, Math.ceil(distance));
  if (meters !== wayfinderMeters) {
    wayfinderMeters = meters;
    dom.wayfinderDistance.textContent = `약 ${meters}m 남음`;
  }

  const targetActor = npcActors.get(targetLocation.id);
  if (targetActor) targetActor.getWorldPosition(wayfinderTarget);
  else wayfinderTarget.set(targetLocation.npc.position[0], 0, targetLocation.npc.position[1]);
  wayfinderTarget.y += 2.05;
  camera.updateMatrixWorld(true);
  wayfinderView.copy(wayfinderTarget).applyMatrix4(camera.matrixWorldInverse);
  wayfinderNdc.copy(wayfinderTarget).project(camera);
  wayfinderPlayerNdc.copy(player.position);
  wayfinderPlayerNdc.y += 1.05;
  wayfinderPlayerNdc.project(camera);

  const width = renderer.domElement.clientWidth || innerWidth;
  const height = renderer.domElement.clientHeight || innerHeight;
  const targetX = (wayfinderNdc.x * .5 + .5) * width;
  const targetY = (-wayfinderNdc.y * .5 + .5) * height;
  const playerX = (wayfinderPlayerNdc.x * .5 + .5) * width;
  const playerY = (-wayfinderPlayerNdc.y * .5 + .5) * height;
  const inFront = wayfinderView.z < -camera.near && wayfinderNdc.z >= -1 && wayfinderNdc.z <= 1;
  const markerY = targetY - 64;
  const targetVisible = inFront && Number.isFinite(targetX) && Number.isFinite(markerY) &&
    targetX >= wayfinderBounds.left && targetX <= wayfinderBounds.right &&
    markerY >= wayfinderBounds.top && markerY <= wayfinderBounds.bottom;

  let markerX;
  let markerTop;
  let angle;
  if (targetVisible) {
    markerX = targetX;
    markerTop = markerY;
    angle = 90;
    dom.missionWayfinder.classList.add("is-onscreen");
    dom.missionWayfinder.classList.remove("is-edge");
  } else {
    let directionX;
    let directionY;
    if (inFront && Number.isFinite(targetX) && Number.isFinite(targetY)) {
      directionX = targetX - playerX;
      directionY = targetY - playerY;
    } else {
      wayfinderDelta.set(dxWorld, 0, dzWorld);
      wayfinderRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      wayfinderUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      directionX = wayfinderDelta.dot(wayfinderRight);
      directionY = -wayfinderDelta.dot(wayfinderUp);
    }
    if (!Number.isFinite(directionX) || !Number.isFinite(directionY) || Math.hypot(directionX, directionY) < .001) {
      directionX = 0;
      directionY = -1;
    }
    const originX = THREE.MathUtils.clamp(playerX, wayfinderBounds.left, wayfinderBounds.right);
    const originY = THREE.MathUtils.clamp(playerY, wayfinderBounds.top, wayfinderBounds.bottom);
    let travel = Infinity;
    if (directionX > .001) travel = Math.min(travel, (wayfinderBounds.right - originX) / directionX);
    else if (directionX < -.001) travel = Math.min(travel, (wayfinderBounds.left - originX) / directionX);
    if (directionY > .001) travel = Math.min(travel, (wayfinderBounds.bottom - originY) / directionY);
    else if (directionY < -.001) travel = Math.min(travel, (wayfinderBounds.top - originY) / directionY);
    if (!Number.isFinite(travel) || travel < 0) travel = 0;
    markerX = THREE.MathUtils.clamp(originX + directionX * travel, wayfinderBounds.left, wayfinderBounds.right);
    markerTop = THREE.MathUtils.clamp(originY + directionY * travel, wayfinderBounds.top, wayfinderBounds.bottom);
    angle = Math.atan2(directionY, directionX) * 180 / Math.PI;
    dom.missionWayfinder.classList.add("is-edge");
    dom.missionWayfinder.classList.remove("is-onscreen");
  }

  dom.missionWayfinder.style.left = `${markerX}px`;
  dom.missionWayfinder.style.top = `${markerTop}px`;
  dom.wayfinderArrow.style.setProperty("--wayfinder-angle", `${angle}deg`);
}

function movePlayer(delta) {
  if (!player || !started || isBlockingOverlayOpen()) {
    playActor(playerActor, "idle");
    return;
  }
  movement.set(0, 0, 0);
  if (keys.has("KeyW") || keys.has("ArrowUp")) movement.z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) movement.z += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) movement.x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) movement.x += 1;
  movement.x += joystick.x;
  movement.z += joystick.y;
  if (movement.lengthSq() > .025) {
    movement.normalize();
    const speed = (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 6.2 : 4.25;
    player.position.addScaledVector(movement, speed * delta);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -WORLD_LIMIT, WORLD_LIMIT);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -WORLD_LIMIT, WORLD_LIMIT);
    const targetRotation = Math.atan2(movement.x, movement.z);
    let difference = targetRotation - player.rotation.y;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    player.rotation.y += difference * Math.min(1, delta * 11);
    playActor(playerActor, speed > 5 ? "sprint" : "walk");
    state.position.x = Number(player.position.x.toFixed(2));
    state.position.z = Number(player.position.z.toFixed(2));
  } else {
    playActor(playerActor, "idle");
  }
}

function cameraLookFromDrag(current, deltaY) {
  return Math.max(CAMERA_LOOK_MIN, Math.min(CAMERA_LOOK_MAX, current - deltaY * CAMERA_LOOK_SENSITIVITY));
}

function updateCamera(delta) {
  if (!player) return;
  cameraLookOffset = THREE.MathUtils.lerp(cameraLookOffset, cameraLookTarget, 1 - Math.exp(-delta * 10));
  exploreCameraPosition.set(player.position.x + 8.8, player.position.y + 8.2, player.position.z + 10.5);
  exploreCameraTarget.set(player.position.x, player.position.y + 1.05 + cameraLookOffset, player.position.z);

  const npc = activeLocation ? npcActors.get(activeLocation.id) : null;
  const blendTarget = npc ? 1 : 0;
  dialogueCameraBlend = THREE.MathUtils.lerp(dialogueCameraBlend, blendTarget, 1 - Math.exp(-delta * 4.5));
  if (npc) {
    dialogueMidpoint.copy(player.position).lerp(npc.position, .5);
    dialogueCameraPosition.set(
      dialogueMidpoint.x + 7.1,
      dialogueMidpoint.y + 6.7,
      dialogueMidpoint.z + 8.5,
    );
    dialogueCameraTarget.set(
      dialogueMidpoint.x,
      dialogueMidpoint.y + 1.1 + cameraLookOffset,
      dialogueMidpoint.z,
    );
    dialogueCameraReady = true;
  } else if (!dialogueCameraReady) {
    dialogueCameraPosition.copy(exploreCameraPosition);
    dialogueCameraTarget.copy(exploreCameraTarget);
  }

  cameraDesired.copy(exploreCameraPosition).lerp(dialogueCameraPosition, dialogueCameraBlend);
  cameraTarget.copy(exploreCameraTarget).lerp(dialogueCameraTarget, dialogueCameraBlend);
  camera.position.lerp(cameraDesired, 1 - Math.exp(-delta * 4.3));
  camera.lookAt(cameraTarget);
  if (!npc && dialogueCameraBlend < .005) dialogueCameraReady = false;
}

function updateNpcFacing(delta) {
  if (!player) return;
  npcActors.forEach((actor, id) => {
    if (!locationGroups.get(id)?.visible) return;
    const location = LOCATIONS.find((item) => item.id === id);
    if (!location) return;
    const distance = actor.position.distanceTo(player.position);
    if (distance < 5.3 || activeLocation?.id === id) {
      const desired = Math.atan2(player.position.x - actor.position.x, player.position.z - actor.position.z);
      let difference = desired - actor.rotation.y;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      actor.rotation.y += difference * Math.min(1, delta * 5);
    }
  });
  if (activeLocation && playerActor && movement.lengthSq() <= .025) {
    const npc = npcActors.get(activeLocation.id);
    if (npc) {
      const desired = Math.atan2(npc.position.x - playerActor.position.x, npc.position.z - playerActor.position.z);
      let difference = desired - playerActor.rotation.y;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      playerActor.rotation.y += difference * Math.min(1, delta * 5);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  mixers.forEach((mixer) => mixer.update(delta));
  movePlayer(delta);
  updateCamera(delta);
  updateNpcFacing(delta);
  updateNearestLocation();
  updateMissionWayfinder();
  updateAmbientChat();
  updateWorldConversationPositions();
  updateMiniMap();
  const elapsed = clock.elapsedTime;
  locationRings.forEach((ring, id) => {
    ring.rotation.z += delta * .35;
    ring.position.y = .09 + Math.sin(elapsed * 2.2 + id.length) * .025;
  });
  renderer.render(scene, camera);
}

function getConversationSafeRect() {
  const canvasRect = dom.canvas.getBoundingClientRect();
  const hudRect = dom.topHud.getBoundingClientRect();
  const composerRect = dom.conversationComposer.getBoundingClientRect();
  const toastRect = dom.toast.classList.contains("is-visible") ? dom.toast.getBoundingClientRect() : null;
  const top = Math.max(
    12,
    hudRect.bottom - canvasRect.top + 10,
    toastRect ? toastRect.bottom - canvasRect.top + 10 : 0,
  );
  const bottom = Math.min(
    canvasRect.height - 12,
    composerRect.height ? composerRect.top - canvasRect.top - 14 : canvasRect.height - 12,
  );
  return {
    left: 12,
    right: Math.max(12, canvasRect.width - 12),
    top,
    bottom: Math.min(canvasRect.height - 12, Math.max(top + 76, bottom)),
    width: canvasRect.width,
    height: canvasRect.height,
  };
}

function makeBubbleLayout(element, actor, yOffset, horizontalOffset, safe) {
  if (!element || !actor || !camera || !renderer || element.classList.contains("is-hidden")) return null;
  projectedPoint.set(0, yOffset, 0);
  actor.localToWorld(projectedPoint);
  projectedPoint.project(camera);
  if (projectedPoint.z < -1 || projectedPoint.z > 1) {
    element.style.opacity = "0";
    return null;
  }
  const actorX = (projectedPoint.x * .5 + .5) * safe.width;
  const actorY = (-projectedPoint.y * .5 + .5) * safe.height;
  const availableWidth = Math.max(120, safe.right - safe.left);
  const widthLimit = element.classList.contains("player-world-bubble") ? 310 : 350;
  element.style.maxWidth = `${Math.min(widthLimit, availableWidth)}px`;
  const width = Math.min(availableWidth, element.offsetWidth || widthLimit);
  const height = element.offsetHeight || 72;
  const centerX = actorX + horizontalOffset;
  const left = THREE.MathUtils.clamp(
    centerX - width / 2,
    safe.left,
    Math.max(safe.left, safe.right - width),
  );
  const lift = element.classList.contains("is-latest") ? 28 : 0;
  const top = THREE.MathUtils.clamp(
    actorY - height - 14 - lift,
    safe.top,
    Math.max(safe.top, safe.bottom - height),
  );
  return {
    element,
    actorX,
    left,
    top,
    width,
    height,
    hidden: false,
  };
}

function bubbleLayoutsOverlap(first, second) {
  if (!first || !second) return false;
  return !(
    first.left + first.width + 8 <= second.left ||
    second.left + second.width + 8 <= first.left ||
    first.top + first.height + 8 <= second.top ||
    second.top + second.height + 8 <= first.top
  );
}

function applyBubbleLayout(layout) {
  if (!layout) return;
  if (layout.hidden) {
    layout.element.style.opacity = "0";
    return;
  }
  layout.element.style.left = `${layout.left}px`;
  layout.element.style.top = `${layout.top}px`;
  layout.element.style.setProperty(
    "--bubble-tail-x",
    `${THREE.MathUtils.clamp(layout.actorX - layout.left, 20, Math.max(20, layout.width - 20))}px`,
  );
  layout.element.style.opacity = "1";
}

function placeWorldBubble(element, actor, yOffset = 2, horizontalOffset = 0) {
  const safe = getConversationSafeRect();
  applyBubbleLayout(makeBubbleLayout(element, actor, yOffset, horizontalOffset, safe));
}

function updateWorldConversationPositions() {
  if (!activeLocation || dom.worldConversation.classList.contains("is-hidden")) return;
  const safe = getConversationSafeRect();
  const npcLayout = makeBubbleLayout(dom.npcWorldBubble, npcActors.get(activeLocation.id), 2.18, 22, safe);
  const playerLayout = makeBubbleLayout(dom.playerWorldBubble, playerActor, 2.22, -22, safe);
  if (bubbleLayoutsOverlap(npcLayout, playerLayout)) {
    const latest = dom.npcWorldBubble.classList.contains("is-latest") ? npcLayout : playerLayout;
    const previous = latest === npcLayout ? playerLayout : npcLayout;
    if (latest && previous) {
      const stackedTop = previous.top - latest.height - 10;
      if (stackedTop >= safe.top) {
        latest.top = stackedTop;
      } else {
        const previousBelow = latest.top + latest.height + 10;
        if (previousBelow + previous.height <= safe.bottom) previous.top = previousBelow;
        else previous.hidden = true;
      }
    }
  }
  applyBubbleLayout(npcLayout);
  applyBubbleLayout(playerLayout);
}

function availableVoices() {
  return window.speechSynthesis?.getVoices?.() || [];
}

function chooseEnglishVoice() {
  const novelty = /whisper|trinoids|zarvox|boing|bubbles|bells|cellos|bad news|good news|pipe organ|superstar|wobble|bahh|albert|fred|junior|kathy|ralph/i;
  const voices = availableVoices().filter((voice) => /^en[-_]/i.test(voice.lang) && !novelty.test(voice.name));
  const preferred = voices.find((voice) => /samantha|ava|allison|google us english|microsoft aria|serena|daniel/i.test(voice.name));
  return preferred || voices.find((voice) => /en[-_]us/i.test(voice.lang)) || voices[0] || null;
}

function preferredAudioMime() {
  if (!("MediaRecorder" in window)) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
    .find((type) => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type)) || "";
}

function stopAudioTracks(stream = audioStream) {
  stream?.getTracks?.().forEach((track) => track.stop());
  if (stream === audioStream) audioStream = null;
}

function discardAudioCapture({ abortRequest = true } = {}) {
  audioCaptureId += 1;
  window.clearTimeout(audioMaxTimer);
  audioMaxTimer = null;
  if (abortRequest) {
    audioRequestController?.abort?.();
    audioRequestController = null;
  }
  const recorder = audioRecorder;
  audioRecorder = null;
  if (recorder && recorder.state !== "inactive") {
    try { recorder.stop(); } catch {}
  }
  stopAudioTracks();
  audioChunks = [];
  audioCaptureContext = null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("audio_read_failed"));
    reader.readAsDataURL(blob);
  });
}

function writeWavLabel(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

async function blobToMonoWav(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("audio_context_unavailable");
  const context = new AudioContextClass();
  try {
    const source = await context.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const outputRate = 16000;
    const outputLength = Math.max(1, Math.ceil(source.duration * outputRate));
    const output = new Float32Array(outputLength);
    const channels = Array.from({ length: source.numberOfChannels }, (_, index) => source.getChannelData(index));
    const step = source.sampleRate / outputRate;
    for (let index = 0; index < outputLength; index += 1) {
      const sourcePosition = Math.min(source.length - 1, index * step);
      const leftIndex = Math.floor(sourcePosition);
      const rightIndex = Math.min(source.length - 1, leftIndex + 1);
      const blend = sourcePosition - leftIndex;
      let sample = 0;
      for (const channel of channels) {
        sample += channel[leftIndex] + (channel[rightIndex] - channel[leftIndex]) * blend;
      }
      output[index] = sample / Math.max(1, channels.length);
    }

    const wav = new ArrayBuffer(44 + output.length * 2);
    const view = new DataView(wav);
    writeWavLabel(view, 0, "RIFF");
    view.setUint32(4, 36 + output.length * 2, true);
    writeWavLabel(view, 8, "WAVE");
    writeWavLabel(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, outputRate, true);
    view.setUint32(28, outputRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeWavLabel(view, 36, "data");
    view.setUint32(40, output.length * 2, true);
    for (let index = 0; index < output.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, output[index]));
      view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return new Blob([wav], { type: "audio/wav" });
  } finally {
    try { await context.close(); } catch {}
  }
}

function speak(text, { slower = false, onEnd = null, onUnavailable = null } = {}) {
  const sequence = ++speechSequence;
  discardAudioCapture();
  capturePhase = "idle";
  const phrase = String(text || "").trim();
  npcSpeaking = Boolean(phrase);
  let settled = false;
  let started = false;
  let startWatchdog = null;
  let finishWatchdog = null;
  let utterance = null;
  const finish = ({ unavailable = false } = {}) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(startWatchdog);
    window.clearTimeout(finishWatchdog);
    if (sequence !== speechSequence) return;
    if (activeUtterance === utterance) activeUtterance = null;
    npcSpeaking = false;
    if (unavailable && typeof onUnavailable === "function") onUnavailable();
    if (typeof onEnd === "function") onEnd();
  };
  const synth = window.speechSynthesis;
  if (!phrase || !soundEnabled || !synth || !("SpeechSynthesisUtterance" in window)) {
    finishWatchdog = window.setTimeout(() => finish({ unavailable: Boolean(phrase) }), phrase ? 180 : 0);
    return;
  }

  if (synth.speaking || synth.pending || activeUtterance) {
    try { synth.cancel(); } catch {}
  }
  const nextUtterance = new SpeechSynthesisUtterance(phrase);
  utterance = nextUtterance;
  activeUtterance = nextUtterance;
  const voice = chooseEnglishVoice();
  if (voice) nextUtterance.voice = voice;
  nextUtterance.lang = voice?.lang || "en-US";
  nextUtterance.rate = slower ? .78 : .9;
  nextUtterance.pitch = 1.02;
  nextUtterance.volume = 1;
  nextUtterance.onstart = () => {
    if (sequence !== speechSequence) return;
    started = true;
    window.clearTimeout(startWatchdog);
  };
  nextUtterance.onend = () => finish();
  nextUtterance.onerror = () => finish({ unavailable: true });
  try {
    synth.resume();
    synth.speak(nextUtterance);
  } catch {
    finish({ unavailable: true });
    return;
  }
  // Mobile speech engines can need a few seconds to warm up and some omit
  // `onstart`. Never cancel a pending first line merely because it starts late.
  startWatchdog = window.setTimeout(() => {
    if (!started && !synth.speaking && !synth.pending) finish({ unavailable: true });
  }, 4000);
  finishWatchdog = window.setTimeout(
    () => finish({ unavailable: !started }),
    Math.min(18000, Math.max(4200, phrase.length * 115)),
  );
}

function setWorldVoiceState(message, mode = "") {
  dom.worldVoiceState.className = `world-voice-state${mode ? ` is-${mode}` : ""}`;
  dom.worldVoiceState.querySelector("b").textContent = message;
}

function setWorldNpcCaptionVisible(visible) {
  const show = Boolean(visible);
  dom.npcWorldBubble.classList.toggle("is-caption-visible", show);
  dom.npcBubbleText.setAttribute("aria-hidden", String(!show));
  dom.npcWorldCaptionToggle.setAttribute("aria-expanded", String(show));
  dom.npcWorldCaptionToggle.textContent = show ? "🙈 자막 가리기" : "👀 자막 보기";
}

function syncWorldConversationUi() {
  const hasReply = Boolean(dom.worldReplyInput.value.trim());
  let dialogueState = "learner";
  if (!activeLocation) dialogueState = "closed";
  else if (npcSpeaking || !learnerTurnReady) dialogueState = "npc-speaking";
  else if (evaluationPending || activeResult?.canAdvance || ["stopping", "sending"].includes(capturePhase)) dialogueState = "thinking";
  else if (capturePhase === "starting") dialogueState = "starting";
  else if (capturePhase === "listening") dialogueState = "listening";
  dom.worldConversation.dataset.dialogueState = dialogueState;
  dom.gameStage.dataset.dialogueState = dialogueState;
  dom.worldConversation.classList.toggle("is-status-only", ["npc-speaking", "thinking", "starting"].includes(dialogueState));
  dom.worldClearButton.classList.toggle("is-hidden", !hasReply);
  dom.npcWorldBubble.classList.toggle("is-speaking", npcSpeaking);
  dom.npcWorldReplay.disabled = npcSpeaking || !activeLocation || Boolean(activeResult?.canAdvance);
}

function showPlayerBubble(text) {
  window.clearTimeout(playerBubbleTimer);
  const value = String(text || "").trim();
  dom.playerBubbleText.textContent = value;
  dom.playerWorldBubble.classList.toggle("is-hidden", !value);
  if (value) markLatestSpeaker("player");
}

function markLatestSpeaker(speaker) {
  const npcLatest = speaker === "npc";
  dom.npcWorldBubble.classList.toggle("is-latest", npcLatest);
  dom.playerWorldBubble.classList.toggle("is-latest", !npcLatest);
  dom.npcWorldBubble.classList.toggle("is-previous", !npcLatest);
  dom.playerWorldBubble.classList.toggle("is-previous", npcLatest);
}

function currentMissingGoal() {
  return activeMission?.goals?.find((goal) => !activeMissionGoalIds.has(goal.id)) || null;
}

function currentHintText() {
  const goal = currentMissingGoal();
  if (!goal) return "필요한 내용을 한국어로 생각해 보세요";
  return goal.hintKo || goal.labelKo || "미션에 필요한 내용 말하기";
}

function hideWorldHint() {
  dom.worldHintPopup.classList.add("is-hidden");
}

function showCurrentMissionHint() {
  if (!activeMission || !currentMissingGoal()) {
    hideWorldHint();
    return false;
  }
  dom.worldHintText.textContent = currentHintText();
  dom.worldHintPopup.querySelector("span").textContent = "💡 말할 내용";
  dom.worldHintPopup.classList.remove("is-hidden");
  return true;
}

function clearWorldReply() {
  if (!activeLocation || evaluationPending || npcSpeaking || !learnerTurnReady || activeResult?.canAdvance) return;
  discardAudioCapture();
  capturePhase = "idle";
  dom.worldReplyInput.value = "";
  dom.answerInput.value = "";
  dom.heardText.textContent = "";
  dom.heardBox.classList.add("is-hidden");
  showPlayerBubble("");
  if (!dom.npcWorldBubble.classList.contains("is-hidden")) markLatestSpeaker("npc");
  setWorldVoiceState("모두 지웠어요. 무전기 버튼을 누르고 다시 말해 보세요.");
  updateWorldSendState();
  dom.worldReplyInput.focus();
}

function updateWorldSendState() {
  const hasReply = Boolean(dom.worldReplyInput.value.trim());
  const baseLocked = evaluationPending || npcSpeaking || !learnerTurnReady || Boolean(activeResult?.canAdvance) || !activeLocation;
  const transitionLocked = ["starting", "stopping", "transcribing", "sending"].includes(capturePhase);
  dom.worldReplyInput.disabled = baseLocked;
  dom.worldReplyInput.readOnly = ["starting", "listening", "stopping", "transcribing"].includes(capturePhase);
  dom.worldClearButton.disabled = baseLocked || (!hasReply && !audioRecorder && !["starting", "listening", "stopping"].includes(capturePhase));
  dom.worldSendButton.setAttribute("aria-pressed", String(capturePhase === "listening"));

  let label = hasReply ? "📡 전송" : "🎙️ 눌러서 말하기";
  if (npcSpeaking) label = "상대방 말 듣는 중…";
  else if (!learnerTurnReady && activeLocation) label = "상대방 질문 준비 중…";
  else if (evaluationPending || capturePhase === "sending" || capturePhase === "transcribing") label = "음성과 뜻 확인 중…";
  else if (capturePhase === "starting") label = "마이크 여는 중…";
  else if (capturePhase === "listening") label = "📻 말 끝내고 전송";
  else if (capturePhase === "stopping") label = "📡 전송 중…";
  dom.worldSendButton.textContent = label;
  dom.worldSendButton.disabled = baseLocked || transitionLocked;
  syncWorldConversationUi();
}

function beginLearnerTurn() {
  if (!activeLocation || evaluationPending || activeResult?.canAdvance) return;
  npcSpeaking = false;
  learnerTurnReady = true;
  capturePhase = dom.worldReplyInput.value.trim() ? "captured" : "idle";
  showCurrentMissionHint();
  setWorldVoiceState("🎙️ 이제 영어로 대답해 보세요.");
  updateWorldSendState();
}

function presentNpcLine(text, { onEnd = beginLearnerTurn } = {}) {
  if (!activeLocation) return;
  learnerTurnReady = false;
  dom.worldReplyInput.blur();
  dom.npcBubbleText.textContent = text;
  setWorldNpcCaptionVisible(false);
  dom.npcWorldBubble.classList.remove("is-hidden");
  markLatestSpeaker("npc");
  npcSpeaking = Boolean(text);
  setWorldVoiceState(`🔊 ${dom.npcBubbleName.textContent || "NPC"}가 말하고 있어요`, "speaking");
  updateWorldSendState();
  speak(text, {
    onUnavailable: () => setWorldNpcCaptionVisible(true),
    onEnd: () => {
      if (!activeLocation) return;
      if (activeResult?.canAdvance) setWorldVoiceState("✅ 미션 완료! 보상을 준비하고 있어요.", "thinking");
      syncWorldConversationUi();
      if (typeof onEnd === "function") onEnd();
    },
  });
}

function replayWorldNpcLine() {
  if (!activeLocation || npcSpeaking) return;
  const text = dom.npcBubbleText.textContent.trim();
  if (!text) return;
  dom.worldReplyInput.blur();
  learnerTurnReady = false;
  npcSpeaking = true;
  setWorldVoiceState(`🔊 ${dom.npcBubbleName.textContent || "NPC"}가 다시 말하고 있어요`, "speaking");
  updateWorldSendState();
  speak(text, {
    slower: true,
    onUnavailable: () => setWorldNpcCaptionVisible(true),
    onEnd: () => {
      if (!activeLocation) return;
      if (activeResult?.canAdvance) updateWorldSendState();
      else beginLearnerTurn();
    },
  });
}

function currentTurn() {
  if (activeMission) {
    return {
      id: activeMission.id,
      npc: activeMission.openingEn,
      npcKo: activeMission.openingKo,
      hintKo: activeMission.briefingKo,
      target: activeMission.hints?.[0] || "Could you help me, please?",
      accepts: activeMission.hints || [],
      correctionKo: "정해진 문장을 외우지 말고 미션에 필요한 뜻을 자유롭게 전해 보세요.",
      success: "Great! You completed the mission.",
      successKo: "훌륭해요! 미션을 성공했어요.",
    };
  }
  return activeLocation?.mission.turns[activeTurnIndex] || null;
}

function setNpcLineVisible(visible) {
  dom.npcLine.classList.toggle("is-hidden", !visible);
  dom.npcListenCue.classList.toggle("is-hidden", visible);
  dom.lineRevealToggle.setAttribute("aria-expanded", String(visible));
  dom.lineRevealToggle.textContent = visible ? "🙈 영어 문장 가리기" : "👀 영어 문장 보기";
  if (!visible) setTranslationVisible(false);
}

function setTranslationVisible(visible) {
  dom.npcTranslation.classList.toggle("is-hidden", !visible);
  dom.translationToggle.setAttribute("aria-expanded", String(visible));
  dom.translationToggle.textContent = visible ? "한국어 뜻 닫기" : "한국어 뜻 보기";
}

function setHintsVisible(visible) {
  dom.phraseChips.classList.toggle("is-hidden", !visible);
  dom.hintToggle.setAttribute("aria-expanded", String(visible));
  dom.hintToggle.textContent = visible ? "문장 도움 닫기" : "문장 도움";
}

function setEvaluationPending(pending) {
  evaluationPending = pending;
  const answerLocked = !pending && Boolean(activeResult?.canAdvance);
  dom.answerZone.setAttribute("aria-busy", String(pending));
  dom.evaluationProgress.classList.toggle("is-hidden", !pending);
  [dom.micButton, dom.answerInput, dom.answerSubmit, dom.hintToggle].forEach((element) => {
    element.disabled = pending || answerLocked;
  });
  dom.phraseChips.querySelectorAll("button").forEach((button) => {
    button.disabled = pending || answerLocked;
  });
  if (pending) setWorldVoiceState("상대방이 네 말의 뜻을 이해하는 중…", "thinking");
  updateWorldSendState();
}

function currentPrompt() {
  const turn = currentTurn();
  const promptKey = activeMission?.id || activeTurnIndex;
  return dynamicPrompts.get(promptKey) || { en: turn?.npc || "", ko: turn?.npcKo || "" };
}

function renderMissionGoals() {
  if (!activeMission) return;
  dom.missionGoalList.innerHTML = "";
  activeMission.goals.forEach((goal) => {
    const item = document.createElement("span");
    item.className = `mission-goal${activeMissionGoalIds.has(goal.id) ? " is-done" : ""}`;
    item.textContent = `${activeMissionGoalIds.has(goal.id) ? "✓" : "○"} ${goal.labelKo}`;
    dom.missionGoalList.appendChild(item);
  });
  dom.turnCount.textContent = `${activeMissionGoalIds.size} / ${activeMission.goals.length}`;
  const missing = activeMission.goals.filter((goal) => !activeMissionGoalIds.has(goal.id));
  dom.answerHint.textContent = missing.length
    ? `남은 목표: ${missing.map((goal) => goal.labelKo).join(" · ")}`
    : "필요한 뜻을 모두 전달했어요!";
  if (activeLocation) {
    dom.missionBadge.textContent = `미션 ${missionNumber(activeMission)} / ${MISSION_SEQUENCE.length}`;
    dom.missionTitle.textContent = displayMissionTitle(activeMission);
    dom.missionGoal.textContent = "";
    dom.areaName.textContent = activeLocation.titleKo;
  }
}

function renderConversationTrail() {
  dom.conversationTrailList.innerHTML = "";
  const recent = conversationHistory.slice(-3);
  dom.historyToggle.classList.toggle("is-hidden", recent.length === 0);
  dom.historyToggle.setAttribute("aria-expanded", String(conversationTrailVisible));
  dom.historyToggle.textContent = conversationTrailVisible ? "🙈 지난 대화 가리기" : "💬 지난 대화 보기";
  dom.conversationTrail.classList.toggle("is-hidden", recent.length === 0 || !conversationTrailVisible);
  const fragment = document.createDocumentFragment();
  recent.forEach((exchange) => {
    const npcLine = document.createElement("div");
    npcLine.className = "trail-line";
    const npcLabel = document.createElement("b");
    npcLabel.textContent = "NPC · ";
    npcLine.append(npcLabel, document.createTextNode(exchange.npc));
    fragment.appendChild(npcLine);

    const learnerLine = document.createElement("div");
    learnerLine.className = "trail-line is-learner";
    const learnerLabel = document.createElement("b");
    learnerLabel.textContent = "ME · ";
    learnerLine.append(learnerLabel, document.createTextNode(exchange.learner));
    fragment.appendChild(learnerLine);
  });
  dom.conversationTrailList.appendChild(fragment);
  dom.conversationTrailList.scrollLeft = dom.conversationTrailList.scrollWidth;
}

function clearAnswerFeedback() {
  activeResult = null;
  discardAudioCapture();
  dom.answerInput.value = "";
  dom.worldReplyInput.value = "";
  capturePhase = "idle";
  hideWorldHint();
  showPlayerBubble("");
  dom.worldCoach.classList.add("is-hidden");
  dom.worldCoach.textContent = "";
  dom.heardBox.classList.add("is-hidden");
  dom.correctionCard.className = "correction-card is-hidden";
  dom.nextTurnButton.classList.add("is-hidden");
  dom.offlineContinueButton.classList.add("is-hidden");
  dom.retryButton.classList.remove("is-hidden");
  dom.retryButton.textContent = "🎙️ 다시 말해 보기";
  dom.micButton.classList.remove("is-listening");
  dom.micButton.querySelector("b").textContent = "눌러서 말하기";
  setEvaluationPending(false);
}

function renderDialogueTurn({ speakLine = true } = {}) {
  const turn = currentTurn();
  if (!turn || !activeLocation || !activeMission) return;
  clearAnswerFeedback();
  const prompt = currentPrompt();
  dom.npcName.textContent = activeMission.npcOverride?.name || activeLocation.npc.name;
  dom.npcRole.textContent = `${activeMission.npcOverride?.roleKo || activeLocation.npc.role} · ${activeLocation.titleEn}`;
  dom.npcAvatar.textContent = activeMission.npcOverride?.icon || activeLocation.icon;
  dom.npcBubbleName.textContent = activeMission.npcOverride?.name || activeLocation.npc.name;
  dom.worldConversation.classList.remove("is-hidden");
  dom.dialogueMissionBrief.classList.remove("is-surprise");
  dom.dialogueMissionBadge.textContent = `미션 ${missionNumber(activeMission)} / ${MISSION_SEQUENCE.length}`;
  dom.dialogueMissionTitle.textContent = displayMissionTitle(activeMission);
  dom.dialogueMissionGoal.textContent = activeMission.briefingKo;
  renderMissionGoals();
  dom.npcLine.textContent = prompt.en;
  dom.npcTranslation.textContent = prompt.ko;
  setNpcLineVisible(false);
  dom.phraseChips.innerHTML = "";
  (activeMission.hints || [turn.target]).slice(0, 3).forEach((phrase) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "phrase-chip";
    button.textContent = phrase;
    button.addEventListener("click", () => {
      dom.answerInput.value = phrase;
      dom.answerInput.focus();
    });
    dom.phraseChips.appendChild(button);
  });
  setTranslationVisible(false);
  setHintsVisible(false);
  if (speakLine) presentNpcLine(prompt.en);
}

function openDialogue(location, missionOverride = null) {
  if (!location || activeLocation) return;
  const mission = currentMission();
  if (!mission || mission.locationId !== location.id || (missionOverride && missionOverride.id !== mission.id)) {
    const target = missionLocation(mission);
    if (target) showToast(`지금은 미션 ${missionNumber(mission)} 차례예요. ${target.titleKo}로 이동해 주세요.`, 3600);
    return;
  }
  discardAudioCapture();
  evaluationController?.abort();
  dialogueSession += 1;
  evaluationSequence += 1;
  const cachedSession = missionSessionCache.get(mission.id);
  conversationHistory = Array.isArray(cachedSession?.history) ? cachedSession.history.slice(-8) : [];
  conversationTrailVisible = false;
  pendingClarify = null;
  dynamicPrompts.clear();
  if (cachedSession?.prompt?.en) dynamicPrompts.set(mission.id, cachedSession.prompt);
  followUpCounts.clear();
  learnerTurnReady = false;
  activeMission = mission;
  activeMissionGoalIds = new Set(cachedSession?.completedGoalIds || []);
  activeMissionStateToken = cachedSession?.missionStateToken || null;
  missionAttemptCount = Number(cachedSession?.attemptCount) || 0;
  renderConversationTrail();
  activeLocation = location;
  activeTurnIndex = 0;
  dom.dialogue.classList.add("is-hidden");
  dom.worldConversation.classList.remove("is-hidden");
  dom.gameStage.classList.add("is-dialogue-open");
  dom.joystickWrap.classList.remove("is-hidden");
  dom.interactButton.classList.add("is-hidden");
  const locationLabel = locationLabels.get(location.id);
  if (locationLabel) locationLabel.visible = false;
  const npc = npcActors.get(location.id);
  playActor(npc, "interact-right", false);
  renderDialogueTurn();
}

function closeDialogue({ discardSession = false } = {}) {
  if (!discardSession && activeResult?.canAdvance) {
    finishMission();
    return;
  }
  if (activeMission) {
    if (discardSession) missionSessionCache.delete(activeMission.id);
    else if (activeMissionStateToken || conversationHistory.length) {
      missionSessionCache.set(activeMission.id, {
        completedGoalIds: [...activeMissionGoalIds],
        missionStateToken: activeMissionStateToken,
        attemptCount: missionAttemptCount,
        history: conversationHistory.slice(-8),
        prompt: dynamicPrompts.get(activeMission.id) || null,
      });
    }
  }
  speechSequence += 1;
  discardAudioCapture();
  capturePhase = "idle";
  npcSpeaking = false;
  learnerTurnReady = false;
  activeUtterance = null;
  evaluationController?.abort();
  evaluationController = null;
  dialogueSession += 1;
  evaluationSequence += 1;
  setEvaluationPending(false);
  window.speechSynthesis?.cancel?.();
  window.clearTimeout(playerBubbleTimer);
  const closingLocation = activeLocation;
  const closingLabel = closingLocation ? locationLabels.get(closingLocation.id) : null;
  if (closingLabel) closingLabel.visible = true;
  if (activeLocation) playActor(npcActors.get(activeLocation.id), "idle", true);
  activeLocation = null;
  activeMission = null;
  activeMissionGoalIds = new Set();
  activeMissionStateToken = null;
  missionAttemptCount = 0;
  activeTurnIndex = 0;
  activeResult = null;
  pendingClarify = null;
  conversationHistory = [];
  conversationTrailVisible = false;
  dynamicPrompts.clear();
  followUpCounts.clear();
  renderConversationTrail();
  dom.dialogue.classList.add("is-hidden");
  dom.worldConversation.classList.add("is-hidden");
  dom.worldConversation.classList.remove("is-status-only");
  delete dom.worldConversation.dataset.dialogueState;
  delete dom.gameStage.dataset.dialogueState;
  dom.gameStage.classList.remove("is-dialogue-open");
  dom.joystickWrap.classList.remove("is-hidden");
  dom.npcWorldBubble.classList.add("is-hidden");
  dom.playerWorldBubble.classList.add("is-hidden");
  dom.worldCoach.classList.add("is-hidden");
  hideWorldHint();
  dom.npcWorldBubble.classList.remove("is-latest", "is-previous");
  dom.playerWorldBubble.classList.remove("is-latest", "is-previous");
  dom.worldReplyInput.value = "";
  dom.worldClearButton.classList.add("is-hidden");
  setWorldNpcCaptionVisible(false);
  dom.micButton.classList.remove("is-listening");
}

function feedbackLabel(result) {
  if (result.offlineCanContinue) return "🌈 연결이 느리지만 네 말은 틀렸다고 처리하지 않아요.";
  if (result.missionComplete) return "🏆 필요한 뜻을 모두 전달해 미션에 성공했어요!";
  if (result.decision === "progress") return "✅ 좋아요! 말한 내용이 미션에 반영됐어요.";
  if (result.status === "great") return "🌟 좋은 대답이에요! 뜻도 문장도 자연스러워요.";
  if (result.status === "polish") return "✨ 뜻이 잘 통했어요! 네 뜻을 살려 조금만 다듬었어요.";
  if (result.status === "continue") return "💬 좋은 대화예요! NPC가 자연스럽게 이어서 물어봐요.";
  if (result.status === "uncertain") return "🎧 틀린 게 아니에요. 뜻을 한 번만 더 확인할게요.";
  return "🧭 지금 여행 상황에 맞게 대화를 이어가 볼까요?";
}

function applyEvaluationResult(result, answer, questionText, { recordHistory = true } = {}) {
  const turn = currentTurn();
  if (!turn || !activeLocation || !activeMission) return;
  activeResult = result;
  showPlayerBubble(answer);
  if (Array.isArray(result.completedGoalIds)) activeMissionGoalIds = new Set(result.completedGoalIds);
  renderMissionGoals();
  if (result.canAdvance) hideWorldHint();
  else showCurrentMissionHint();
  if (recordHistory) {
    conversationHistory.push({ npc: questionText, learner: answer });
    conversationHistory = conversationHistory.slice(-6);
    renderConversationTrail();
  }
  dom.heardText.textContent = answer;
  dom.heardBox.classList.remove("is-hidden");
  dom.correctionCard.className = `correction-card is-${result.status}`;
  dom.correctionStatus.textContent = feedbackLabel(result);
  dom.correctedSentence.textContent = result.corrected || answer;
  dom.correctionReason.textContent = result.explanationKo || "";
  dom.nextTurnButton.classList.toggle("is-hidden", !result.canAdvance);
  dom.offlineContinueButton.classList.toggle("is-hidden", !result.offlineCanContinue);
  dom.retryButton.classList.toggle("is-hidden", Boolean(result.canAdvance));
  dom.nextTurnButton.textContent = "미션 성공 · 보상 받기 →";
  const corrected = String(result.corrected || "").trim();
  const normalizedAnswer = String(answer || "").trim().replace(/[.!?]+$/, "").toLowerCase();
  const normalizedCorrection = corrected.replace(/[.!?]+$/, "").toLowerCase();
  if (corrected && normalizedCorrection && normalizedCorrection !== normalizedAnswer) {
    dom.worldCoach.textContent = `✨ 더 자연스럽게 말하면: ${corrected}${result.explanationKo ? ` · ${result.explanationKo}` : ""}`;
    dom.worldCoach.classList.remove("is-hidden");
  } else {
    dom.worldCoach.classList.add("is-hidden");
    dom.worldCoach.textContent = "";
  }
  const npcReplyEn = result.npcReplyEn || (result.canAdvance ? turn.success : "");
  const npcReplyKo = result.npcReplyKo || (result.canAdvance ? turn.successKo : "");
  if (result.canAdvance) {
    pendingClarify = null;
    dom.npcLine.textContent = npcReplyEn;
    dom.npcTranslation.textContent = npcReplyKo;
    setNpcLineVisible(false);
    playActor(npcActors.get(activeLocation.id), "emote-yes", false);
    const completedMissionId = activeMission.id;
    presentNpcLine(npcReplyEn, {
      onEnd: () => window.setTimeout(() => {
        if (activeMission?.id === completedMissionId && activeResult?.canAdvance) finishMission();
      }, 480),
    });
  } else {
    const isClarify = result.decision === "clarify";
    const isSpecificClarify = isClarify && result.clarificationKind === "specific" && result.npcReplyEn;
    // When the NPC's reply already asks something (a natural clarification or
    // its own follow-up), never re-speak the previous question after it — a
    // real person says "Sorry, how many bags?" and stops.
    const npcAsksQuestion = npcReplyEn.includes("?");
    const followUpEn = isClarify ? "" : result.followUpEn || (npcAsksQuestion ? "" : questionText);
    const followUpKo = isClarify ? "" : result.followUpKo || (npcAsksQuestion ? "" : currentPrompt().ko || turn.npcKo);
    const combinedEn = isClarify
      ? result.npcReplyEn || "Sorry, could you say that again?"
      : [npcReplyEn, followUpEn].filter(Boolean).join(" ");
    const combinedKo = isClarify
      ? result.npcReplyKo || "미안해요. 다시 말해 줄래요?"
      : [npcReplyKo, followUpKo].filter(Boolean).join(" ");
    // Keep the real previous question as retry context. A clarification is a
    // brief conversational turn, not a replacement mission prompt.
    if (!isClarify) dynamicPrompts.set(activeMission.id, { en: combinedEn, ko: combinedKo });
    pendingClarify = isClarify
      ? {
        question: combinedEn,
        questionKo: combinedKo,
        sentence: isSpecificClarify ? String(answer || "").trim() : "",
      }
      : null;
    dom.npcLine.textContent = combinedEn;
    dom.npcTranslation.textContent = combinedKo;
    setNpcLineVisible(false);
    dom.retryButton.textContent = isClarify ? "🎙️ 다시 말하기" : "🎙️ 계속 대화하기";
    dom.answerInput.value = "";
    dom.worldReplyInput.value = "";
    playActor(npcActors.get(activeLocation.id), "interact-right", false);
    presentNpcLine(combinedEn);
  }
}

function guessOfflineMissionGoals(answer, mission) {
  const text = String(answer || "").toLowerCase().replace(/rib[- ]?eye/g, "ribeye");
  const patterns = {
    destination_city: /\bsunny city\b/,
    baggage_count: /\b(one|1|a single|only one)\b.*\b(bag|suitcase|luggage)\b|\b(bag|suitcase|luggage)\b.*\b(one|1|a single|only one)\b/,
    boarding_pass: /boarding pass|here (it|you) (is|are)|here you go/,
    electronics_out: /\b(laptop|computer|electronic|electronics|tablet|device)\b.*\b(out|remove|removed|take|taken|took)\b|\b(out|remove|removed|take|taken|took)\b.*\b(laptop|computer|electronic|electronics|tablet|device)\b/,
    seat_number: /\b18\s*a\b|\bseat\b.*\b(where|find|help|which|row)\b|\b(where|find|help|which|row)\b.*\bseat\b/,
    overhead_bag: /\b(overhead|compartment|bin)\b.*\b(bag|carry-on|carry on|luggage|put|place)\b|\b(bag|carry-on|carry on|luggage|put|place)\b.*\b(overhead|compartment|bin)\b/,
    meal_choice: /\b(chicken|pasta|meal|lunch|vegetarian|vegan|fish|beef|rice|sandwich)\b/,
    drink_request: /\b(water|juice|coffee|tea|soda|cola|coke|lemonade|milk|drink)\b/,
    baggage_carousel: /\b(carousel|baggage belt|belt|claim area)\b/,
    bag_description: /\b(bag|suitcase|luggage)\b.*\b(black|red|blue|green|yellow|white|gray|grey|brown|pink|purple|orange|large|big|medium|small|ribbon|tag|wheel|wheels|hard|soft)\b|\b(black|red|blue|green|yellow|white|gray|grey|brown|pink|purple|orange|large|big|medium|small|ribbon|tag|wheel|wheels|hard|soft)\b.*\b(bag|suitcase|luggage)\b/,
    taxi_available: /\b(taxi|cab|ride|available|free|take me|drive me)\b/,
    hotel_destination: /\b(sunny garden hotel|hotel)\b/,
    fare_question: /\b(fare|cost|price|how much|charge|expensive)\b/,
    luggage_help: /\b(bag|bags|suitcase|suitcases|luggage|trunk|boot)\b.*\b(help|put|load|carry|lift|take)\b|\b(help|put|load|carry|lift|take)\b.*\b(bag|bags|suitcase|suitcases|luggage|trunk|boot)\b/,
    reservation_name: /\b(reservation|booking|under|name is|booked)\b/,
    taxi_request: /\b(taxi|cab)\b.*\b(call|arrange|book|get|need|want|send)\b|\b(call|arrange|book|get|need|want|send)\b.*\b(taxi|cab)\b/,
    pickup_time: /\b(at\s+around|at|around|by)\s+((\d{1,2})(:\d{2})?\s*(a\s*m|p\s*m)?|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(\s+(twenty|thirty|forty|fifty))?(\s+(o'?clock|a\s*m|p\s*m))?)\b/,
    restaurant_destination: /\b(riverside steakhouse|steakhouse|restaurant|diner|cafe)\b/,
    table_request: /\b(table|seat|seating|reservation)\b/,
    extra_order: /\b(also|another|extra|more|side|fries|salad|soup|bread|dessert|cake|ice cream|order|have|get|bring)\b/,
    water_request: /\bwater\b/,
    bill_request: /\b(bill|check|receipt)\b/,
    card_payment: /\b(card|credit|debit|visa|mastercard|contactless|apple pay|google pay)\b/,
    checkout_request: /\b(check out|checking out|checkout|leave the hotel|leaving the hotel)\b/,
    minibar_none: /\bminibar\b.*\b(nothing|none|no|not|didn't|did not|haven't|have not|never)\b|\b(nothing|none|no|not|didn't|did not|haven't|have not|never)\b.*\bminibar\b/,
    luggage_storage: /\b(bag|bags|suitcase|suitcases|luggage)\b.*\b(hold|store|keep|leave|watch)\b|\b(hold|store|keep|leave|watch)\b.*\b(bag|bags|suitcase|suitcases|luggage)\b/,
    airport_destination: /\bairport\b/,
    terminal_question: /\bterminal\b/,
    gate_twelve: /\bgate\b.*\b(twelve|12)\b|\b(twelve|12)\b.*\bgate\b/,
    boarding_time: /\b(boarding|board|flight)\b.*\b(when|what time|time|begin|start|starts|close|closes|final)\b|\b(when|what time|time)\b.*\b(boarding|board|flight)\b/,
    passport: /passport|here (it|you) (is|are)/,
    purpose: /vacation|holiday|visit|family|grandmother|grandfather|work|study|business|travel/,
    duration: /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*(day|days|night|nights|week|weeks|month|months)\b/,
    towels: /towel/,
    quantity_two: /\b(two|2|a couple|couple of)\b/,
    polite_request: /please|could (i|you|we)|would (i|you|we)|may i/,
    steak: /\bsteak\b/,
    ribeye: /\bribeye\b/,
    two_drinks: /\b(two|2|a couple)\b.*\b(drink|drinks|coke|cokes|juice|juices|water|waters|soda|sodas|lemonade|lemonades)\b|\b(coke|juice|water|soda|lemonade)\b.*\b(and|plus)\b.*\b(coke|juice|water|soda|lemonade)\b/,
    jacket: /jacket/,
    navy_medium: /navy.*\b(m|medium)\b|\b(m|medium)\b.*navy/,
    try_on: /try (it|this|the jacket) on|try on/,
    museum_destination: /museum/,
    round_trip: /round[- ]?trip|return ticket/,
    platform: /platform/,
    two_child_tickets: /\b(two|2)\b.*child|child.*\b(two|2)\b/,
    photo_rule: /photo|picture|camera/,
    two_bikes: /\b(two|2)\b.*bike|bike.*\b(two|2)\b/,
    one_hour: /\b(one|1|an)\s*hour\b/,
    helmets: /helmet/,
    stomachache: /stomach|tummy|belly/,
    dizzy: /dizz|lightheaded/,
    pharmacy: /pharmacy|drugstore/,
    getting_ready: /getting ready|preparing|go out|going out/,
    one_hour_later: /\b(one|1|an)\s*hour\b/,
    polite: /please|could|would|thank/,
  };
  return mission.goals.filter((goal) => patterns[goal.id]?.test(text)).map((goal) => goal.id);
}

function offlineFallback(answer, confidence, turn) {
  const local = evaluateSentence(answer, turn, { confidence });
  const guessed = activeMission ? guessOfflineMissionGoals(answer, activeMission) : [];
  return {
    status: "uncertain",
    decision: guessed.length ? "continue" : "clarify",
    canAdvance: false,
    missionComplete: false,
    offlineCanContinue: true,
    completedGoalIds: [...activeMissionGoalIds],
    missingGoalIds: activeMission?.goals.map((goal) => goal.id).filter((id) => !activeMissionGoalIds.has(id)) || [],
    corrected: local.corrected || answer || turn.target,
    explanationKo: "연결이 느려 서버가 뜻을 확인하지 못했어요. 다시 시도하거나 보상 없이 이번 연습만 끝낼 수 있어요.",
    npcReplyEn: "I couldn't check your answer because the connection is slow.",
    npcReplyKo: "연결이 느려 대답을 확인하지 못했어요.",
    followUpEn: currentPrompt().en,
    followUpKo: currentPrompt().ko,
    reward: null,
  };
}

async function evaluateAnswer(answer, confidence = null, alternatives = []) {
  const turn = currentTurn();
  if (!turn || !activeLocation || !activeMission || evaluationPending || activeResult?.canAdvance) return;
  let spoken = String(answer || "").trim().slice(0, 240);
  if (!spoken) {
    setWorldVoiceState("먼저 영어로 말해 주세요. 직접 적어도 괜찮아요.");
    dom.worldReplyInput.focus();
    return;
  }
  // "Did you say one bag?" → "Yes." means the confirmed sentence was said.
  if (pendingClarify?.sentence && AFFIRMATION_PATTERN.test(spoken)) {
    spoken = pendingClarify.sentence;
  }

  discardAudioCapture();
  capturePhase = "sending";
  showPlayerBubble(spoken);

  const requestId = ++evaluationSequence;
  const sessionId = dialogueSession;
  const locationId = activeLocation.id;
  const missionId = activeMission.id;
  const questionText = pendingClarify?.question || currentPrompt().en;
  evaluationController?.abort();
  evaluationController = new AbortController();
  const timeout = window.setTimeout(() => evaluationController?.abort(), 10500);
  dom.heardText.textContent = spoken;
  dom.heardBox.classList.remove("is-hidden");
  dom.correctionCard.classList.add("is-hidden");
  setEvaluationPending(true);

  try {
    const response = await fetch("/api/english-travel-dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: evaluationController.signal,
      body: JSON.stringify({
        v: 2,
        mode: "mission",
        locationId,
        missionId,
        reply: spoken,
        speechConfidence: Number.isFinite(confidence) ? confidence : null,
        alternatives: Array.isArray(alternatives) ? alternatives.slice(0, 3) : [],
        currentNpcLine: questionText,
        missionStateToken: activeMissionStateToken,
        attemptCount: missionAttemptCount,
        history: conversationHistory.slice(-8),
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error(result?.code || `dialogue_${response.status}`);
    if (
      requestId !== evaluationSequence ||
      sessionId !== dialogueSession ||
      activeLocation?.id !== locationId ||
      activeMission?.id !== missionId
    ) return;
    activeMissionStateToken = typeof result.missionStateToken === "string" ? result.missionStateToken : activeMissionStateToken;
    missionAttemptCount += 1;
    applyEvaluationResult(result, spoken, questionText);
  } catch (error) {
    if (
      requestId !== evaluationSequence ||
      sessionId !== dialogueSession ||
      activeLocation?.id !== locationId ||
      activeMission?.id !== missionId
    ) return;
    missionAttemptCount += 1;
    applyEvaluationResult(offlineFallback(spoken, confidence, turn), spoken, questionText);
  } finally {
    window.clearTimeout(timeout);
    if (requestId === evaluationSequence && sessionId === dialogueSession) {
      evaluationController = null;
      setEvaluationPending(false);
    }
  }
}

function finishMission() {
  const location = activeLocation;
  const mission = activeMission;
  if (!location || !mission || !activeResult?.canAdvance) return;
  const reward = activeResult.reward || { ...mission.reward, grantId: `${mission.id}:reward-v1` };
  const firstCompletion = !state.rewardGrants.includes(reward.grantId);
  let stateChanged = false;
  if (firstCompletion) {
    state.rewardGrants.push(reward.grantId);
    state.xp += reward.xp;
    state.coins += reward.coins;
    state.needs.confidence = clampNeed(state.needs.confidence + 10);
    state.needs.food = clampNeed(state.needs.food - 4);
    state.needs.energy = clampNeed(state.needs.energy - 5);
    if (location.id === "restaurant") state.needs.food = clampNeed(state.needs.food + 18);
    if (location.id === "hotel") state.needs.energy = clampNeed(state.needs.energy + 10);
    stateChanged = true;
  }
  if (!state.completedMissions.includes(mission.id)) {
    state.completedMissions.push(mission.id);
    stateChanged = true;
  }
  if (!state.completed.includes(location.id)) {
    state.completed.push(location.id);
    stateChanged = true;
  }
  const completedIndex = MISSION_SEQUENCE_INDEX.get(mission.id);
  if (completedIndex === state.missionStep) {
    state.missionStep = Math.min(MISSION_SEQUENCE.length, state.missionStep + 1);
    stateChanged = true;
  }
  if (stateChanged) saveState();
  closeDialogue({ discardSession: true });
  dom.rewardIcon.textContent = location.icon;
  dom.rewardTitle.textContent = `${displayMissionTitle(mission)} 성공!`;
  dom.rewardPhrase.textContent = "실제 여행 순서 속에서 필요한 뜻을 영어로 정확히 전달했어요.";
  dom.rewardXp.textContent = firstCompletion ? `+${reward.xp} XP` : "완료";
  dom.rewardCoins.textContent = firstCompletion ? `+${reward.coins}` : "보상 수령 완료";
  dom.rewardExtra.textContent = `미션 ${missionNumber(mission)} 완료`;
  const nextMission = currentMission();
  dom.rewardContinue.textContent = nextMission
    ? `${missionNumber(nextMission)}번 미션으로 →`
    : "완주 결과 보기 →";
  dom.rewardScreen.classList.remove("is-hidden");
  updateHud();
}

function showSurpriseAlert(mission = pendingSurpriseMission()) {
  if (!mission) return;
  dom.surpriseAlert.classList.add("is-hidden");
  setMissionCard(null);
}

function effectText(item) {
  const effects = item.effects || {};
  const labels = [];
  if (effects.food) labels.push(`배부름 ${effects.food > 0 ? "+" : ""}${effects.food}`);
  if (effects.energy) labels.push(`에너지 ${effects.energy > 0 ? "+" : ""}${effects.energy}`);
  if (effects.confidence) labels.push(`자신감 ${effects.confidence > 0 ? "+" : ""}${effects.confidence}`);
  if (effects.xp) labels.push(`XP +${effects.xp}`);
  if (item.rest) labels.push(`휴식 +${item.rest}`);
  return labels.join(" · ") || "여행 스타일 아이템";
}

function lodgingUnlockReason(item) {
  if (item.tier === 1 && state.missionStep < 10) return "미션 10 완료 후 이용";
  if (item.tier === 2 && state.missionStep < 16) return "미션 16 완료 후 이용";
  return "";
}

function renderLifePanel(tab = activeLifeTab) {
  window.clearTimeout(lifeRestTimer);
  lifeRestTimer = null;
  activeLifeTab = ECONOMY[tab] ? tab : "food";
  dom.lifeCoinCount.textContent = String(state.coins);
  dom.lifePanel.querySelectorAll("[data-life-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lifeTab === activeLifeTab);
  });
  const outfit = ECONOMY.outfits.find((item) => item.id === state.equippedOutfit);
  const lodging = ECONOMY.lodgings.find((item) => item.id === state.currentLodging) || ECONOMY.lodgings[0];
  dom.lifeCurrent.innerHTML = "";
  const status = document.createElement("span");
  status.textContent = `${outfit?.icon || "👕"} 스타일: ${outfit?.nameKo || "기본 여행복"} · ${lodging.icon} 숙소: ${lodging.nameKo}`;
  dom.lifeCurrent.appendChild(status);
  const needs = document.createElement("span");
  needs.textContent = `🍽️ ${Math.round(clampNeed(state.needs.food))} · ⚡ ${Math.round(clampNeed(state.needs.energy))} · 💛 ${Math.round(clampNeed(state.needs.confidence))}`;
  dom.lifeCurrent.appendChild(needs);
  const restButton = document.createElement("button");
  restButton.type = "button";
  const restWait = Math.max(0, 60_000 - (Date.now() - state.lastRestAt));
  restButton.disabled = restWait > 0 || state.needs.energy >= 99;
  restButton.textContent = restWait > 0 ? `휴식 ${Math.ceil(restWait / 1000)}초 후` : state.needs.energy >= 99 ? "에너지 가득" : `숙소에서 휴식 +${lodging.rest}`;
  restButton.addEventListener("click", () => {
    if (Date.now() - state.lastRestAt < 60_000) return;
    state.lastRestAt = Date.now();
    state.needs.energy = clampNeed(state.needs.energy + lodging.rest);
    saveState();
    updateHud();
    renderLifePanel(activeLifeTab);
    showToast(`${lodging.icon} ${lodging.nameKo}에서 푹 쉬었어요. 에너지 +${lodging.rest}`, 3800);
  });
  dom.lifeCurrent.appendChild(restButton);
  if (restWait > 0) {
    lifeRestTimer = window.setTimeout(() => {
      lifeRestTimer = null;
      if (!dom.lifePanel.classList.contains("is-hidden")) renderLifePanel(activeLifeTab);
    }, restWait + 80);
  }

  dom.lifeCatalog.innerHTML = "";
  (ECONOMY[activeLifeTab] || []).forEach((item) => {
    const card = document.createElement("article");
    card.className = "life-item";
    const icon = document.createElement("span");
    icon.textContent = item.icon;
    const name = document.createElement("strong");
    name.textContent = item.nameKo;
    const detail = document.createElement("small");
    detail.textContent = effectText(item);
    const button = document.createElement("button");
    button.type = "button";
    let owned = false;
    let equipped = false;
    let lockedReason = "";
    if (activeLifeTab === "outfits") {
      owned = state.ownedOutfits.includes(item.id);
      equipped = state.equippedOutfit === item.id;
    } else if (activeLifeTab === "activities") {
      owned = state.completedActivities.includes(item.id);
    } else if (activeLifeTab === "lodgings") {
      owned = state.ownedLodgings.includes(item.id);
      equipped = state.currentLodging === item.id;
      lockedReason = lodgingUnlockReason(item);
    }
    card.classList.toggle("is-owned", owned);
    if (equipped) button.textContent = activeLifeTab === "lodgings" ? "현재 숙소" : "입는 중";
    else if (owned) button.textContent = activeLifeTab === "outfits" ? "입기" : activeLifeTab === "lodgings" ? "이 숙소로 이동" : "체험 완료";
    else if (lockedReason) button.textContent = lockedReason;
    else button.textContent = `🪙 ${item.price} · ${activeLifeTab === "food" ? "먹기" : activeLifeTab === "activities" ? "즐기기" : "구입"}`;
    const tooFull = activeLifeTab === "food" && state.needs.food >= 98;
    button.disabled = equipped || Boolean(lockedReason) || tooFull || (!owned && state.coins < item.price);
    button.addEventListener("click", () => purchaseLifeItem(activeLifeTab, item.id));
    card.append(icon, name, detail, button);
    dom.lifeCatalog.appendChild(card);
  });
  dom.lifeHelp.textContent = activeLifeTab === "food"
    ? "배가 고플 때 음식을 사 먹으면 컨디션이 회복돼요."
    : activeLifeTab === "outfits"
      ? "구입한 여행 스타일은 언제든 다시 입을 수 있어요."
      : activeLifeTab === "activities"
        ? "액티비티는 한 번 해금되며 XP와 자신감을 얻어요."
        : "좋은 숙소로 옮기면 휴식할 때 에너지가 더 많이 회복돼요.";
}

function applyEffects(effects = {}) {
  if (effects.food) state.needs.food = clampNeed(state.needs.food + effects.food);
  if (effects.energy) state.needs.energy = clampNeed(state.needs.energy + effects.energy);
  if (effects.confidence) state.needs.confidence = clampNeed(state.needs.confidence + effects.confidence);
  if (effects.xp) state.xp += effects.xp;
}

function purchaseLifeItem(tab, itemId) {
  const item = ECONOMY[tab]?.find((entry) => entry.id === itemId);
  if (!item) return;
  if (tab === "outfits" && state.ownedOutfits.includes(item.id)) {
    state.equippedOutfit = item.id;
    updateOutfitVisual();
    showToast(`${item.icon} ${item.nameKo}으로 갈아입었어요!`, 3200);
  } else if (tab === "lodgings" && state.ownedLodgings.includes(item.id)) {
    state.currentLodging = item.id;
    showToast(`${item.icon} ${item.nameKo}으로 숙소를 옮겼어요!`, 3400);
  } else if (tab === "activities" && state.completedActivities.includes(item.id)) {
    showToast(`${item.icon} 이미 즐긴 액티비티예요. 여행 추억에 저장되어 있어요.`, 3200);
    return;
  } else {
    if (lodgingUnlockReason(item) || state.coins < item.price) return;
    state.coins -= item.price;
    if (tab === "food") applyEffects(item.effects);
    if (tab === "outfits") {
      state.ownedOutfits.push(item.id);
      state.equippedOutfit = item.id;
      updateOutfitVisual();
    }
    if (tab === "activities") {
      state.completedActivities.push(item.id);
      applyEffects(item.effects);
      playActor(playerActor, "emote-yes", false);
    }
    if (tab === "lodgings") {
      if (!state.ownedLodgings.includes(item.id)) state.ownedLodgings.push(item.id);
      state.currentLodging = item.id;
    }
    showToast(`${item.icon} ${item.nameKo} ${tab === "food" ? "맛있게 먹었어요!" : tab === "activities" ? "체험 완료!" : "구입 완료!"}`, 3600);
  }
  saveState();
  updateHud();
  renderLifePanel(tab);
}

function isCurrentAudioContext(context) {
  return Boolean(
    context &&
    context.captureId === audioCaptureId &&
    context.dialogueSession === dialogueSession &&
    context.missionId === activeMission?.id &&
    context.locationId === activeLocation?.id &&
    context.turnId === currentTurn()?.id
  );
}

async function startListening() {
  if (!activeLocation || evaluationPending || npcSpeaking || !learnerTurnReady || activeResult?.canAdvance) return;
  if (["starting", "listening", "stopping", "transcribing", "sending"].includes(capturePhase)) return;
  if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
    capturePhase = dom.worldReplyInput.value.trim() ? "captured" : "idle";
    setWorldVoiceState("이 브라우저에서는 아래 칸에 영어를 직접 적고 전송해 주세요.");
    dom.worldReplyInput.focus();
    updateWorldSendState();
    return;
  }

  discardAudioCapture();
  const context = {
    captureId: ++audioCaptureId,
    dialogueSession,
    missionId: activeMission.id,
    locationId: activeLocation.id,
    turnId: currentTurn()?.id,
  };
  audioCaptureContext = context;
  capturePhase = "starting";
  dom.worldReplyInput.value = "";
  dom.answerInput.value = "";
  dom.heardBox.classList.add("is-hidden");
  showPlayerBubble("");
  setWorldVoiceState("🎙️ 마이크를 여는 중…", "thinking");
  updateWorldSendState();

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (!isCurrentAudioContext(context)) {
      stopAudioTracks(stream);
      return;
    }
    const mimeType = preferredAudioMime();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      if (!isCurrentAudioContext(context)) return;
      discardAudioCapture({ abortRequest: false });
      capturePhase = "idle";
      setWorldVoiceState("마이크 녹음을 시작하지 못했어요. 다시 눌러 주세요.");
      updateWorldSendState();
    }, { once: true });
    audioStream = stream;
    audioRecorder = recorder;
    audioChunks = chunks;
    recorder.start(250);
    capturePhase = "listening";
    dom.micButton.classList.add("is-listening");
    dom.micButton.querySelector("b").textContent = "영어로 말해 보세요…";
    setWorldVoiceState("듣고 있어요. 다 말했으면 같은 버튼을 눌러 전송하세요.", "listening");
    audioMaxTimer = window.setTimeout(() => {
      if (!isCurrentAudioContext(context) || capturePhase !== "listening") return;
      setWorldVoiceState("말하기 시간이 되어 자동으로 전송할게요.", "thinking");
      void stopListeningAndSend();
    }, 20000);
    updateWorldSendState();
  } catch (error) {
    stopAudioTracks(stream);
    if (!isCurrentAudioContext(context)) return;
    discardAudioCapture({ abortRequest: false });
    capturePhase = "idle";
    const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    setWorldVoiceState(denied
      ? "마이크 권한이 꺼져 있어요. 아래 칸에 영어를 직접 적어 주세요."
      : "마이크를 열지 못했어요. 다시 누르거나 영어를 직접 적어 주세요.");
    dom.worldReplyInput.focus();
    updateWorldSendState();
  }
}

function stopAudioRecorder(context) {
  const recorder = audioRecorder;
  const stream = audioStream;
  const chunks = audioChunks;
  window.clearTimeout(audioMaxTimer);
  audioMaxTimer = null;
  if (!recorder) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      const mime = recorder.mimeType || preferredAudioMime() || "audio/webm";
      const blob = chunks.length ? new Blob(chunks, { type: mime }) : null;
      stopAudioTracks(stream);
      if (audioRecorder === recorder) audioRecorder = null;
      if (audioChunks === chunks) audioChunks = [];
      resolve(isCurrentAudioContext(context) ? blob : null);
    };
    const watchdog = window.setTimeout(finish, 1800);
    recorder.addEventListener("stop", finish, { once: true });
    if (recorder.state === "inactive") finish();
    else {
      try { recorder.requestData(); } catch {}
      try { recorder.stop(); } catch { finish(); }
    }
  });
}

async function evaluateRecordedAnswer(blob, context) {
  if (!blob || blob.size < 500 || !isCurrentAudioContext(context)) {
    capturePhase = "idle";
    setWorldVoiceState("목소리를 듣지 못했어요. 버튼을 눌러 다시 말해 주세요.");
    updateWorldSendState();
    return;
  }
  const requestId = ++evaluationSequence;
  const sessionId = dialogueSession;
  const locationId = activeLocation.id;
  const missionId = activeMission.id;
  const questionText = pendingClarify?.question || currentPrompt().en;
  const confirmingSentence = pendingClarify?.sentence || "";
  let retryAfterFailure = false;
  evaluationController?.abort();
  audioRequestController?.abort();
  audioRequestController = new AbortController();
  evaluationController = audioRequestController;
  const timeout = window.setTimeout(() => audioRequestController?.abort(), 28500);
  capturePhase = "transcribing";
  setEvaluationPending(true);
  setWorldVoiceState("원래 음성과 지금 상황을 함께 이해하는 중…", "thinking");

  try {
    let aiBlob = blob;
    try {
      aiBlob = await blobToMonoWav(blob);
    } catch {
      // The server can still use the original recording with its transcription fallback.
    }
    if (!isCurrentAudioContext(context)) return;
    const audio = await blobToDataUrl(aiBlob);
    if (!isCurrentAudioContext(context)) return;
    const response = await fetch("/api/english-travel-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: audioRequestController.signal,
      body: JSON.stringify({
        v: 1,
        audio,
        mime: aiBlob.type,
        locationId,
        missionId,
        currentNpcLine: questionText,
        confirmationQuestion: confirmingSentence ? questionText : undefined,
        confirmationSentence: confirmingSentence || undefined,
        missionStateToken: activeMissionStateToken,
        attemptCount: missionAttemptCount,
        history: conversationHistory.slice(-8),
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok || !result.heardText) throw new Error(result?.code || `speech_${response.status}`);
    if (
      requestId !== evaluationSequence ||
      sessionId !== dialogueSession ||
      activeLocation?.id !== locationId ||
      activeMission?.id !== missionId
    ) return;
    const spoken = String(result.heardText).trim().slice(0, 240);
    activeMissionStateToken = typeof result.missionStateToken === "string" ? result.missionStateToken : activeMissionStateToken;
    missionAttemptCount += 1;
    dom.answerInput.value = spoken;
    dom.worldReplyInput.value = spoken;
    applyEvaluationResult(result, spoken, questionText);
  } catch (error) {
    if (
      requestId !== evaluationSequence ||
      sessionId !== dialogueSession ||
      activeLocation?.id !== locationId ||
      activeMission?.id !== missionId
    ) return;
    missionAttemptCount += 1;
    capturePhase = "idle";
    dom.answerInput.value = "";
    dom.worldReplyInput.value = "";
    dom.heardBox.classList.add("is-hidden");
    showPlayerBubble("");
    showCurrentMissionHint();
    retryAfterFailure = true;
  } finally {
    window.clearTimeout(timeout);
    audioChunks = [];
    audioCaptureContext = null;
    if (requestId === evaluationSequence && sessionId === dialogueSession) {
      audioRequestController = null;
      evaluationController = null;
      setEvaluationPending(false);
      if (retryAfterFailure && activeLocation && !npcSpeaking) {
        dom.npcLine.textContent = "Sorry, could you say that again?";
        dom.npcTranslation.textContent = "미안해요. 다시 말해 줄래요?";
        presentNpcLine("Sorry, could you say that again?");
      }
    }
  }
}

async function stopListeningAndSend() {
  if (capturePhase !== "listening" || !audioCaptureContext) return;
  const context = audioCaptureContext;
  capturePhase = "stopping";
  dom.micButton.classList.remove("is-listening");
  dom.micButton.querySelector("b").textContent = "눌러서 말하기";
  setWorldVoiceState("원래 음성을 전송할 준비 중…", "thinking");
  updateWorldSendState();
  const blob = await stopAudioRecorder(context);
  if (!isCurrentAudioContext(context)) return;
  await evaluateRecordedAnswer(blob, context);
}

function handleWalkieTalkieButton() {
  if (!activeLocation || evaluationPending || npcSpeaking || !learnerTurnReady || activeResult?.canAdvance) return;
  if (capturePhase === "listening") {
    void stopListeningAndSend();
    return;
  }
  if (["starting", "stopping", "transcribing", "sending"].includes(capturePhase)) return;
  if (dom.worldReplyInput.value.trim()) {
    sendWorldReply();
    return;
  }
  void startListening();
}

function sendWorldReply() {
  if (!activeLocation || evaluationPending || npcSpeaking || !learnerTurnReady || activeResult?.canAdvance) return;
  const reply = dom.worldReplyInput.value.trim();
  if (!reply) {
    setWorldVoiceState("먼저 영어로 말해 주세요. 직접 적어도 괜찮아요.");
    dom.worldReplyInput.focus();
    return;
  }
  capturePhase = "sending";
  showPlayerBubble(reply);
  setWorldVoiceState("전송했어요. 상대방이 생각하는 중…", "thinking");
  updateWorldSendState();
  void evaluateAnswer(reply);
}

function bindUi() {
  dom.startButton.addEventListener("click", () => {
    const name = dom.travelerName.value.trim().replace(/[^a-zA-Z '-]/g, "").slice(0, 16) || "Jin";
    state.travelerName = name;
    state.started = true;
    started = true;
    saveState();
    updateHud();
    dom.welcome.classList.add("is-hidden");
    dom.canvas.focus();
    showToast(`${name}, Sunny City에 온 걸 환영해요! NPC 가까이에서 말 걸기를 눌러 보세요.`, 4300);
  });
  dom.interactButton.addEventListener("click", beginNearestDialogue);
  dom.worldClearButton.addEventListener("click", clearWorldReply);
  dom.worldSendButton.addEventListener("click", handleWalkieTalkieButton);
  dom.npcWorldReplay.addEventListener("click", replayWorldNpcLine);
  dom.npcWorldCaptionToggle.addEventListener("click", () => {
    setWorldNpcCaptionVisible(!dom.npcWorldBubble.classList.contains("is-caption-visible"));
  });
  dom.worldReplyInput.addEventListener("input", () => {
    if (["starting", "listening", "stopping", "transcribing"].includes(capturePhase)) discardAudioCapture();
    capturePhase = dom.worldReplyInput.value.trim() ? "captured" : "idle";
    showPlayerBubble(dom.worldReplyInput.value);
    setWorldVoiceState(dom.worldReplyInput.value.trim()
      ? "같은 버튼을 눌러 전송하세요."
      : "무전기 버튼을 누르고 영어로 말해 보세요.");
    updateWorldSendState();
  });
  dom.worldReplyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleWalkieTalkieButton();
    }
  });
  dom.dialogueClose.addEventListener("click", closeDialogue);
  dom.npcReplay.addEventListener("click", () => speak(dom.npcLine.textContent, { slower: true }));
  dom.lineRevealToggle.addEventListener("click", () => setNpcLineVisible(dom.npcLine.classList.contains("is-hidden")));
  dom.correctedReplay.addEventListener("click", () => speak(dom.correctedSentence.textContent, { slower: true }));
  dom.translationToggle.addEventListener("click", () => setTranslationVisible(dom.npcTranslation.classList.contains("is-hidden")));
  dom.hintToggle.addEventListener("click", () => setHintsVisible(dom.phraseChips.classList.contains("is-hidden")));
  dom.historyToggle.addEventListener("click", () => {
    conversationTrailVisible = !conversationTrailVisible;
    renderConversationTrail();
  });
  dom.micButton.addEventListener("click", handleWalkieTalkieButton);
  dom.retryButton.addEventListener("click", () => {
    if (evaluationPending) return;
    activeResult = null;
    dom.correctionCard.classList.add("is-hidden");
    dom.heardBox.classList.add("is-hidden");
    dom.nextTurnButton.classList.add("is-hidden");
    dom.offlineContinueButton.classList.add("is-hidden");
    dom.answerInput.value = "";
    const prompt = currentPrompt();
    const retryLine = dom.npcLine.textContent.trim() || prompt.en;
    dom.npcLine.textContent = retryLine;
    dom.npcTranslation.textContent = prompt.ko;
    setNpcLineVisible(false);
    presentNpcLine(retryLine);
  });
  dom.offlineContinueButton.addEventListener("click", () => {
    if (!activeResult?.offlineCanContinue || !activeLocation || !activeMission) return;
    const location = activeLocation;
    closeDialogue({ discardSession: true });
    setMissionCard(location);
    showToast("연습은 여기서 마쳤어요. 코인과 미션 완료는 연결이 돌아온 뒤 다시 확인해 주세요.", 5200);
  });
  dom.answerSubmit.addEventListener("click", () => void evaluateAnswer(dom.answerInput.value));
  dom.answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void evaluateAnswer(dom.answerInput.value);
    }
  });
  dom.nextTurnButton.addEventListener("click", () => {
    if (!activeResult?.canAdvance) return;
    finishMission();
  });
  dom.passportButton.addEventListener("click", () => {
    if (activeLocation) closeDialogue();
    dom.lifePanel.classList.add("is-hidden");
    updateHud();
    dom.passportPanel.classList.remove("is-hidden");
  });
  dom.passportClose.addEventListener("click", () => dom.passportPanel.classList.add("is-hidden"));
  dom.passportPanel.addEventListener("click", (event) => {
    if (event.target === dom.passportPanel) dom.passportPanel.classList.add("is-hidden");
  });
  dom.lifeButton.addEventListener("click", () => {
    if (activeLocation) closeDialogue();
    dom.passportPanel.classList.add("is-hidden");
    renderLifePanel(activeLifeTab);
    dom.lifePanel.classList.remove("is-hidden");
  });
  dom.lifeClose.addEventListener("click", () => dom.lifePanel.classList.add("is-hidden"));
  dom.lifePanel.addEventListener("click", (event) => {
    if (event.target === dom.lifePanel) dom.lifePanel.classList.add("is-hidden");
  });
  dom.lifePanel.querySelectorAll("[data-life-tab]").forEach((button) => {
    button.addEventListener("click", () => renderLifePanel(button.dataset.lifeTab));
  });
  dom.surpriseStart.addEventListener("click", () => {
    const mission = pendingSurpriseMission();
    if (!mission) {
      dom.surpriseAlert.classList.add("is-hidden");
      return;
    }
    const location = LOCATIONS.find((item) => item.id === mission.locationId);
    dom.surpriseAlert.classList.add("is-hidden");
    openDialogue(location, mission);
  });
  dom.surpriseLater.addEventListener("click", () => {
    const mission = pendingSurpriseMission();
    dom.surpriseAlert.classList.add("is-hidden");
    setMissionCard(null);
    const location = LOCATIONS.find((item) => item.id === mission?.locationId);
    showToast(`⚡ ${location?.titleKo || "지도"}에 돌발 미션을 표시했어요. 먼저 해결해야 다음 미션을 시작할 수 있어요.`, 4700);
  });
  dom.rewardContinue.addEventListener("click", () => {
    dom.rewardScreen.classList.add("is-hidden");
    const previousMission = missionAtStep(Math.max(0, state.missionStep - 1));
    const nextMission = currentMission();
    const next = missionLocation(nextMission);
    setMissionCard();
    updateHud();
    if (!nextMission || !next) {
      showToast(`🎉 ${MISSION_SEQUENCE.length}개 여행 미션을 모두 해결했어요! 출국부터 귀국까지 완주했어요.`, 5600);
      return;
    }
    if (previousMission?.locationId === nextMission.locationId) {
      nearestLocation = null;
      showToast(`새 미션이에요. ${nextMission.npcOverride?.name || next.npc.name}에게 다시 말 걸어 주세요.`, 3900);
      return;
    }
    syncMissionScene({ reposition: true });
    showToast(`미션 ${missionNumber(nextMission)}: ${next.titleKo}로 이동하세요.`, 4200);
  });
  dom.soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    if (!soundEnabled) {
      const wasSpeaking = npcSpeaking;
      const completed = Boolean(activeResult?.canAdvance);
      speechSequence += 1;
      npcSpeaking = false;
      activeUtterance = null;
      window.speechSynthesis?.cancel?.();
      if (wasSpeaking && activeLocation) {
        setWorldNpcCaptionVisible(true);
        if (completed) window.setTimeout(finishMission, 520);
        else beginLearnerTurn();
      }
    } else {
      try { window.speechSynthesis?.resume?.(); } catch {}
    }
    dom.soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
    dom.soundToggle.setAttribute("aria-pressed", String(!soundEnabled));
    dom.soundToggle.setAttribute("aria-label", soundEnabled ? "NPC 음성 끄기" : "NPC 음성 켜기");
  });

  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (event.code === "KeyE") {
      event.preventDefault();
      if (!event.repeat) beginNearestDialogue();
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.code === "Escape") {
      if (activeLocation) closeDialogue();
      else if (!dom.surpriseAlert.classList.contains("is-hidden")) {
        dom.surpriseAlert.classList.add("is-hidden");
        setMissionCard(null);
      }
      else if (!dom.lifePanel.classList.contains("is-hidden")) dom.lifePanel.classList.add("is-hidden");
      else if (!dom.passportPanel.classList.contains("is-hidden")) dom.passportPanel.classList.add("is-hidden");
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
  window.addEventListener("resize", () => {
    if (!renderer || !camera) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setSize(innerWidth, innerHeight);
    requestAnimationFrame(refreshWayfinderBounds);
  });
  window.addEventListener("beforeunload", saveState);
  window.setInterval(() => {
    if (started) saveState();
  }, 5000);
  setupJoystick();
  setupMobileCameraLook();
}

function setupJoystick() {
  let pointerId = null;
  const reset = (event) => {
    if (event && pointerId !== event.pointerId) return;
    pointerId = null;
    joystick.set(0, 0);
    dom.joystickKnob.style.transform = "translate(-50%, -50%)";
  };
  const update = (event) => {
    const rect = dom.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const max = rect.width * .32;
    let x = event.clientX - centerX;
    let y = event.clientY - centerY;
    const length = Math.hypot(x, y);
    if (length > max) {
      x = (x / length) * max;
      y = (y / length) * max;
    }
    joystick.set(x / max, y / max);
    dom.joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  };
  dom.joystickBase.addEventListener("pointerdown", (event) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    dom.joystickBase.setPointerCapture(pointerId);
    update(event);
    event.preventDefault();
  });
  dom.joystickBase.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointerId) {
      update(event);
      event.preventDefault();
    }
  });
  dom.joystickBase.addEventListener("pointerup", reset);
  dom.joystickBase.addEventListener("pointercancel", reset);
  dom.joystickBase.addEventListener("lostpointercapture", reset);
  window.addEventListener("blur", () => reset());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
}

function setupMobileCameraLook() {
  let pointerId = null;
  let startY = 0;
  let startLook = 0;
  const dragSlop = 8;

  const reset = (event) => {
    if (event && pointerId !== event.pointerId) return;
    const capturedId = pointerId;
    pointerId = null;
    if (capturedId !== null && dom.canvas.hasPointerCapture?.(capturedId)) {
      try { dom.canvas.releasePointerCapture(capturedId); } catch {}
    }
  };

  dom.canvas.addEventListener("pointerdown", (event) => {
    if (
      event.pointerType === "mouse" ||
      pointerId !== null ||
      !started ||
      isBlockingOverlayOpen()
    ) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    startLook = cameraLookTarget;
    try { dom.canvas.setPointerCapture(pointerId); } catch {}
    event.preventDefault();
  }, { passive: false });

  dom.canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    if (isBlockingOverlayOpen()) {
      reset(event);
      return;
    }
    const rawDeltaY = event.clientY - startY;
    if (Math.abs(rawDeltaY) <= dragSlop) return;
    cameraLookTarget = cameraLookFromDrag(startLook, rawDeltaY);
    event.preventDefault();
  }, { passive: false });

  dom.canvas.addEventListener("pointerup", reset);
  dom.canvas.addEventListener("pointercancel", reset);
  dom.canvas.addEventListener("lostpointercapture", reset);
  window.addEventListener("blur", () => reset());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
}

async function init() {
  renderStaticUi();
  bindUi();
  setMissionCard();
  try {
    if (window.location.protocol === "file:") {
      throw new Error("Local file URLs cannot fetch the 3D model assets.");
    }
    setupRenderer();
    animate();
    setLoading(6, "여행 가방을 챙기는 중…");
    await preloadAssets();
    await buildWorld();
    updateHud();
    setLoading(100, "Sunny City 도착!");
    loadingFinished = true;
    started = Boolean(state.started);
    setTimeout(() => {
      dom.loadingScreen.classList.add("is-leaving");
      setTimeout(() => {
        dom.loadingScreen.classList.add("is-hidden");
        if (!state.started) dom.welcome.classList.remove("is-hidden");
        else {
          dom.welcome.classList.add("is-hidden");
          const next = currentMission();
          const target = missionLocation(next);
          showToast(next
            ? `${state.travelerName}, 미션 ${missionNumber(next)}를 이어서 시작해요. ${target?.titleKo || "목적지"}로 가세요!`
            : `${state.travelerName}, 여행 미션을 모두 완주했어요!`, 3800);
        }
      }, 520);
    }, 280);
  } catch (error) {
    console.error(error);
    dom.loadingText.textContent = location.protocol === "file:"
      ? "3D 에셋은 보안 연결이 필요해요. 배포된 사이트 주소에서 열어 주세요."
      : "3D 도시를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 새로고침해 주세요.";
    dom.loadingBar.style.width = "100%";
    dom.loadingBar.style.background = "#ff7c73";
  }
}

init();
