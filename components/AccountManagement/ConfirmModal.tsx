import { UsersThreeIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { MasonryModal } from "../MasonryModal";

type ConfirmModalProps = {
  isOpen: boolean;
  countdown: number;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  isOpen,
  countdown,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <MasonryModal
      isOpen={isOpen}
      onClose={onClose}
      animateFrom="center"
      blurToFocus={false}
      panelClassName="max-w-md"
      duration={0.35}
    >
      {(close) => (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/90 p-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-rose-500/60 bg-rose-900/50">
              <UsersThreeIcon
                size={24}
                weight="duotone"
                className="text-rose-200"
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Warning: Admin Access
              </h3>
              <p className="mt-0.5 text-xs text-rose-200/80">
                This grants full account management
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            You are about to grant{" "}
            <span className="font-semibold">Account Manager</span> access. This
            allows the user to create, edit, and delete accounts, and manage all
            user permissions.
          </p>
          <p className="mt-2 text-sm font-medium text-rose-200">
            Only grant this to trusted administrators.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                close();
              }}
              disabled={countdown > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-700/60"
            >
              <CheckCircleIcon size={16} />
              {countdown > 0 ? `Wait ${countdown}s` : "Grant Access"}
            </button>
          </div>
        </div>
      )}
    </MasonryModal>
  );
}
