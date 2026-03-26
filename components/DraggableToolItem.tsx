"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PushPinIcon } from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

interface DraggableToolItemProps {
  id: string;
  name: string;
  description: string;
  icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
  isActive: boolean;
  isCollapsed: boolean;
  isDragEnabled: boolean;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  onClick: () => void;
}

export function DraggableToolItem({
  id,
  name,
  description,
  icon: Icon,
  isActive,
  isCollapsed,
  isDragEnabled,
  isPinned,
  onTogglePin,
  onClick,
}: DraggableToolItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(id);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "z-50" : ""} group relative`}
    >
      <button
        type="button"
        onClick={onClick}
        title={name}
        suppressHydrationWarning
        {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        className={`flex w-full items-center rounded-lg transition ${
          isPinned
            ? "bg-yellow-900/30 hover:bg-yellow-900/40 border border-yellow-600/40"
            : "hover:bg-emerald-800"
        } ${
          isCollapsed
            ? "justify-center px-2 py-3"
            : "items-start gap-4 px-4 py-3 text-left"
        } ${isActive && !isPinned ? "bg-emerald-800" : ""} ${
          isDragEnabled && isDragging ? "shadow-lg shadow-emerald-950/50" : ""
        } ${isDragEnabled ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed ${
            isPinned ? "border-yellow-400" : "border-white"
          } ${isCollapsed ? "p-2" : "p-2.5"}`}
        >
          <Icon
            size={isCollapsed ? 20 : 24}
            weight="duotone"
            className={isPinned ? "text-yellow-300" : "text-white"}
          />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${isPinned ? "text-yellow-100" : "text-white"}`}>
              {name}
            </p>
            <p className={`mt-0.5 text-xs line-clamp-2 ${
              isPinned ? "text-yellow-200/70" : "text-emerald-200/80"
            }`}>
              {description}
            </p>
          </div>
        )}
      </button>
      {!isCollapsed && (
        <button
          type="button"
          onClick={handlePinClick}
          className={`absolute right-2 top-2 rounded p-1 transition-opacity ${
            isPinned
              ? "opacity-100 bg-yellow-800/50 hover:bg-yellow-800/70"
              : "opacity-0 group-hover:opacity-100 bg-emerald-800/80 hover:bg-emerald-700"
          }`}
          title={isPinned ? "Unpin tool" : "Pin tool"}
        >
          <PushPinIcon
            size={14}
            weight={isPinned ? "fill" : "regular"}
            className={isPinned ? "text-yellow-300" : "text-white"}
          />
        </button>
      )}
    </li>
  );
}
