"use client";

type Props = { name: string; description: string };

export function WorkspaceToolPlaceholder({ name, description }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-700/60 bg-emerald-900 p-8 shadow-xl shadow-emerald-950/30">
      <h2 className="text-xl font-semibold text-white">{name}</h2>
      <p className="mt-2 text-white/85">{description}</p>
      <p className="mt-4 text-sm text-white/70">Coming soon</p>
    </div>
  );
}
