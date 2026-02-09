import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import SmallScreenBlocker from './components/SmallScreenBlocker'

export default function App() {
  const location = useLocation()

  return (
    <>
      <div className="app-container">
        <header className="site-header">
          <h1>WingChun's Website</h1>
          <nav>
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/hw-list" className="nav-link">Hw List</Link>
            <Link to="/math-game" className="nav-link">Math Game</Link>
            <a href="https://github.com/WingChunWong" className="nav-link nav-github" target="_blank" rel="noopener noreferrer">
              <i className="bi bi-github" aria-hidden="true"></i>
              <span className="sr-only">GitHub</span>
            </a>
          </nav>
        </header>
        <SmallScreenBlocker />
        <main>
          <section className="page-card fui-Card">
            <div className="page-content">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
