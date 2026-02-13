<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

type Phase = "start" | "playing" | "transition" | "results";
type Mode = "simple" | "challenge" | "hell" | "final";
type AnsState = "idle" | "correct" | "wrong" | "timeout";

interface GraphPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
  showCoords?: boolean;
}

interface Question {
  type: "identify" | "area";
  target?: GraphPoint;
  refs?: GraphPoint[];
  shape?: GraphPoint[];
  choices: string[];
  correctIdx: number;
  prompt: string;
}

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

const RANGE = 10;
const MODES: Mode[] = ["simple", "challenge", "hell", "final"];

const MODE_CFG: Record<
  Mode,
  {
    time: number;
    choices: number;
    questions: number;
    grid: boolean;
    nums: boolean;
  }
> = {
  simple: { time: 20, choices: 3, questions: 3, grid: true, nums: true },
  challenge: { time: 10, choices: 5, questions: 3, grid: false, nums: true },
  hell: { time: 10, choices: 7, questions: 3, grid: false, nums: false },
  final: { time: 0, choices: 5, questions: 6, grid: false, nums: false },
};

const POINTS_PER_MODE: Record<Mode, number> = {
  simple: 10,
  challenge: 20,
  hell: 30,
  final: 50,
};

const TRANSITION_MSG: Record<string, { title: string; sub: string }> = {
  challenge: {
    title: "Level Up!",
    sub: "Entering Challenge Mode — Grid lines removed!",
  },
  hell: {
    title: "Impressive!",
    sub: "Welcome to Hell Mode — No grid, no number labels!",
  },
  final: {
    title: "Final Challenge!",
    sub: "Mixed problems: area calculation & extreme identification. No time limit — speed is rewarded!",
  },
};

// ══════════════════════════════════════════════════════════════
// Reactive State
// ══════════════════════════════════════════════════════════════

const canvasRef = ref<HTMLCanvasElement | null>(null);
const phase = ref<Phase>("start");
const currentMode = ref<Mode>("simple");
const modeQIdx = ref(0);
const question = ref<Question | null>(null);
const score = ref(0);
const correctCount = ref(0);
const wrongCount = ref(0);
const timeLeft = ref(0);
const maxTime = ref(0);
const selectedIdx = ref<number | null>(null);
const answerState = ref<AnsState>("idle");
const transTitle = ref("");
const transSub = ref("");
const finalStartMs = ref(0);
const finalElapsedSec = ref(0);
const finalElapsedDisplay = ref(0);

let countdownTimer: number | null = null;
let finalClockTimer: number | null = null;

// ══════════════════════════════════════════════════════════════
// Computed
// ══════════════════════════════════════════════════════════════

const cfg = computed(() => MODE_CFG[currentMode.value]);

const modeLabel = computed(() => {
  const m: Record<Mode, string> = {
    simple: "Simple",
    challenge: "Challenge",
    hell: "Hell",
    final: "Final Challenge",
  };
  return m[currentMode.value];
});

const questionLabel = computed(
  () => `${modeQIdx.value + 1} / ${cfg.value.questions}`,
);

const timerPct = computed(() =>
  maxTime.value > 0 ? (timeLeft.value / maxTime.value) * 100 : 100,
);

// ══════════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════════

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════════════════════════════════
// Canvas: Setup & Drawing
// ══════════════════════════════════════════════════════════════

