import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-gray-400">Page not found</p>
      <Link to="/" className="text-blue-400 hover:underline">Back to Home</Link>
    </div>
  )
}
