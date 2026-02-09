import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FluentProvider } from '@fluentui/react-components'
import App from './App'
import Home from './pages/Home'
import HwList from './pages/HwList'
import MathGame from './pages/MathGame'
// Static CSS files under `public/css` are served as-is by Vite and
// must be referenced from `index.html` via <link href="/...">.

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <Home /> },
        { path: 'hw-list', element: <HwList /> },
        { path: 'math-game', element: <MathGame /> },
      ],
    },
  ],
  {
    // cast to any to avoid TypeScript excess property checks for upcoming/unstable future flags
    future: ({
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    } as any),
  }
)

const root = createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <FluentProvider>
      <RouterProvider router={router} />
    </FluentProvider>
  </React.StrictMode>
)
