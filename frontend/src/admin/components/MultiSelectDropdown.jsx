import { useState, useRef, useEffect } from "react";

export default function MultiSelectDropdown({ label, options, selected, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {label && <label className="block font-label-md text-label-md text-on-surface-variant mb-unit">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[48px] px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-left flex items-center justify-between gap-2 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
      >
        <span className={`text-sm flex-1 flex flex-wrap gap-1.5 ${selected.length === 0 ? "text-outline" : ""}`}>
          {selected.length === 0
            ? placeholder
            : selected.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold">
                  {s}
                </span>
              ))}
        </span>
        <span className="material-symbols-outlined text-[20px] text-outline">{open ? "expand_less" : "expand_more"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-outline">No options available</p>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-container-high cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="w-4 h-4 accent-primary"
                />
                {option}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
