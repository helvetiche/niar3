"use client";

type Props = { name: string; description: string };

export function WorkspaceToolPlaceholder({ name, description }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">{name}</h2>
      <p className="mt-2 text-zinc-600">{description}</p>
      <p className="mt-4 text-sm text-zinc-400">Coming soon</p>
    </div>
  );
}
