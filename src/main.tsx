import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FluentProvider } from '@fluentui/react-components'
import 'rehype-callouts/theme/github'
import App from './App'
import Home from './pages/Home'
import HwList from './pages/HwList'
import MathGame from './pages/MathGame'
import BlogList from './pages/BlogList'
import BlogPost from './pages/BlogPost'
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
        { path: 'blog', element: <BlogList /> },
        { path: 'blog/:slug', element: <BlogPost /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
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
