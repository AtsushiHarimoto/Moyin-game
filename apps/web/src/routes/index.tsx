import { lazy } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import RootLayout from './layout'

// Lazy-loaded page components
const HomePage = lazy(() => import('./home/page'))
const LoginPage = lazy(() => import('./login/page'))
const DemoPage = lazy(() => import('./demo/page'))
const SavesPage = lazy(() => import('./saves/page'))
const SettingsPage = lazy(() => import('./settings/page'))
const VnStagePage = lazy(() => import('./vn-stage/page'))
const VnReplayPage = lazy(() => import('./vn-replay/page'))
const StoriesPage = lazy(() => import('./stories/page'))
const StoryImportPage = lazy(() => import('./stories/import/page'))
const PlayPage = lazy(() => import('./play/page'))
const AdminPage = lazy(() => import('./admin/page'))
const IconManagerPage = lazy(() => import('./admin/icons/page'))
const StageEditorPage = lazy(() => import('./admin/stage-editor/page'))
const DevDemoPage = lazy(() => import('./dev/demo/page'))
const LlmRunnerPage = lazy(() => import('./dev/llm-runner/page'))
const ApiPlaygroundPage = lazy(() => import('./dev/api/page'))
const TestDialogueBoxPage = lazy(() => import('./test/dialogue-box/page'))
const ErrorPage = lazy(() => import('./error/page'))
const NotFoundPage = lazy(() => import('./not-found/page'))

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'demo', element: <DemoPage /> },
      { path: 'ui-demo', element: <DemoPage /> },
      { path: 'saves', element: <SavesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'Setting', element: <SettingsPage /> },
      { path: 'TestGrok', element: <LlmRunnerPage /> },
      { path: 'vn-stage', element: <VnStagePage /> },
      { path: 'vn-replay', element: <VnReplayPage /> },
      { path: 'stories', element: <StoriesPage /> },
      { path: 'stories/import', element: <StoryImportPage /> },
      { path: 'play/:storyKey', element: <PlayPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'admin/icons', element: <IconManagerPage /> },
      { path: 'admin/stage-editor', element: <StageEditorPage /> },
      { path: 'dev/demo', element: <DevDemoPage /> },
      { path: 'dev/llm-runner', element: <LlmRunnerPage /> },
      { path: 'dev/api', element: <ApiPlaygroundPage /> },
      { path: 'dev/net', element: <ApiPlaygroundPage /> },
      { path: 'test/dialogue-box', element: <TestDialogueBoxPage /> },
      { path: 'error', element: <ErrorPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes, {
  future: {},
})
