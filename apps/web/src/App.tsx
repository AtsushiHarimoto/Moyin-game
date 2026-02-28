import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { router } from '@/routes'

/**
 * Root App component.
 * Sets up global providers: QueryClient, Router.
 * i18n is initialized as a side-effect import in main.tsx.
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
