import { useCallback, useEffect, useState } from "react";

/* The shared modal shell.

   Clicking the backdrop used to close instantly, which quietly threw away a
   half-written project or a pasted import list. Now a dismissal is only
   instant while there is nothing to lose; once something has been typed it
   asks first. Escape goes through the same guard — it was not handled at all
   before, which is its own small failure of keyboard support. */
export function Overlay({
  dirty,
  onClose,
  wide,
  scroll,
  children,
}: {
  /* true once the contents are worth protecting */
  dirty: boolean;
  onClose: () => void;
  wide?: boolean;
  /* pins a head/body/actions layout so a long form's title and buttons never
     scroll out of reach — only the fields between them do */
  scroll?: boolean;
  children: (requestClose: () => void) => React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true);
    else onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      /* a second Escape while the question is up means "yes, discard" */
      if (confirming) onClose();
      else requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, onClose, requestClose]);

  return (
    <div className="wp-overlay" onClick={requestClose}>
      <div
        className={`wp-modal${wide ? " wp-modal-wide" : ""}${scroll ? " wp-modal-scroll" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {confirming && (
          <div className="wp-discard" role="alert">
            <span className="wp-discard-text">Discard what you have written?</span>
            <button className="wp-btn wp-btn-danger" onClick={onClose}>
              Discard
            </button>
            <button className="wp-btn" onClick={() => setConfirming(false)}>
              Keep editing
            </button>
          </div>
        )}
        {children(requestClose)}
      </div>
    </div>
  );
}
