"use client";

export function CategoryPill({
  name,
  color,
}: {
  name: string;
  color?: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ backgroundColor: color || "#999" }}
      />
      <span>{name}</span>
    </span>
  );
}
