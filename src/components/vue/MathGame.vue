<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const STORAGE_KEY = "percentGameData_v3";
const TARGET_SCORE = 150;
const POINTS_CORRECT = 10;
const POINTS_WRONG = 10;

type Problem = {
  old: number | string;
  new: number | string;
  percent: number;
  isIncrease: boolean;
  type: number;
  answer: number;
  display: {
    old: number | string;
    mid: string;
    new: number | string;
    mode: string;
  };
};

const canvasRef = ref<HTMLCanvasElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const score = ref(0);
const correctCount = ref(0);
const wrongCount = ref(0);
const currProblem = ref<Problem | null>(null);
const hasCelebrated = ref(false);
const showReportModal = ref(false);
const feedback = ref("");
const resetClicks = ref(0);

const progressPercent = computed(() =>
  Math.max(0, Math.min(100, (score.value / TARGET_SCORE) * 100)),
);
const totalCount = computed(() => correctCount.value + wrongCount.value);
const accuracy = computed(() =>
  totalCount.value > 0
    ? `${Math.round((correctCount.value / totalCount.value) * 100)}%`
    : "0%",
);

/* ── Canvas helpers ──────────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setupCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fitFontSizeToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
) {
  let size = Math.floor(maxSize);
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px system-ui`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return minSize;
}

function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: string,
  fontSize: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  ctx.font = `${weight} ${fontSize}px system-ui`;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderTextFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  _maxHeight: number,
  weight: string,
  maxSize: number,
  minSize: number,
) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fitSize = fitFontSizeToWidth(
    ctx,
    text,
    weight,
    maxWidth,
    maxSize,
    minSize,
  );
  ctx.font = `${weight} ${fitSize}px system-ui`;
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }
  const wrapFont = Math.max(minSize, Math.min(maxSize, Math.round(maxSize)));
  const lines = wrapTextToLines(ctx, text, maxWidth, weight, wrapFont);
  if (lines.length === 0) {
    ctx.restore();
    return;
  }
  if (lines.length > 3) {
    let t = text;
    while (ctx.measureText(`${t}...`).width > maxWidth && t.length > 0)
      t = t.slice(0, -1);
    ctx.font = `${weight} ${minSize}px system-ui`;
    ctx.fillText(`${t}...`, x, y);
    ctx.restore();
    return;
  }
  const lineHeight = Math.round(wrapFont * 1.05);
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;
  ctx.font = `${weight} ${wrapFont}px system-ui`;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
  ctx.restore();
}

type Colors = {
  boxBg: string;
  strokeColor: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
};

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  colors: Colors,
) {
  const left = x - w / 2;
  const top = y - h / 2;
  ctx.save();
  roundRect(ctx, left, top, w, h, 10);
  ctx.fillStyle = colors.boxBg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.strokeColor;
  ctx.stroke();
  ctx.font = `600 ${Math.max(12, Math.round(w / 6))}px system-ui`;
  ctx.fillStyle = colors.textSecondary;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, top - 8);
  ctx.font = `700 ${Math.max(18, Math.round(w / 3))}px system-ui`;
  ctx.fillStyle = value === "?" ? colors.accent : colors.textPrimary;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
  ctx.restore();
}

function drawMidBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  colors: Colors,
) {
  const left = x - w / 2;
  const top = y - h / 2;
  ctx.save();
  roundRect(ctx, left, top, w, h, 10);
  ctx.fillStyle = colors.boxBg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.strokeColor;
  ctx.stroke();
  ctx.font = `600 ${Math.max(12, Math.round(w / 8))}px system-ui`;
  ctx.fillStyle = colors.textSecondary;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, top - 8);
  ctx.fillStyle = value.includes("?") ? colors.accent : colors.textPrimary;
  ctx.textBaseline = "middle";
  const maxFontSize = Math.max(16, Math.round(w / 5));
  renderTextFit(
    ctx,
    value,
    x,
    y,
    Math.max(10, w - 12),
    h,
    "700",
    maxFontSize,
    10,
  );
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colors: Colors,
) {
  const headLength = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = colors.strokeColor;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = colors.strokeColor;
  ctx.fill();
  ctx.restore();
}

function drawProblem(p: Problem) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rs = getComputedStyle(document.documentElement);
  const canvasBg = (
    rs.getPropertyValue("--colorNeutralBackground2") || "#1b1b1b"
  ).trim();
  const boxBg = (
    rs.getPropertyValue("--colorNeutralBackground4") || "#2f2f2f"
  ).trim();
  const textPrimary = (
    rs.getPropertyValue("--colorNeutralForeground1") || "#ffffff"
  ).trim();
  const textSecondary = (
    rs.getPropertyValue("--colorNeutralForeground3") || "#a1a1a1"
  ).trim();
  const strokeColor = (
    rs.getPropertyValue("--colorNeutralStroke1") || "#333333"
  ).trim();
  const accent = (
    rs.getPropertyValue("--colorBrandBackground") || "#0078d4"
  ).trim();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const dW = canvas.clientWidth;
  const dH = canvas.clientHeight;
  const centerY = dH / 2 + 15;
  const boxW = dW <= 375 ? 60 : dW <= 768 ? 70 : 100;
  const midBoxW = dW <= 375 ? 90 : dW <= 768 ? 110 : 140;
  const arrowLen = dW <= 375 ? 20 : dW <= 768 ? 30 : 50;
  const boxH = 60;
  const centerX = dW / 2;
  const midX = centerX;
  const oldX = centerX - midBoxW / 2 - arrowLen - boxW / 2 - 15;
  const newX = centerX + midBoxW / 2 + arrowLen + boxW / 2 + 15;

  const colors: Colors = {
    boxBg,
    strokeColor,
    textPrimary,
    textSecondary,
    accent,
  };

  drawBox(ctx, oldX, centerY, boxW, boxH, "Old", String(p.display.old), colors);
  drawBox(ctx, newX, centerY, boxW, boxH, "New", String(p.display.new), colors);
  drawMidBox(
    ctx,
    midX,
    centerY,
    midBoxW,
    boxH,
    "% Change",
    String(p.display.mid),
    colors,
  );
  drawArrow(
    ctx,
    oldX + boxW / 2 + 5,
    centerY,
    midX - midBoxW / 2 - 5,
    centerY,
    colors,
  );
  drawArrow(
    ctx,
    midX + midBoxW / 2 + 5,
    centerY,
    newX - boxW / 2 - 5,
    centerY,
    colors,
  );
}

/* ── Persistence ───────────────────────────────────────────── */

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      score: score.value,
      correctCount: correctCount.value,
      wrongCount: wrongCount.value,
      currProblem: currProblem.value,
      hasCelebrated: hasCelebrated.value,
    }),
  );
}

