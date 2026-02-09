import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function SmallScreenBlocker() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function checkScreenSize() {
      const isSmall = window.innerWidth < 767 || window.innerHeight < 500
      setVisible(isSmall)
      if (isSmall) document.body.classList.add('blocked')
      else document.body.classList.remove('blocked')
    }

    checkScreenSize()

    const onResize = () => checkScreenSize()
    const onOrient = () => setTimeout(checkScreenSize, 120)

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onOrient)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrient)
      document.body.classList.remove('blocked')
    }
  }, [])

  if (!visible) return null

  const overlay = (
    <div className="small-screen-overlay">
      <i className="small-screen-icon bi bi-tablet" aria-hidden="true"></i>
      <h3 className="small-screen-title">請使用大屏設備訪問</h3>
      <p className="small-screen-desc">建議使用平板電腦或電腦以獲得更佳體驗</p>
    </div>
  )

  return createPortal(overlay, document.body)
}
