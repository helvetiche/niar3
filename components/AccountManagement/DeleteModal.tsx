import { TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { MasonryModal } from "../MasonryModal";
import type { AccountUser } from "@/types/account";

type DeleteModalProps = {
  account: AccountUser | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function DeleteModal({
  account,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteModalProps) {
  return (
    <MasonryModal
      isOpen={!!account}
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
              <WarningCircleIcon
                size={24}
                weight="duotone"
                className="text-rose-200"
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Delete Account
              </h3>
              <p className="mt-0.5 text-xs text-rose-200/80">
                This action cannot be undone
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/90">
            Are you sure you want to delete the account for{" "}
            <span className="font-semibold">{account?.displayName}</span>?
          </p>
          <p className="mt-2 text-sm font-medium text-rose-200">
            This will permanently remove their access to the system.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isDeleting}
              className="rounded-lg border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
              }}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-700/60"
            >
              <TrashIcon size={16} />
              {isDeleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      )}
    </MasonryModal>
  );
}