function loadState(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw);
    score.value = obj.score || 0;
    correctCount.value = obj.correctCount || 0;
    wrongCount.value = obj.wrongCount || 0;
    hasCelebrated.value = !!obj.hasCelebrated;
    if (obj.currProblem) currProblem.value = obj.currProblem;
    return true;
  } catch {
    return false;
  }
}

/* ── Game logic ────────────────────────────────────────────── */

function generateQuestion() {
  const type = Math.floor(Math.random() * 3);
  const oldVal = (Math.floor(Math.random() * 10) + 2) * 10;
  const percent = (Math.floor(Math.random() * 5) + 1) * 10;
  const isIncrease = Math.random() > 0.5;
  const factor = isIncrease ? 1 + percent / 100 : 1 - percent / 100;
  const newVal = Math.round(oldVal * factor);
  const sign = isIncrease ? "+" : "-";
  const factorText = `( 1 ${sign} ${percent}% )`;

  const problem: Problem = {
    old: 0,
    new: 0,
    percent,
    isIncrease,
    type,
    answer: 0,
    display: { old: "", mid: "", new: "", mode: "" },
  };

  if (type === 0) {
    problem.answer = newVal;
    problem.display = {
      old: oldVal,
      mid: factorText,
      new: "?",
      mode: "findNew",
    };
  } else if (type === 1) {
    problem.answer = oldVal;
    problem.display = {
      old: "?",
      mid: factorText,
      new: newVal,
      mode: "findOld",
    };
  } else {
    problem.answer = isIncrease ? percent : -percent;
    problem.display = {
      old: oldVal,
      mid: "( 1 + ? % )",
      new: newVal,
      mode: "findPercent",
    };
  }

  currProblem.value = problem;
  nextTick(() => {
    if (inputRef.value) inputRef.value.value = "";
    feedback.value = "";
    inputRef.value?.focus();
  });
}

