import React, { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'

type HwItem = {
  id: string | number
  subject: string
  homework_name: string
  issue_date: string
  due_date: string
  class_group?: string
  remarks?: string
}

export default function HwList(): JSX.Element {
  const [items, setItems] = useState<HwItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const [issueDate, setIssueDate] = useState<string>(() => getTodayYMD())
  const [subject, setSubject] = useState<string>('')
  const [dueStatus, setDueStatus] = useState<string>('')

  const tableRef = useRef<HTMLTableElement | null>(null)

  useEffect(() => {
    // try multiple possible paths
    const paths = ['/data/homework_data.json', '/hw-list/homework_data.json', '/homework_data.json']
    let tried = 0

    function tryLoad() {
      if (tried >= paths.length) {
        setShowUpload(true)
        return
      }
      const path = paths[tried++]
      fetch(path, { cache: 'no-store' })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status)
          return r.json()
        })
        .then((json) => {
          if (Array.isArray(json)) setItems(json)
          else if (json.items && Array.isArray(json.items)) setItems(json.items)
          else throw new Error('数据格式不正确')
        })
        .catch(() => tryLoad())
    }

    tryLoad()
  }, [])

  const subjects = useMemo(() => {
    if (!items) return []
    return Array.from(new Set(items.map((i) => i.subject))).sort()
  }, [items])

  const filtered = useMemo(() => {
    if (!items) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return items.filter((it) => {
      if (issueDate && it.issue_date !== issueDate) return false
      if (subject && it.subject !== subject) return false
      if (dueStatus) {
        const due = new Date(it.due_date)
        due.setHours(0, 0, 0, 0)
        if (dueStatus === 'overdue' && due >= today) return false
        if (dueStatus === 'today' && due.toDateString() !== today.toDateString()) return false
        if (dueStatus === 'future' && due <= today) return false
      }
      return true
    })
  }, [items, issueDate, subject, dueStatus])

  function resetFilters() {
    setSubject('')
    setDueStatus('')
    setIssueDate(getTodayYMD())
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result))
        if (Array.isArray(json)) setItems(json)
        else if (json.items && Array.isArray(json.items)) setItems(json.items)
        setShowUpload(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        alert('解析文件失败：' + message)
      }
    }
    reader.readAsText(f)
  }

  function countIssuedBy(dateYmd: string) {
    if (!items) return 0
    return items.filter((i) => i.issue_date === dateYmd).length
  }

  function countDueBy(dateYmd: string) {
    if (!items) return 0
    return items.filter((i) => i.due_date === dateYmd).length
  }

  async function downloadScreenshot() {
    try {
      const targetYmd = issueDate
      const targetZh = new Date(targetYmd).toLocaleDateString('zh-Hant', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

      // build a temp container
      const temp = document.createElement('div')
      temp.style.position = 'fixed'
      temp.style.left = '-9999px'
      temp.style.top = '-9999px'
      temp.style.width = '1200px'
      temp.style.padding = '20px'
      temp.style.background = getComputedStyle(document.body).getPropertyValue('--colorNeutralBackground2') || '#111111'

      const header = document.createElement('div')
      header.innerHTML = `<h2 style="margin:0 0 8px;color:${getComputedStyle(document.body).getPropertyValue('--colorBrandForeground1') || '#479ef5'}">功課表</h2><div style="color:var(--colorNeutralForeground2)">${targetZh}</div>`
      temp.appendChild(header)

      if (tableRef.current) {
        const clone = tableRef.current.cloneNode(true) as HTMLElement
        clone.style.width = '100%'
        temp.appendChild(clone)
      } else {
        throw new Error('找不到表格元素')
      }

      document.body.appendChild(temp)
      await new Promise((r) => setTimeout(r, 80))
      const canvas = await html2canvas(temp as HTMLElement, { scale: 3, useCORS: true })
      const link = document.createElement('a')
      link.download = `功課表_${targetYmd.replace(/-/g, '')}.png`
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      link.remove()
      temp.remove()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert('生成圖片失敗：' + message)
    }
  }

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!items) return <div id="loadingSpinner">加载中…</div>

  return (
    <div>
      <div className="page-header">
        <h2>作業列表</h2>
        <div>
          <button id="downloadTableBtn" className="fui-Button download-badge" onClick={downloadScreenshot}>下載圖片</button>
        </div>
      </div>

      <div className="filters-grid">
        <div className="filter-item">
          <label className="fui-Label">發佈日期</label>
          <input id="issueDateFilter" className="fui-Input-field" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="filter-item">
          <label className="fui-Label">科目</label>
          <select id="subjectFilter" className="fui-Select" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">全部</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label className="fui-Label">截止狀態</label>
          <select id="dueStatusFilter" className="fui-Select" value={dueStatus} onChange={(e) => setDueStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="overdue">已過期</option>
            <option value="today">今天到期</option>
            <option value="future">未來</option>
          </select>
        </div>
      </div>

      <div className="actions">
        <button id="resetFilter" className="custom-reset-btn" onClick={resetFilters}>重置篩選</button>
        {showUpload && (
          <div id="uploadArea">
            <input id="fileInput" type="file" accept="application/json" onChange={handleFileUpload} />
          </div>
        )}
      </div>

      <div className="stat-container-card">
        <div className="stat-items-container">
          <div className="stat-item stat-today-issued">
            <div className="stat-content">
              <div className="stat-icon"><i className="bi bi-journal-plus" /></div>
              <div className="stat-title">發布功課</div>
              <div id="issuedTodayCount" className="stat-value">{countIssuedBy(issueDate)}</div>
            </div>
          </div>
          <div className="stat-item stat-today-due">
            <div className="stat-content">
              <div className="stat-icon"><i className="bi bi-clock" /></div>
              <div className="stat-title">截止功課</div>
              <div id="dueTodayCount" className="stat-value">{countDueBy(issueDate)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="homework-table-wrapper">
        <div className="homework-table-container" id="homeworkTableContainer">
          <table className="table-fluent" ref={tableRef}>
            <thead>
              <tr>
                <th>ID</th>
                <th>科目</th>
                <th>作業</th>
                <th>發佈</th>
                <th>截止</th>
                <th>班級</th>
                <th>狀態</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody id="homeworkTableBody">
              {filtered.map((it) => {
                const due = new Date(it.due_date)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                due.setHours(0, 0, 0, 0)
                const isOverdue = due < today
                const isToday = due.toDateString() === today.toDateString()
                const statusClass = isOverdue ? 'overdue' : isToday ? 'today' : 'normal'
                const statusText = isOverdue ? '已過期' : isToday ? '今天到期' : '進行中'
                const statusIcon = isOverdue ? 'exclamation-circle' : isToday ? 'clock' : 'arrow-right'
                return (
                  <tr key={String(it.id)} className={statusClass}>
                    <td>{it.id}</td>
                    <td>{it.subject}</td>
                    <td>{it.homework_name}</td>
                    <td>{it.issue_date}</td>
                    <td className="deadline-cell" data-deadline={it.due_date}>{it.due_date}</td>
                    <td>{it.class_group}</td>
                    <td>
                          <span className={`status-badge ${statusClass}`}>
                            <i className={`bi bi-${statusIcon}`} />
                            <span className="badge-text">{statusText}</span>
                          </span>
                        </td>
                    <td><div className="homework-remarks">{it.remarks || '無備註'}</div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function getTodayYMD() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