function setupCanvas() {
  const el = canvasRef.value;
  if (!el) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = el.getBoundingClientRect();

  // Ensure minimum dimensions
  const w = Math.max(Math.floor(rect.width), 200);
  const h = Math.max(Math.floor(rect.height), 200);

  el.width = w * dpr;
  el.height = h * dpr;

  const ctx = el.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function drawGraph(opts: {
  showGrid: boolean;
  showNumbers: boolean;
  points: GraphPoint[];
  edges?: [GraphPoint, GraphPoint][];
}) {
  const el = canvasRef.value;
  if (!el) return;
  const ctx = el.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = el.width / dpr;
  const h = el.height / dpr;
  const pad = 32;
  const gSize = Math.min(w - pad * 2, h - pad * 2);
  const ox = (w - gSize) / 2;
  const oy = (h - gSize) / 2;
  const unit = gSize / (RANGE * 2);
  const cx = ox + gSize / 2;
  const cy = oy + gSize / 2;

  const toP = (gx: number, gy: number): [number, number] => [
    cx + gx * unit,
    cy - gy * unit,
  ];

  // Background
  ctx.clearRect(0, 0, w, h);

  // Subtle graph area background
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(ox, oy, gSize, gSize);

  // Grid
  if (opts.showGrid) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = -RANGE; i <= RANGE; i++) {
      if (i === 0) continue;
      const [vx] = toP(i, 0);
      ctx.beginPath();
      ctx.moveTo(vx, oy);
      ctx.lineTo(vx, oy + gSize);
      ctx.stroke();
      const [, hy] = toP(0, i);
      ctx.beginPath();
      ctx.moveTo(ox, hy);
      ctx.lineTo(ox + gSize, hy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Axes
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ox, cy);
  ctx.lineTo(ox + gSize, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, oy);
  ctx.lineTo(cx, oy + gSize);
  ctx.stroke();
  ctx.restore();

  // Arrowheads
  const asz = 7;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  // X-axis right
  ctx.beginPath();
  ctx.moveTo(ox + gSize, cy);
  ctx.lineTo(ox + gSize - asz, cy - asz / 2);
  ctx.lineTo(ox + gSize - asz, cy + asz / 2);
  ctx.closePath();
  ctx.fill();
  // Y-axis top
  ctx.beginPath();
  ctx.moveTo(cx, oy);
  ctx.lineTo(cx - asz / 2, oy + asz);
  ctx.lineTo(cx + asz / 2, oy + asz);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Tick marks
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  for (let i = -RANGE; i <= RANGE; i++) {
    if (i === 0) continue;
    const [tx] = toP(i, 0);
    ctx.beginPath();
    ctx.moveTo(tx, cy - 4);
    ctx.lineTo(tx, cy + 4);
    ctx.stroke();
    const [, ty] = toP(0, i);
    ctx.beginPath();
    ctx.moveTo(cx - 4, ty);
    ctx.lineTo(cx + 4, ty);
    ctx.stroke();
  }
  ctx.restore();

  // Number labels
  if (opts.showNumbers) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    const fontSize = Math.max(10, Math.min(12, unit * 0.45));
    ctx.font = `${fontSize}px system-ui`;
    for (let i = -RANGE; i <= RANGE; i++) {
      if (i === 0) continue;
      const [nx] = toP(i, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(String(i), nx, cy + 8);
      const [, ny] = toP(0, i);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i), cx - 8, ny);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("O", cx - 6, cy + 6);
    ctx.restore();
  }

  // Axis caption (x, y)
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "italic 13px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("x", ox + gSize + 14, cy);
  ctx.fillText("y", cx, oy - 14);
  ctx.restore();

  // Shape edges
  if (opts.edges && opts.edges.length > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(71,158,245,0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    for (const [p1, p2] of opts.edges) {
      const [x1, y1] = toP(p1.x, p1.y);
      const [x2, y2] = toP(p2.x, p2.y);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Fill shape area with very subtle color
    if (opts.edges.length >= 3) {
      ctx.save();
      ctx.fillStyle = "rgba(71,158,245,0.06)";
      ctx.beginPath();
      const [sx, sy] = toP(opts.edges[0][0].x, opts.edges[0][0].y);
      ctx.moveTo(sx, sy);
      for (const [, p2] of opts.edges) {
        const [ex, ey] = toP(p2.x, p2.y);
        ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Points
  for (const pt of opts.points) {
    const [px, py] = toP(pt.x, pt.y);
    const color = pt.color || "#479ef5";

    // Glow
    ctx.save();
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 14);
    grad.addColorStop(0, `${color}55`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dot
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Label
    if (pt.label) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(pt.label, px + 10, py - 8);
      ctx.restore();
    }

    // Coordinate text
    if (pt.showCoords) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`(${pt.x}, ${pt.y})`, px + 10, py + 6);
      ctx.restore();
    }
  }
}

function renderQuestion() {
  const curr = question.value;
  if (!curr) return;
  const c = cfg.value;
  const points: GraphPoint[] = [];
  let edges: [GraphPoint, GraphPoint][] | undefined;

  if (curr.type === "identify") {
    if (curr.target)
      points.push({ ...curr.target, color: curr.target.color || "#479ef5" });
    if (curr.refs) {
      for (const rp of curr.refs)
        points.push({
          ...rp,
          color: rp.color || "#ff9800",
          showCoords: true,
        });
    }
  } else if (curr.type === "area" && curr.shape) {
    for (const sp of curr.shape)
      points.push({
        ...sp,
        color: sp.color || "#479ef5",
        showCoords: true,
      });
    edges = [];
    for (let i = 0; i < curr.shape.length; i++) {
      edges.push([curr.shape[i], curr.shape[(i + 1) % curr.shape.length]]);
    }
  }

  drawGraph({
    showGrid: c.grid,
    showNumbers: c.nums,
    points,
    edges,
  });
}

// ══════════════════════════════════════════════════════════════
// Question Generation
// ══════════════════════════════════════════════════════════════

function makeCoordDistractors(cx: number, cy: number, count: number): string[] {
  const correct = `(${cx}, ${cy})`;
  const seen = new Set<string>([correct]);
  // filter() can widen tuple types to number[][]; assert back to tuple array
  const pool: [number, number][] = [
    [cy, cx],
    [-cx, cy],
    [cx, -cy],
    [-cx, -cy],
    [cx + 1, cy],
    [cx - 1, cy],
    [cx, cy + 1],
    [cx, cy - 1],
    [cx + 2, cy],
    [cx - 2, cy],
    [cx, cy + 2],
    [cx, cy - 2],
    [cx + 1, cy + 1],
    [cx - 1, cy - 1],
    [cx + 1, cy - 1],
    [cx - 1, cy + 1],
    [cx + 2, cy + 1],
    [cx - 2, cy - 1],
    [cx + 3, cy],
    [cx, cy + 3],
  ].filter(([x, y]) => Math.abs(x) <= RANGE && Math.abs(y) <= RANGE) as [
    number,
    number,
  ][];

  const result: string[] = [];
  for (const [x, y] of shuffle(pool)) {
    const s = `(${x}, ${y})`;
    if (!seen.has(s)) {
      result.push(s);
      seen.add(s);
    }
    if (result.length >= count) return result;
  }
  while (result.length < count) {
    const rx = randInt(-RANGE + 1, RANGE - 1);
    const ry = randInt(-RANGE + 1, RANGE - 1);
    const s = `(${rx}, ${ry})`;
    if (!seen.has(s)) {
      result.push(s);
      seen.add(s);
    }
  }
  return result;
}

function genIdentifyQ(numChoices: number, hell: boolean): Question {
  let tx = 0;
  let ty = 0;
  while (tx === 0 && ty === 0) {
    tx = randInt(-RANGE + 2, RANGE - 2);
    ty = randInt(-RANGE + 2, RANGE - 2);
  }

  const target: GraphPoint = { x: tx, y: ty, label: "P", color: "#479ef5" };
  const refs: GraphPoint[] = [];

  if (hell) {
    let ry1 = ty;
    while (Math.abs(ry1 - ty) < 2) ry1 = randInt(-RANGE + 1, RANGE - 1);
    refs.push({
      x: tx,
      y: ry1,
      label: "A",
      color: "#ff9800",
      showCoords: true,
    });
    let rx2 = tx;
    while (Math.abs(rx2 - tx) < 2) rx2 = randInt(-RANGE + 1, RANGE - 1);
    refs.push({
      x: rx2,
      y: ty,
      label: "B",
      color: "#ff9800",
      showCoords: true,
    });
  }

  const correctStr = `(${tx}, ${ty})`;
  const distractors = makeCoordDistractors(tx, ty, numChoices - 1);
  const all = shuffle([correctStr, ...distractors]);

  return {
    type: "identify",
    target,
    refs: refs.length > 0 ? refs : undefined,
    choices: all,
    correctIdx: all.indexOf(correctStr),
    prompt: "What are the coordinates of point P?",
  };
}

function genRectAreaQ(): Question {
  const rw = randInt(2, 5);
  const rh = randInt(2, 5);
  const x1 = randInt(-RANGE + 1, RANGE - rw - 1);
  const y1 = randInt(-RANGE + 1, RANGE - rh - 1);
  const area = rw * rh;
  const pts: GraphPoint[] = [
    { x: x1, y: y1, label: "A", color: "#479ef5", showCoords: true },
    { x: x1 + rw, y: y1, label: "B", color: "#479ef5", showCoords: true },
    {
      x: x1 + rw,
      y: y1 + rh,
      label: "C",
      color: "#479ef5",
      showCoords: true,
    },
    { x: x1, y: y1 + rh, label: "D", color: "#479ef5", showCoords: true },
  ];
  return buildAreaQ(area, pts, "Calculate the area of rectangle ABCD.");
}

function genTriAreaQ(): Question {
  let base = randInt(2, 6);
  const height = randInt(2, 6);
  if (base % 2 !== 0 && height % 2 !== 0) base += 1;
  const ax = randInt(-RANGE + 1, RANGE - base - 1);
  const ay = randInt(-RANGE + 1, RANGE - height - 1);
  if (
    ax + base > RANGE - 1 ||
    ay + height > RANGE - 1 ||
    ax < -RANGE + 1 ||
    ay < -RANGE + 1
  ) {
    return genRectAreaQ(); // fallback
  }
  const area = (base * height) / 2;
  const pts: GraphPoint[] = [
    { x: ax, y: ay, label: "A", color: "#479ef5", showCoords: true },
    { x: ax + base, y: ay, label: "B", color: "#479ef5", showCoords: true },
    {
      x: ax,
      y: ay + height,
      label: "C",
      color: "#479ef5",
      showCoords: true,
    },
  ];
  return buildAreaQ(area, pts, "Calculate the area of triangle ABC.");
}

function buildAreaQ(
  area: number,
  shapePoints: GraphPoint[],
  prompt: string,
): Question {
  const seen = new Set<number>([area]);
  const pool = [
    area + 1,
    area - 1,
    area + 2,
    area - 2,
    area * 2,
    Math.ceil(area / 2),
    area + 3,
    area - 3,
    area + 5,
    area + 4,
  ].filter((v) => v > 0);

  const dists: number[] = [];
  for (const c of shuffle(pool)) {
    if (!seen.has(c)) {
      dists.push(c);
      seen.add(c);
    }
    if (dists.length >= 4) break;
  }
  let fill = 6;
  while (dists.length < 4) {
    const v = area + fill;
    if (v > 0 && !seen.has(v)) {
      dists.push(v);
      seen.add(v);
    }
    fill++;
  }

  const correctStr = String(area);
  const all = shuffle([correctStr, ...dists.map(String)]);
  return {
    type: "area",
    shape: shapePoints,
    choices: all,
    correctIdx: all.indexOf(correctStr),
    prompt,
  };
}

function genFinalQ(idx: number): Question {
  if (idx % 2 === 0) {
    return idx % 4 === 0 ? genRectAreaQ() : genTriAreaQ();
  }
  return genIdentifyQ(5, true);
}

// ══════════════════════════════════════════════════════════════
// Timer Management
// ══════════════════════════════════════════════════════════════

function startCountdown(seconds: number) {
  stopCountdown();
  timeLeft.value = seconds;
  maxTime.value = seconds;
  countdownTimer = window.setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      stopCountdown();
      onTimeout();
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function startFinalClock() {
  stopFinalClock();
  finalStartMs.value = Date.now();
  finalElapsedDisplay.value = 0;
  finalClockTimer = window.setInterval(() => {
    finalElapsedDisplay.value = Math.round(
      (Date.now() - finalStartMs.value) / 1000,
    );
  }, 1000);
}

function stopFinalClock() {
  if (finalClockTimer !== null) {
    clearInterval(finalClockTimer);
    finalClockTimer = null;
  }
}

// ══════════════════════════════════════════════════════════════
// Game Flow
// ══════════════════════════════════════════════════════════════

function startGame() {
  score.value = 0;
  correctCount.value = 0;
  wrongCount.value = 0;
  currentMode.value = "simple";
  modeQIdx.value = 0;
  finalElapsedSec.value = 0;
  finalElapsedDisplay.value = 0;
  phase.value = "playing";
  loadNextQuestion();
}

function loadNextQuestion() {
  const c = cfg.value;

  if (modeQIdx.value >= c.questions) {
    const mi = MODES.indexOf(currentMode.value);
    if (mi < MODES.length - 1) {
      enterTransition(MODES[mi + 1]);
    } else {
      finishGame();
    }
    return;
  }

  selectedIdx.value = null;
  answerState.value = "idle";

  const m = currentMode.value;
  if (m === "final") {
    question.value = genFinalQ(modeQIdx.value);
  } else if (m === "hell") {
    question.value = genIdentifyQ(c.choices, true);
  } else {
    question.value = genIdentifyQ(c.choices, false);
  }

  nextTick(() => {
    requestAnimationFrame(() => {
      setupCanvas();
      renderQuestion();

      if (c.time > 0) {
        startCountdown(c.time);
      } else {
        timeLeft.value = 0;
        maxTime.value = 0;
        if (m === "final" && modeQIdx.value === 0) {
          startFinalClock();
        }
      }
    });
  });
}

function pickAnswer(idx: number) {
  if (answerState.value !== "idle") return;
  selectedIdx.value = idx;
  stopCountdown();

  const q = question.value;
  if (!q) return;

  if (idx === q.correctIdx) {
    answerState.value = "correct";
    correctCount.value++;
    score.value += POINTS_PER_MODE[currentMode.value];
  } else {
    answerState.value = "wrong";
    wrongCount.value++;
  }

  modeQIdx.value++;
  setTimeout(loadNextQuestion, 1400);
}

function onTimeout() {
  if (answerState.value !== "idle") return;
  answerState.value = "timeout";
  wrongCount.value++;
  modeQIdx.value++;
  setTimeout(loadNextQuestion, 1400);
}

function enterTransition(nextMode: Mode) {
  stopCountdown();
  const msg = TRANSITION_MSG[nextMode] || {
    title: "Get Ready!",
    sub: "Next challenge incoming!",
  };
  transTitle.value = msg.title;
  transSub.value = msg.sub;
  currentMode.value = nextMode;
  phase.value = "transition";
}

function continueFromTransition() {
  modeQIdx.value = 0;
  phase.value = "playing";
  loadNextQuestion();
}

function finishGame() {
  stopCountdown();
  stopFinalClock();
  if (finalStartMs.value > 0) {
    finalElapsedSec.value = Math.round(
      (Date.now() - finalStartMs.value) / 1000,
    );
    const timeBonus = Math.max(0, 300 - finalElapsedSec.value);
    score.value += timeBonus;
  }
  phase.value = "results";
}

function restartGame() {
  stopCountdown();
  stopFinalClock();
  phase.value = "start";
}

// ══════════════════════════════════════════════════════════════
// Keyboard & Resize
// ══════════════════════════════════════════════════════════════

function onKeydown(e: KeyboardEvent) {
  if (
    phase.value === "playing" &&
    answerState.value === "idle" &&
    question.value
  ) {
    const num = Number.parseInt(e.key, 10);
    if (num >= 1 && num <= question.value.choices.length) {
      pickAnswer(num - 1);
    }
  }
  if (phase.value === "transition" && (e.key === "Enter" || e.key === " ")) {
    continueFromTransition();
  }
}

function onResize() {
  if (phase.value === "playing") {
    setupCanvas();
    renderQuestion();
  }
}

// ══════════════════════════════════════════════════════════════
// Lifecycle
// ══════════════════════════════════════════════════════════════

onMounted(() => {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  stopCountdown();
  stopFinalClock();
  window.removeEventListener("resize", onResize);
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="cg">
    <!-- ═══ START SCREEN ═══ -->
    <div v-if="phase === 'start'" class="cg-start">
      <div class="cg-start__icon">📐</div>
      <h2 class="cg-start__title">Coordinate Challenge</h2>
      <p class="cg-start__desc">
        Test your coordinate geometry skills across 4 progressive levels.
        Identify points, use reference clues, and calculate areas!
      </p>
      <div class="cg-start__modes">
        <div class="cg-mode-pill cg-mode-pill--simple">
          <strong>Simple</strong>
          <span>Grid + Labels &middot; 20 s &middot; 3 choices</span>
        </div>
        <div class="cg-mode-pill cg-mode-pill--challenge">
          <strong>Challenge</strong>
          <span>No Grid &middot; 10 s &middot; 5 choices</span>
        </div>
        <div class="cg-mode-pill cg-mode-pill--hell">
          <strong>Hell</strong>
          <span>No Grid / Labels &middot; 10 s &middot; 7 choices</span>
        </div>
        <div class="cg-mode-pill cg-mode-pill--final">
          <strong>Final</strong>
          <span>Area + Identify &middot; Speed bonus</span>
        </div>
      </div>
      <fluent-button appearance="primary" @click="startGame"
        >Start Game</fluent-button
      >
    </div>

    <!-- ═══ PLAYING SCREEN ═══ -->
    <div v-else-if="phase === 'playing'" class="cg-game">
      <div class="cg-game__top">
        <!-- Graph Canvas Area -->
        <div class="cg-graph-wrap">
          <canvas ref="canvasRef" class="cg-canvas"></canvas>
        </div>

        <!-- Tips Panel -->
        <div class="cg-tips">
          <div class="cg-tips__header">
            <span class="cg-tips__icon">💡</span>
            <strong>Tips</strong>
          </div>
          <div class="cg-tips__content">
            <div v-if="currentMode === 'simple'" class="cg-tips__item">
              <p>Use the grid lines and number labels to help identify coordinates.</p>
              <p>Remember: (x, y) where x is horizontal and y is vertical.</p>
            </div>
            <div v-else-if="currentMode === 'challenge'" class="cg-tips__item">
              <p>Grid lines are removed! Count carefully from the axes.</p>
              <p>Use the tick marks to find exact positions.</p>
            </div>
            <div v-else-if="currentMode === 'hell'" class="cg-tips__item">
              <p>Use reference points A and B to deduce P's position.</p>
              <p>Look at shared coordinates to narrow down the answer.</p>
            </div>
            <div v-else-if="currentMode === 'final'" class="cg-tips__item">
              <p v-if="question?.type === 'area'">Calculate area using the coordinate formula.</p>
              <p v-else>Use reference points to find the target coordinates.</p>
              <p class="cg-tips__bonus">⚡ Speed bonus: finish faster for more points!</p>
            </div>
          </div>
        </div>

        <!-- Info Panel -->
        <div class="cg-info">
          <div class="cg-stats-card">
            <div class="cg-info__badge">
              <span
                class="cg-badge"
                :class="{
                  'cg-badge--simple': currentMode === 'simple',
                  'cg-badge--challenge': currentMode === 'challenge',
                  'cg-badge--hell': currentMode === 'hell',
                  'cg-badge--final': currentMode === 'final',
                }"
              >
                {{ modeLabel }}
              </span>
            </div>

            <div class="cg-stats-grid">
              <div class="cg-info__row">
                <small>Question</small>
                <strong>{{ questionLabel }}</strong>
              </div>
              <div class="cg-info__row">
                <small>Score</small>
                <strong class="cg-accent">{{ score }}</strong>
              </div>
              <div class="cg-info__row">
                <small>Correct</small>
                <strong class="cg-green">{{ correctCount }}</strong>
              </div>
              <div class="cg-info__row">
                <small>Wrong</small>
                <strong class="cg-red">{{ wrongCount }}</strong>
              </div>
            </div>

            <!-- Countdown Timer -->
            <div v-if="maxTime > 0" class="cg-timer">
              <div class="cg-timer__head">
                <small>Time</small>
                <strong
                  class="cg-timer__val"
                  :class="{
                    'cg-timer__val--warn': timeLeft <= 5 && timeLeft > 3,
                    'cg-timer__val--danger': timeLeft <= 3,
                  }"
                >
                  {{ timeLeft }}s
                </strong>
              </div>
              <div class="cg-timer__track">
                <div
                  class="cg-timer__fill"
                  :class="{
                    'cg-timer__fill--warn': timerPct <= 50 && timerPct > 25,
                    'cg-timer__fill--danger': timerPct <= 25,
                  }"
                  :style="{ width: timerPct + '%' }"
                ></div>
              </div>
            </div>

            <!-- Final Challenge Elapsed -->
            <div v-else-if="currentMode === 'final'" class="cg-info__row">
              <small>Elapsed</small>
              <strong>{{ finalElapsedDisplay }}s</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Prompt -->
      <div class="cg-prompt">{{ question?.prompt }}</div>

      <!-- Hint for Hell mode -->
      <div
        v-if="currentMode === 'hell' || (currentMode === 'final' && question?.type === 'identify')"
        class="cg-hint"
      >
        Use the reference points A and B to deduce P's coordinates.
      </div>

      <!-- Answer Choices -->
      <div class="cg-choices">
        <button
          v-for="(choice, i) in question?.choices"
          :key="i"
          class="cg-choice"
          :class="{
            'cg-choice--correct':
              answerState !== 'idle' && i === question?.correctIdx,
            'cg-choice--wrong': answerState === 'wrong' && i === selectedIdx,
            'cg-choice--timeout':
              answerState === 'timeout' && i === question?.correctIdx,
            'cg-choice--disabled': answerState !== 'idle',
          }"
          :disabled="answerState !== 'idle'"
          @click="pickAnswer(i)"
        >
          <span class="cg-choice__key">{{ i + 1 }}</span>
          <span class="cg-choice__label">{{ choice }}</span>
        </button>
      </div>

      <!-- Feedback -->
      <div v-if="answerState !== 'idle'" class="cg-feedback" aria-live="polite">
        <div
          v-if="answerState === 'correct'"
          class="cg-feedback__msg cg-feedback__msg--correct"
        >
          ✓ Correct! +{{ POINTS_PER_MODE[currentMode] }} pts
        </div>
        <div
          v-else-if="answerState === 'wrong'"
          class="cg-feedback__msg cg-feedback__msg--wrong"
        >
          ✗ Wrong! The answer was
          {{ question?.choices[question?.correctIdx] }}
        </div>
        <div
          v-else-if="answerState === 'timeout'"
          class="cg-feedback__msg cg-feedback__msg--timeout"
        >
          ⏱ Time's up! The answer was
          {{ question?.choices[question?.correctIdx] }}
        </div>
      </div>
    </div>

    <!-- ═══ TRANSITION SCREEN ═══ -->
    <div v-else-if="phase === 'transition'" class="cg-transition">
      <div class="cg-transition__card">
        <div class="cg-transition__emoji">🚀</div>
        <h2 class="cg-transition__title">{{ transTitle }}</h2>
        <p class="cg-transition__sub">{{ transSub }}</p>
        <fluent-button appearance="primary" @click="continueFromTransition"
          >Continue</fluent-button
        >
        <small class="cg-transition__hint"
          >or press Enter / Space</small
        >
      </div>
    </div>

    <!-- ═══ RESULTS SCREEN ═══ -->
    <div v-else-if="phase === 'results'" class="cg-results">
      <div class="cg-results__card">
        <div class="cg-results__trophy">🏆</div>
        <h2 class="cg-results__title">Game Complete!</h2>

        <div class="cg-results__grid">
          <div class="cg-stat">
            <small>Final Score</small>
            <strong class="cg-stat__val cg-stat__val--accent">{{
              score
            }}</strong>
          </div>
          <div class="cg-stat">
            <small>Correct</small>
            <strong class="cg-stat__val cg-stat__val--green">{{
              correctCount
            }}</strong>
          </div>
          <div class="cg-stat">
            <small>Wrong</small>
            <strong class="cg-stat__val cg-stat__val--red">{{
              wrongCount
            }}</strong>
          </div>
          <div class="cg-stat">
            <small>Accuracy</small>
            <strong class="cg-stat__val">
              {{
                correctCount + wrongCount > 0
                  ? Math.round(
                      (correctCount / (correctCount + wrongCount)) * 100,
                    )
                  : 0
              }}%
            </strong>
          </div>
          <div v-if="finalElapsedSec > 0" class="cg-stat">
            <small>Final Challenge Time</small>
            <strong class="cg-stat__val">{{ finalElapsedSec }}s</strong>
          </div>
          <div v-if="finalElapsedSec > 0" class="cg-stat">
            <small>Time Bonus</small>
            <strong class="cg-stat__val cg-stat__val--accent">
              +{{ Math.max(0, 300 - finalElapsedSec) }}
            </strong>
          </div>
        </div>

        <div class="cg-results__actions">
          <fluent-button appearance="primary" @click="startGame"
            >Play Again</fluent-button
          >
          <fluent-button appearance="outline" @click="restartGame"
            >Back to Start</fluent-button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   Coordinate Game — Scoped Styles
   ═══════════════════════════════════════════════════════════ */

.cg {
  position: relative;
  min-height: 480px;
}

/* ── Start Screen ──────────────────────────────────────── */

.cg-start {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 24px;
  text-align: center;
  animation: cgFadeInUp 400ms cubic-bezier(0, 0, 0, 1) both;
}

.cg-start__icon {
  font-size: 56px;
  margin-bottom: 8px;
}

.cg-start__title {
  margin: 0 0 16px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--colorNeutralForeground1);
}