function checkAnswer() {
  const val = inputRef.value?.value || "";
  const userAnswer = Number.parseFloat(val);
  if (Number.isNaN(userAnswer) || !currProblem.value) {
    feedback.value = "請輸入數字";
    return;
  }
  if (Math.abs(userAnswer - currProblem.value.answer) < 0.01) {
    score.value += POINTS_CORRECT;
    correctCount.value += 1;
    feedback.value = "正確! +10分";
  } else {
    score.value -= POINTS_WRONG;
    wrongCount.value += 1;
    feedback.value = `錯誤! 正確答案: ${currProblem.value.answer}`;
  }
  setTimeout(generateQuestion, 1000);
}

function showAnswer() {
  if (!currProblem.value) return;
  feedback.value = `正確答案: ${currProblem.value.answer}`;
}

function handleReset() {
  resetClicks.value += 1;
  if (resetClicks.value === 1) {
    feedback.value = "再次點擊確認重置";
    setTimeout(() => {
      resetClicks.value = 0;
    }, 3000);
  } else if (resetClicks.value >= 2) {
    localStorage.removeItem(STORAGE_KEY);
    score.value = 0;
    correctCount.value = 0;
    wrongCount.value = 0;
    currProblem.value = null;
    hasCelebrated.value = false;
    feedback.value = "已重置進度!";
    resetClicks.value = 0;
    setTimeout(generateQuestion, 500);
  }
}

function handleInputKey(e: KeyboardEvent) {
  if (e.key === "Enter") checkAnswer();
}

/* ── Watchers ──────────────────────────────────────────────── */

watch([score, correctCount, wrongCount, currProblem, hasCelebrated], () => {
  saveState();
  if (score.value >= TARGET_SCORE && !hasCelebrated.value) {
    hasCelebrated.value = true;
  }
  if (currProblem.value) drawProblem(currProblem.value);
});

/* ── Lifecycle ─────────────────────────────────────────────── */

function handleResize() {
  setupCanvas();
  if (currProblem.value) drawProblem(currProblem.value);
}

