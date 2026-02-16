import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">403 — Unauthorized</h1>
      <p className="text-zinc-600">
        You do not have permission to access this resource.
      </p>
      <Link
        href="/"
        className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
      >
        Go home
      </Link>
    </div>
  )
}