.cg-start__desc {
  margin: 0 0 12px;
  max-width: 540px;
  color: var(--colorNeutralForeground2, #d6d6d6);
  font-size: 15px;
  line-height: 1.7;
  font-weight: 400;
}

.cg-start__modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  justify-content: center;
  max-width: 540px;
  margin: 8px 0 16px;
  width: 100%;
}

.cg-mode-pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 12px;
  border: 1px solid var(--colorNeutralStroke2, #333);
  background: var(--colorNeutralBackground3, #282828);
  text-align: center;
  cursor: pointer;
  transition: all 150ms ease;
}

.cg-mode-pill:hover {
  background: var(--colorNeutralBackground4, #333);
  border-color: var(--colorNeutralStroke1, #404040);
  transform: translateY(-1px);
}

.cg-mode-pill strong {
  font-size: 13px;
}

.cg-mode-pill span {
  color: var(--colorNeutralForeground3, #adadad);
  font-size: 11px;
}

.cg-mode-pill--simple strong {
  color: var(--colorBrandForeground1, #479ef5);
}
.cg-mode-pill--challenge strong {
  color: #f59e0b;
}
.cg-mode-pill--hell strong {
  color: #ef4444;
}
.cg-mode-pill--final strong {
  color: #a855f7;
}

/* ── Game Screen ───────────────────────────────────────── */

.cg-game {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: cgFadeIn 250ms ease both;
}

.cg-game__top {
  display: grid;
  grid-template-columns: 1fr auto 220px;
  gap: 16px;
  align-items: start;
}

/* Graph */
.cg-graph-wrap {
  background: var(--colorNeutralBackground1, #1b1b1b);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  max-height: 440px;
  min-width: 220px;
  min-height: 220px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cg-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* Tips Panel */
.cg-tips {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--colorNeutralBackground2, #202020);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  max-width: 280px;
}

.cg-tips__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--colorNeutralStroke2, #333);
  color: var(--colorNeutralForeground1, #fff);
}

.cg-tips__icon {
  font-size: 20px;
}

.cg-tips__header strong {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cg-tips__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cg-tips__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cg-tips__item p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--colorNeutralForeground2, #d6d6d6);
}

.cg-tips__bonus {
  padding: 8px;
  background: rgba(168, 85, 247, 0.1);
  border-radius: 6px;
  color: #a855f7 !important;
  font-weight: 500;
}

/* Info Panel */
.cg-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cg-stats-card {
  padding: 16px;
  background: var(--colorNeutralBackground2, #202020);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cg-stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.cg-info__badge {
  margin-bottom: 2px;
}

.cg-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cg-badge--simple {
  background: rgba(71, 158, 245, 0.15);
  color: #479ef5;
}
.cg-badge--challenge {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.cg-badge--hell {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.cg-badge--final {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.cg-info__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--colorNeutralBackground4, #333);
  border-radius: 6px;
  gap: 4px;
}

.cg-info__row small {
  color: var(--colorNeutralForeground4, #8a8a8a);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.cg-info__row strong {
  font-size: 15px;
  font-weight: 700;
}

.cg-accent {
  color: var(--colorBrandForeground1, #479ef5);
}
.cg-green {
  color: #4caf50;
}
.cg-red {
  color: #ef5350;
}

/* Timer */
.cg-timer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--colorNeutralBackground4, #333);
  border-radius: 6px;
}

.cg-timer__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cg-timer__head small {
  color: var(--colorNeutralForeground3, #adadad);
  font-size: 12px;
}

.cg-timer__val {
  font-size: 20px;
  font-weight: 700;
  color: #4caf50;
  transition: color 200ms ease;
}

.cg-timer__val--warn {
  color: #ff9800;
}
.cg-timer__val--danger {
  color: #f44336;
  animation: cgPulse 500ms ease infinite;
}

.cg-timer__track {
  height: 6px;
  border-radius: 3px;
  background: var(--colorNeutralBackground4, #333);
  overflow: hidden;
}

.cg-timer__fill {
  height: 100%;
  border-radius: 3px;
  background: #4caf50;
  transition: width 1s linear, background 300ms ease;
}

.cg-timer__fill--warn {
  background: #ff9800;
}
.cg-timer__fill--danger {
  background: #f44336;
}

/* Prompt */
.cg-prompt {
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  padding: 8px 0;
  color: var(--colorNeutralForeground1, #fff);
}

/* Hint */
.cg-hint {
  font-size: 12px;
  color: var(--colorNeutralForeground3, #adadad);
  text-align: center;
  font-style: italic;
}

/* ── Answer Choices ────────────────────────────────────── */

.cg-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.cg-choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--colorNeutralStroke1, #404040);
  background: var(--colorNeutralBackground3, #282828);
  color: var(--colorNeutralForeground1, #fff);
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 120ms ease,
    border-color 120ms ease,
    transform 80ms ease,
    box-shadow 120ms ease;
  min-width: 110px;
  justify-content: center;
}

.cg-choice:hover:not(:disabled) {
  background: var(--colorNeutralBackground4, #333);
  border-color: var(--colorBrandStroke1, #479ef5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(71, 158, 245, 0.15);
}

.cg-choice:active:not(:disabled) {
  transform: translateY(0);
}

.cg-choice__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--colorNeutralBackground4, #333);
  font-size: 11px;
  font-weight: 600;
  color: var(--colorNeutralForeground3, #adadad);
  flex-shrink: 0;
}

.cg-choice__label {
  font-variant-numeric: tabular-nums;
}

/* States */
.cg-choice--correct {
  background: rgba(76, 175, 80, 0.2) !important;
  border-color: #4caf50 !important;
  color: #81c784 !important;
  animation: cgCorrectPop 300ms ease;
}

.cg-choice--wrong {
  background: rgba(244, 67, 54, 0.2) !important;
  border-color: #f44336 !important;
  color: #ef9a9a !important;
  animation: cgShake 300ms ease;
}

.cg-choice--timeout {
  background: rgba(76, 175, 80, 0.15) !important;
  border-color: #4caf50 !important;
}

.cg-choice--disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

.cg-choice--correct.cg-choice--disabled,
.cg-choice--wrong.cg-choice--disabled,
.cg-choice--timeout.cg-choice--disabled {
  opacity: 1;
}

/* ── Feedback ──────────────────────────────────────────── */

.cg-feedback {
  text-align: center;
  margin-top: 4px;
}

.cg-feedback__msg {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  animation: cgFadeIn 200ms ease;
}

.cg-feedback__msg--correct {
  background: rgba(76, 175, 80, 0.12);
  color: #81c784;
}

.cg-feedback__msg--wrong {
  background: rgba(244, 67, 54, 0.12);
  color: #ef9a9a;
}

.cg-feedback__msg--timeout {
  background: rgba(255, 152, 0, 0.12);
  color: #ffcc80;
}

/* ── Transition Screen ─────────────────────────────────── */

.cg-transition {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  animation: cgFadeIn 300ms ease both;
}

.cg-transition__card {
  text-align: center;
  padding: 48px 32px;
  background: var(--colorNeutralBackground3, #282828);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 16px;
  box-shadow: var(--shadow16, 0 0 2px rgba(0, 0, 0, 0.24), 0 8px 16px rgba(0, 0, 0, 0.28));
  max-width: 480px;
  animation: cgScaleIn 400ms cubic-bezier(0, 0, 0, 1) both;
}

.cg-transition__emoji {
  font-size: 56px;
  margin-bottom: 12px;
}

.cg-transition__title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  display: inline-block;
  background: linear-gradient(135deg, #479ef5, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cg-transition__sub {
  margin: 0 0 24px;
  color: var(--colorNeutralForeground3, #adadad);
  font-size: 15px;
  line-height: 1.5;
}

.cg-transition__hint {
  display: block;
  margin-top: 12px;
  color: var(--colorNeutralForeground4, #8a8a8a);
  font-size: 12px;
}

/* ── Results Screen ────────────────────────────────────── */

.cg-results {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  animation: cgFadeIn 300ms ease both;
}

.cg-results__card {
  text-align: center;
  padding: 40px 32px;
  background: var(--colorNeutralBackground3, #282828);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 16px;
  box-shadow: var(--shadow16, 0 0 2px rgba(0, 0, 0, 0.24), 0 8px 16px rgba(0, 0, 0, 0.28));
  max-width: 500px;
  width: 100%;
  animation: cgScaleIn 400ms cubic-bezier(0, 0, 0, 1) both;
}

.cg-results__trophy {
  font-size: 56px;
  margin-bottom: 8px;
}

.cg-results__title {
  margin: 0 0 20px;
  font-size: 28px;
  font-weight: 700;
}

.cg-results__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.cg-stat {
  padding: 14px;
  background: var(--colorNeutralBackground4, #333);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 10px;
  text-align: center;
  transition: background 100ms ease;
}

.cg-stat:hover {
  background: rgba(255, 255, 255, 0.06);
}

.cg-stat small {
  display: block;
  color: var(--colorNeutralForeground3, #adadad);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.cg-stat__val {
  font-size: 24px;
  font-weight: 700;
  display: block;
}

.cg-stat__val--accent {
  color: var(--colorBrandForeground1, #479ef5);
}
.cg-stat__val--green {
  color: #4caf50;
}
.cg-stat__val--red {
  color: #ef5350;
}

.cg-results__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Responsive ────────────────────────────────────────── */

@media (max-width: 1024px) {
  .cg-game__top {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .cg-tips {
    max-width: 100%;
    min-width: auto;
  }
}

@media (max-width: 720px) {
  .cg-game__top {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .cg-graph-wrap {
    max-height: 320px;
    aspect-ratio: 1 / 1;
  }
  .cg-tips {
    max-width: 100%;
    min-width: auto;
  }
  .cg-info {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    align-items: stretch;
  }
  .cg-info__badge {
    margin-bottom: 0;
  }
  .cg-info__row {
    padding: 8px;
    flex-direction: row;
    text-align: left;
    gap: 4px;
  }
  .cg-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .cg-timer {
    width: 100%;
    padding: 8px;
  }
  .cg-choice {
    min-width: 90px;
    padding: 8px 14px;
    font-size: 14px;
  }
  .cg-start {
    padding: 24px 16px;
  }
  .cg-start__modes {
    grid-template-columns: 1fr;
    max-width: 280px;
    width: 100%;
  }
  .cg-transition__card,
  .cg-results__card {
    margin: 0 8px;
    padding: 32px 20px;
  }
  .cg-results__grid {
    grid-template-columns: 1fr;
  }
}

/* ── Animations ────────────────────────────────────────── */

@keyframes cgFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cgFadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cgScaleIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes cgPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes cgCorrectPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes cgShake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-4px);
  }
  40% {
    transform: translateX(4px);
  }
  60% {
    transform: translateX(-3px);
  }
  80% {
    transform: translateX(3px);
  }
}
</style>
