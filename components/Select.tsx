import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

/* ------------------------------------------------------------------
   A dropdown in the app's own language — on a mouse.

   On a touch screen it falls back to a real <select>, because the native
   wheel is genuinely easier under a thumb than any list we could draw, and
   the working agreement says this gets opened on a phone. Two paths, but the
   phone keeps the better one rather than a worse imitation of it.

   The custom path is a real listbox: arrow keys, Home and End, type to jump,
   Escape to close, and focus returned to the button on the way out. A styled
   dropdown that cannot be driven from the keyboard would be a step down from
   the plain control it replaces.
   ------------------------------------------------------------------ */

const coarseQuery = "(pointer: coarse)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(coarseQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useCoarsePointer() {
  /* useSyncExternalStore rather than an effect: the server has no pointer to
     ask about, and this keeps the first client render honest without a
     setState that would cascade. */
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(coarseQuery).matches,
    () => false
  );
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
  placeholder,
  className = "",
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  /* shown when nothing is selected, and offered as an empty choice */
  placeholder?: string;
  className?: string;
}) {
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const all: Option[] = placeholder ? [{ value: "", label: placeholder }, ...options] : options;
  const selected = all.find((o) => o.value === value) ?? all[0];

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const choose = useCallback(
    (v: string) => {
      onChange(v);
      close();
    },
    [onChange, close]
  );

  /* clicking anywhere else closes it, the way a menu should behave */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* keep the highlighted row in view when arrowing through a long list */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openAt = () => {
    const i = all.findIndex((o) => o.value === value);
    setActive(i < 0 ? 0 : i);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openAt();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(all.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(all.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(all[active].value);
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key.length === 1) {
      /* type a few letters to jump, the way a native list does */
      const now = Date.now();
      typed.current.text = now - typed.current.at > 800 ? e.key : typed.current.text + e.key;
      typed.current.at = now;
      const q = typed.current.text.toLowerCase();
      const i = all.findIndex((o) => o.label.toLowerCase().startsWith(q));
      if (i >= 0) setActive(i);
    }
  };

  if (coarse) {
    return (
      <select
        className={`wp-input wp-select ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {all.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`wp-selectwrap ${className}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="wp-input wp-selectbtn"
        onClick={() => (open ? close(false) : openAt())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
      >
        <span className="wp-selectbtn-text">{selected?.label ?? placeholder ?? ""}</span>
        <ChevronDown size={14} className="wp-selectbtn-chev" />
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          className="wp-selectlist"
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${active}`}
        >
          {all.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`wp-selectopt${i === active ? " is-active" : ""}${
                o.value === value ? " is-chosen" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              <span className="wp-selectopt-text">{o.label}</span>
              {o.value === value && <Check size={13} strokeWidth={3} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
