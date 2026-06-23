import { useState, useEffect, forwardRef } from 'react';
import { normalizePhone, isValidAzMobile, stripPrefix } from '../lib/phoneUtils';

/**
 * PhoneInput — Azerbaijan-first phone field.
 *
 * Visible layout:
 *   ┌──────────┬─────────────────────────┐
 *   │  +994    │  50 123 45 67           │
 *   │ (locked) │  (user types here)      │
 *   └──────────┴─────────────────────────┘
 *
 * RHF integration — value in form state is always the full normalized
 * number (+994XXXXXXXXX). Pass `value` + `onChange` from RHF controller,
 * or spread register() result on the outer wrapper and use `onChange` + `onBlur`.
 *
 * Props:
 *   value      — current full phone value from RHF (e.g. '+994501234567' or '')
 *   onChange   — RHF onChange; receives the full normalized value
 *   onBlur     — RHF onBlur; called after normalization
 *   hasError   — boolean; adds red border to the local input
 *   name, ref  — forwarded to the hidden input (for RHF registration)
 */
const PhoneInput = forwardRef(function PhoneInput(
  { value = '', onChange, onBlur, hasError = false, name, ...rest },
  ref
) {
  // Local draft shows only the portion after +994
  const [draft, setDraft] = useState(() => stripPrefix(value));

  // Sync draft when an existing stored value arrives (e.g. edit-profile pre-fill)
  useEffect(() => {
    setDraft(stripPrefix(value));
  }, [value]);

  function commit(raw) {
    const local = raw.trim();
    const normalized = normalizePhone(local.startsWith('+994') ? local : '+994' + local);
    onChange?.(normalized);
  }

  function handleChange(e) {
    // Only allow digits in the local portion
    const digits = e.target.value.replace(/\D/g, '');
    setDraft(digits);
  }

  function handleBlur(e) {
    commit(draft);
    onBlur?.(e);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
    }
  }

  return (
    <div
      className={`input-shell flex items-center gap-0 p-0 overflow-hidden ${hasError ? 'input-error' : ''}`}
    >
      {/* Locked prefix */}
      <span className="select-none bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500 border-r border-slate-200 shrink-0">
        +994
      </span>
      {/* Editable local portion */}
      <input
        type="tel"
        inputMode="numeric"
        name={name}
        ref={ref}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="XX XXX XX XX"
        className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        maxLength={10}
        autoComplete="tel-national"
        {...rest}
      />
    </div>
  );
});

export default PhoneInput;
