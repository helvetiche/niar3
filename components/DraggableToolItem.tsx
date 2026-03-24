"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "z-50" : ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        title={name}
        {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
        className={`flex w-full items-center rounded-lg transition hover:bg-emerald-800 ${
          isCollapsed
            ? "justify-center px-2 py-3"
            : "items-start gap-4 px-4 py-3 text-left"
        } ${isActive ? "bg-emerald-800" : ""} ${
          isDragEnabled && isDragging ? "shadow-lg shadow-emerald-950/50" : ""
        } ${isDragEnabled ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white ${
            isCollapsed ? "p-2" : "p-2.5"
          }`}
        >
          <Icon
            size={isCollapsed ? 20 : 24}
            weight="duotone"
            className="text-white"
          />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="mt-0.5 text-xs text-emerald-200/80 line-clamp-2">
              {description}
            </p>
          </div>
        )}
      </button>
    </li>
  );
}
