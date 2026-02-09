import React, { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'percentGameData_v3'
const TARGET_SCORE = 150
const POINTS_CORRECT = 10
const POINTS_WRONG = 10

type Problem = {
  old: number | string
  new: number | string
  percent: number
  isIncrease: boolean
  type: number
  answer: number
  display: { old: any; mid: string; new: any; mode: string }
}

export default function MathGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const currProblemRef = useRef<Problem | null>(null)

  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [currProblem, setCurrProblem] = useState<Problem | null>(null)
  const [hasCelebrated, setHasCelebrated] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [resetClicks, setResetClicks] = useState(0)

  // canvas drawing helpers
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const left = x
    const top = y
    ctx.beginPath()
    ctx.moveTo(left + r, top)
    ctx.arcTo(left + w, top, left + w, top + h, r)
    ctx.arcTo(left + w, top + h, left, top + h, r)
    ctx.arcTo(left, top + h, left, top, r)
    ctx.arcTo(left, top, left + w, top, r)
    ctx.closePath()
  }

  function setupCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    // set backing store for crisp rendering
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function saveState() {
    const data = { score, correctCount, wrongCount, currProblem, hasCelebrated }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    try {
      const obj = JSON.parse(raw)
      setScore(obj.score || 0)
      setCorrectCount(obj.correctCount || 0)
      setWrongCount(obj.wrongCount || 0)
      setHasCelebrated(!!obj.hasCelebrated)
      if (obj.currProblem) setCurrProblem(obj.currProblem)
      return true
    } catch (e) {
      return false
    }
  }

  useEffect(() => {
    setupCanvas()
    const loaded = loadState()
    if (!loaded) generateQuestion()
    const handleResize = () => {
      setupCanvas()
      // redraw latest problem after resizing to avoid blank canvas
      if (currProblemRef.current) drawProblem(currProblemRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    saveState()
    // keep a ref of the latest problem so resize handler can redraw reliably
    currProblemRef.current = currProblem
    updateUI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, correctCount, wrongCount, currProblem, hasCelebrated])

  function updateUI() {
    if (score >= TARGET_SCORE && !hasCelebrated) setHasCelebrated(true)
    // draw current problem
    if (currProblem) drawProblem(currProblem)
  }

  function generateQuestion() {
    const type = Math.floor(Math.random() * 3)
    let oldVal = (Math.floor(Math.random() * 10) + 2) * 10
    let percent = (Math.floor(Math.random() * 5) + 1) * 10
    let isIncrease = Math.random() > 0.5
    let factor = isIncrease ? 1 + percent / 100 : 1 - percent / 100
    let newVal = Math.round(oldVal * factor)
    const sign = isIncrease ? '+' : '-'
    const factorText = `( 1 ${sign} ${percent}% )`
    const problem: Problem = {
      old: 0 as any,
      new: 0 as any,
      percent,
      isIncrease,
      type,
      answer: 0,
      display: { old: '', mid: '', new: '', mode: '' }
    }
    if (type === 0) {
      problem.answer = newVal
      problem.display = { old: oldVal, mid: factorText, new: '?', mode: 'findNew' }
    } else if (type === 1) {
      problem.answer = oldVal
      problem.display = { old: '?', mid: factorText, new: newVal, mode: 'findOld' }
    } else {
      problem.answer = isIncrease ? percent : -percent
      problem.display = { old: oldVal, mid: '( 1 + ? % )', new: newVal, mode: 'findPercent' }
    }
    setCurrProblem(problem)
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = ''
      setFeedback('')
      if (inputRef.current) inputRef.current.focus()
    }, 0)
  }

  function drawProblem(p: Problem) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    // read theme tokens from CSS variables so canvas follows Fluent theme
    const rootStyles = getComputedStyle(document.documentElement)
    const canvasBg = (rootStyles.getPropertyValue('--colorNeutralBackground2') || '#1b1b1b').trim()
    const boxBg = (rootStyles.getPropertyValue('--colorNeutralBackground4') || '#2f2f2f').trim()
    const textPrimary = (rootStyles.getPropertyValue('--colorNeutralForeground1') || '#ffffff').trim()
    const textSecondary = (rootStyles.getPropertyValue('--colorNeutralForeground3') || '#a1a1a1').trim()
    const strokeColor = (rootStyles.getPropertyValue('--colorNeutralStroke1') || '#333333').trim()
    const accent = (rootStyles.getPropertyValue('--colorBrandBackground') || '#0078d4').trim()

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // background according to theme
    ctx.fillStyle = canvasBg
    // fill using device-independent size (ctx is already scaled)
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)

    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight
    const centerY = displayHeight / 2 + 15
    let boxW = displayWidth <= 375 ? 60 : displayWidth <= 768 ? 70 : 100
    let midBoxW = displayWidth <= 375 ? 90 : displayWidth <= 768 ? 110 : 140
    let arrowLen = displayWidth <= 375 ? 20 : displayWidth <= 768 ? 30 : 50
    const boxH = 60
    const centerX = displayWidth / 2
    const midX = centerX
    const oldX = centerX - midBoxW / 2 - arrowLen - boxW / 2 - 15
    const newX = centerX + midBoxW / 2 + arrowLen + boxW / 2 + 15

    const colors = { boxBg, strokeColor, textPrimary, textSecondary, accent }

    drawBox(ctx, oldX, centerY, boxW, boxH, 'Old', String(p.display.old), colors)
    drawBox(ctx, newX, centerY, boxW, boxH, 'New', String(p.display.new), colors)
    drawMidBox(ctx, midX, centerY, midBoxW, boxH, '% Change', String(p.display.mid), colors)
    drawArrow(ctx, oldX + boxW / 2 + 5, centerY, midX - midBoxW / 2 - 5, centerY, colors)
    drawArrow(ctx, midX + midBoxW / 2 + 5, centerY, newX - boxW / 2 - 5, centerY, colors)
  }

  // text fitting helpers for canvas: fit font size or wrap into lines to avoid overflow
  function fitFontSizeToWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    weight: string,
    maxWidth: number,
    maxSize: number,
    minSize: number
  ) {
    let size = Math.floor(maxSize)
    while (size >= minSize) {
      ctx.font = `${weight} ${size}px system-ui`
      if (ctx.measureText(text).width <= maxWidth) return size
      size -= 1
    }
    return minSize
  }

  function wrapTextToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: string, fontSize: number) {
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    ctx.font = `${weight} ${fontSize}px system-ui`
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width <= maxWidth) {
        line = test
      } else {
        if (line) lines.push(line)
        line = w
      }
    }
    if (line) lines.push(line)
    return lines
  }

  function renderTextFit(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    weight: string,
    maxSize: number,
    minSize: number
  ) {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // try single-line by reducing font size
    const fitSize = fitFontSizeToWidth(ctx, text, weight, maxWidth, maxSize, minSize)
    ctx.font = `${weight} ${fitSize}px system-ui`
    const measured = ctx.measureText(text).width
    if (measured <= maxWidth) {
      ctx.fillText(text, x, y)
      ctx.restore()
      return
    }

    // fallback to wrapping into multiple lines
    const wrapFont = Math.max(minSize, Math.min(maxSize, Math.round(maxSize)))
    const lines = wrapTextToLines(ctx, text, maxWidth, weight, wrapFont)
    // limit to 3 lines, otherwise truncate
    if (lines.length === 0) {
      ctx.restore()
      return
    }
    if (lines.length > 3) {
      let t = text
      // simple truncate
      while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) t = t.slice(0, -1)
      ctx.font = `${weight} ${minSize}px system-ui`
      ctx.fillText(t + '...', x, y)
      ctx.restore()
      return
    }

    const lineHeight = Math.round(wrapFont * 1.05)
    const totalHeight = lines.length * lineHeight
    let startY = y - totalHeight / 2 + lineHeight / 2
    ctx.font = `${weight} ${wrapFont}px system-ui`
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight)
    }
    ctx.restore()
  }

  function drawBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    colors: { boxBg: string; strokeColor: string; textPrimary: string; textSecondary: string; accent: string }
  ) {
    const { boxBg, strokeColor, textPrimary, textSecondary, accent } = colors
    const left = x - w / 2
    const top = y - h / 2
    ctx.save()
    roundRect(ctx, left, top, w, h, 10)
    ctx.fillStyle = boxBg || '#ffffff'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = strokeColor || '#000'
    ctx.stroke()
    // label
    ctx.font = `600 ${Math.max(12, Math.round(w / 6))}px system-ui`
    ctx.fillStyle = textSecondary || '#333'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, x, top - 8)
    // value
    ctx.font = `700 ${Math.max(18, Math.round(w / 3))}px system-ui`
    ctx.fillStyle = value === '?' ? accent || '#e67e22' : textPrimary || '#000'
    ctx.textBaseline = 'middle'
    ctx.fillText(value, x, y)
    ctx.restore()
  }

  function drawMidBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    colors: { boxBg: string; strokeColor: string; textPrimary: string; textSecondary: string; accent: string }
  ) {
    const { boxBg, strokeColor, textPrimary, textSecondary, accent } = colors
    const left = x - w / 2
    const top = y - h / 2
    ctx.save()
    roundRect(ctx, left, top, w, h, 10)
    ctx.fillStyle = boxBg || '#e3f2fd'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = strokeColor || '#000'
    ctx.stroke()
    ctx.font = `600 ${Math.max(12, Math.round(w / 8))}px system-ui`
    ctx.fillStyle = textSecondary || '#333'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, x, top - 8)
    ctx.fillStyle = value.includes('?') ? accent || '#e67e22' : textPrimary || '#000'
    ctx.textBaseline = 'middle'
    // render value with fitting logic to avoid overflow: allow font-size reduction or wrapping
    const maxFontSize = Math.max(16, Math.round(w / 5))
    const minFontSize = 10
    const padding = 12
    renderTextFit(ctx, value, x, y, Math.max(10, w - padding), h, '700', maxFontSize, minFontSize)
    ctx.restore()
  }

  function drawArrow(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    colors: { boxBg: string; strokeColor: string; textPrimary: string; textSecondary: string; accent: string }
  ) {
    const { strokeColor } = colors
    const headLength = 10
    const angle = Math.atan2(y2 - y1, x2 - x1)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = strokeColor || '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    // arrow head
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fillStyle = strokeColor || '#000'
    ctx.fill()
    ctx.restore()
  }

  function checkAnswer() {
    const val = inputRef.current?.value || ''
    const userAnswer = parseFloat(val)
    if (isNaN(userAnswer) || !currProblem) {
      setFeedback('請輸入數字')
      return
    }
    const isCorrect = Math.abs(userAnswer - currProblem.answer) < 0.01
    if (isCorrect) {
      setScore((s) => s + POINTS_CORRECT)
      setCorrectCount((c) => c + 1)
      setFeedback('正確! +10分')
    } else {
      setScore((s) => s - POINTS_WRONG)
      setWrongCount((w) => w + 1)
      setFeedback(`錯誤! 正確答案: ${currProblem.answer}`)
    }
    setTimeout(generateQuestion, 1000)
  }

  function showAnswer() {
    if (!currProblem) return
    setFeedback(`正確答案: ${currProblem.answer}`)
  }

  function showReport() {
    setShowReportModal(true)
  }

  function closeReport() {
    setShowReportModal(false)
  }

  function handleReset() {
    setResetClicks((c) => {
      const next = c + 1
      if (next === 1) {
        setFeedback('再次點擊確認重置')
        setTimeout(() => setResetClicks(0), 3000)
      } else if (next === 2) {
        localStorage.removeItem(STORAGE_KEY)
        setScore(0)
        setCorrectCount(0)
        setWrongCount(0)
        setCurrProblem(null)
        setHasCelebrated(false)
        setFeedback('已重置進度!')
        setTimeout(() => generateQuestion(), 500)
      }
      return next >= 2 ? 0 : next
    })
  }

  // handle Enter key in input
  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      checkAnswer()
    }
  }

  return (
    <div>
      <h2>百分比變化練習</h2>
      <div className="status-bar">
        <div className="status-item goal-text">目標: {TARGET_SCORE}</div>
        <div className="status-item">分數: <span className="score-text">{score}</span></div>
        <div className="status-item">正確: <span id="correctVal">{correctCount}</span></div>
      </div>

      <div className="progress-container">
        <div
          id="progressBar"
          className="progress-bar"
          role="progressbar"
          aria-label="進度"
          style={{ width: `${Math.max(0, Math.min(100, (score / TARGET_SCORE) * 100))}%` }}
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={TARGET_SCORE}
        ></div>
      </div>

      <div className="canvas-container">
        <canvas id="gameCanvas" ref={canvasRef} className="game-canvas" width={850} height={250} />
        <div className="input-group">
          <label className="question-label" htmlFor="userAnswer">答案:</label>
          <input type="number" id="userAnswer" ref={inputRef} className="fui-Input-field input-small" aria-label="答案" onKeyDown={handleInputKey} />
          <button className="fui-Button fui-Button--primary btn-submit" onClick={checkAnswer}>提交</button>
          <button id="showAnswerBtn" className="fui-Button fui-Button--secondary btn-show-answer ml-8" onClick={showAnswer}>顯示答案</button>
        </div>
        <div className="feedback-area" id="feedbackArea" aria-live="polite">{feedback}</div>
      </div>

      <div className="button-container">
        <button className="fui-Button fui-Button--primary btn-report" onClick={showReport}>📊 成績單</button>
        <button className="fui-Button fui-Button--warning btn-reset" id="btnReset" onClick={handleReset}>⚠️ 重置所有進度</button>
      </div>

      {showReportModal && (
        <div className="modal-overlay" id="reportModal">
          <div className="modal-content">
            <button className="modal-close fui-Button fui-Button--light" onClick={closeReport} aria-label="關閉">×</button>
            <h2>成績單</h2>
            <div className="stats-grid">
              <div className="stat-box"><small>最終分數</small><br /><strong className="value value--accent">{score}</strong></div>
              <div className="stat-box"><small>總題數</small><br /><strong className="value">{correctCount + wrongCount}</strong></div>
              <div className="stat-box"><small>正確題數</small><br /><strong className="value value--green">{correctCount}</strong></div>
              <div className="stat-box"><small>正確率</small><br /><strong className="value">{(correctCount + wrongCount) > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) + '%' : '0%'}</strong></div>
            </div>
            <p className="stat-time">{new Date().toLocaleString()}</p>
            <button className="fui-Button fui-Button--primary btn-submit" onClick={closeReport}>繼續練習</button>
          </div>
        </div>
      )}
    </div>
  )
}