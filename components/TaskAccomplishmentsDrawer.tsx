"use client";

import { MasonryModal } from "@/components/MasonryModal";
import { TaskManager } from "@/components/TaskManager";

type TaskAccomplishmentsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Right half-screen panel: full task manager with checkboxes (shortcut from the widget sidebar).
 */
export function TaskAccomplishmentsDrawer({
  isOpen,
  onClose,
}: TaskAccomplishmentsDrawerProps) {
  return (
    <MasonryModal
      isOpen={isOpen}
      onClose={onClose}
      animateFrom="right"
      placement="right"
      blurToFocus
      duration={0.55}
      ease="power3.out"
      panelClassName=""
    >
      {(close) => (
        <div className="flex h-full min-h-0 flex-col">
          <TaskManager variant="drawer" onRequestClose={close} />
        </div>
      )}
    </MasonryModal>
  );
}
