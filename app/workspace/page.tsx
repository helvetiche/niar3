import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";

export default function WorkspacePage() {
  return (
    <>
      <WorkspaceLoadingScreen />
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Workspace</h1>
          <p className="mt-2 text-zinc-600">
            Welcome to your workspace. Your tools and automations will appear here.
          </p>
        </div>
      </main>
    </>
  );
}
