import { TrashIcon } from "@phosphor-icons/react";
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
      onClose={() => !isDeleting && onClose()}
      animateFrom="center"
      blurToFocus={false}
      panelClassName="max-w-md"
      duration={0.35}
    >
      {(close) => (
        <div className="rounded-2xl border border-white/20 bg-emerald-950 p-5 shadow-2xl">
          <h3 className="text-lg font-medium text-white">Delete Account</h3>
          <p className="mt-2 text-sm text-white/85">
            Are you sure you want to delete{" "}
            <span className="font-medium">{account?.email}</span>? This action
            cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isDeleting}
              className="rounded-lg border border-white/35 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              <TrashIcon size={16} />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </MasonryModal>
  );
}