onMounted(() => {
  setupCanvas();
  const loaded = loadState();
  if (!loaded) generateQuestion();
  // redraw after load
  nextTick(() => {
    if (currProblem.value) drawProblem(currProblem.value);
  });
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div>
    <h2>百分比變化練習</h2>

    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-item goal-text">目標: {{ TARGET_SCORE }}</div>
      <div class="status-item">分數: <span class="score-text">{{ score }}</span></div>
      <div class="status-item">正確: <span>{{ correctCount }}</span></div>
    </div>

    <!-- Progress -->
    <div class="progress-container">
      <div
        class="progress-bar"
        role="progressbar"
        aria-label="進度"
        :style="{ width: progressPercent + '%' }"
        :aria-valuenow="score"
        :aria-valuemin="0"
        :aria-valuemax="TARGET_SCORE"
      ></div>
    </div>

    <!-- Canvas Area -->
    <div class="canvas-container">
      <canvas ref="canvasRef" class="game-canvas" width="850" height="250"></canvas>

      <div class="input-group">
        <label class="question-label" for="userAnswer">答案:</label>
        <input
          id="userAnswer"
          ref="inputRef"
          type="number"
          class="input-small"
          aria-label="答案"
          @keydown="handleInputKey"
        />
        <fluent-button appearance="primary" @click="checkAnswer">提交</fluent-button>
        <fluent-button appearance="outline" @click="showAnswer">顯示答案</fluent-button>
      </div>

      <div class="feedback-area" aria-live="polite">{{ feedback }}</div>
    </div>

    <!-- Buttons -->
    <div class="button-container">
      <fluent-button appearance="primary" @click="showReportModal = true">📊 成績單</fluent-button>
      <fluent-button appearance="outline" @click="handleReset">⚠️ 重置所有進度</fluent-button>
    </div>

    <!-- Report Modal (using fluent-dialog) -->
    <fluent-dialog
      :open="showReportModal || undefined"
      @close="showReportModal = false"
      modal-type="modal"
    >
      <div slot="title">成績單</div>
      <div class="stats-grid">
        <div class="stat-box">
          <small>最終分數</small>
          <strong class="value value--accent">{{ score }}</strong>
        </div>
        <div class="stat-box">
          <small>總題數</small>
          <strong class="value">{{ totalCount }}</strong>
        </div>
        <div class="stat-box">
          <small>正確題數</small>
          <strong class="value value--green">{{ correctCount }}</strong>
        </div>
        <div class="stat-box">
          <small>正確率</small>
          <strong class="value">{{ accuracy }}</strong>
        </div>
      </div>
      <p class="stat-time">{{ new Date().toLocaleString() }}</p>
      <fluent-button
        slot="action"
        appearance="primary"
        @click="showReportModal = false"
      >繼續練習</fluent-button>
    </fluent-dialog>
  </div>
</template>

<style scoped>
/* ── Status Bar ─────────────────────────────────────────── */
.status-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
  animation: slideDown 300ms cubic-bezier(0, 0, 0, 1) both;
}
.status-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--colorNeutralBackground2, #1b1b1b);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 8px;
  font-size: 13px;
  color: var(--colorNeutralForeground2, #d6d6d6);
  transition: background 100ms ease, border-color 100ms ease;
}
.status-item:hover {
  background: var(--colorNeutralBackground3, #282828);
  border-color: var(--colorNeutralStroke1, #404040);
}
.goal-text {
  background: var(--colorNeutralBackground3, #282828);
  font-weight: 600;
  border-color: var(--colorNeutralStroke1, #404040);
}
.score-text {
  color: var(--colorBrandForeground1, #479ef5);
  font-weight: 700;
  font-size: 15px;
}

/* ── Progress ───────────────────────────────────────────── */
.progress-container {
  margin-bottom: 20px;
  height: 6px;
  border-radius: 4px;
  background: var(--colorNeutralBackground4, #333);
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--colorBrandBackground, #0078d4), var(--colorBrandForeground1, #479ef5));
  transition: width 400ms cubic-bezier(0.33, 1, 0.68, 1);
  position: relative;
}
.progress-bar::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2s ease infinite;
}

/* ── Canvas Area ────────────────────────────────────────── */
.canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--colorNeutralBackground2, #1b1b1b);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  animation: fadeInScale 300ms cubic-bezier(0, 0, 0, 1) both;
  animation-delay: 100ms;
}
.game-canvas {
  border-radius: 6px;
  max-width: 100%;
}

/* ── Input Group ────────────────────────────────────────── */
.input-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}
.question-label {
  font-weight: 600;
  font-size: 16px;
  color: var(--colorNeutralForeground1, #fff);
}
.input-small {
  width: 140px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  padding: 6px 12px;
  background: var(--colorNeutralBackground4, #333);
  border: none;
  border-bottom: 3px solid var(--colorNeutralStroke1, #404040);
  border-radius: 4px 4px 0 0;
  color: var(--colorNeutralForeground1, #fff);
  font-family: inherit;
  appearance: textfield;
  -moz-appearance: textfield;
}
.input-small::-webkit-inner-spin-button,
.input-small::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.input-small:focus {
  outline: none;
  border-bottom-color: var(--colorBrandForeground1, #479ef5);
  box-shadow: 0 2px 0 0 var(--colorBrandForeground1, #479ef5), 0 4px 12px rgba(71,158,245,0.2);
}

/* ── Feedback ───────────────────────────────────────────── */
.feedback-area {
  min-height: 24px;
  margin-top: 8px;
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground2, #d6d6d6);
  text-align: center;
  border-radius: 6px;
}

/* ── Buttons ────────────────────────────────────────────── */
.button-container {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

/* ── Report Modal ───────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 16px 0;
}
.stat-box {
  background: var(--colorNeutralBackground3, #282828);
  border: 1px solid var(--colorNeutralStroke2, #333);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: background 100ms ease, box-shadow 100ms ease;
}
.stat-box:hover {
  background: var(--colorNeutralBackground4, #333);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.stat-box small {
  display: block;
  color: var(--colorNeutralForeground3, #adadad);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.stat-box .value {
  font-size: 24px;
  font-weight: 700;
  display: block;
}
.stat-box .value--accent {
  color: var(--colorBrandForeground1, #479ef5);
}
.stat-box .value--green {
  color: #6ccb5f;
}
.stat-time {
  font-size: 12px;
  color: var(--colorNeutralForeground4, #707070);
  margin-top: 8px;
  text-align: center;
}

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 720px) {
  .canvas-container { padding: 16px; }
  .input-small { width: 100px; font-size: 16px; }
  .status-bar { justify-content: center; }
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
