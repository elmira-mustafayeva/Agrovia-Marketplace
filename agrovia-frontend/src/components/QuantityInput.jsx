import { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * QuantityInput — numeric input with − / + buttons.
 *
 * Uses a local draft state so users can freely type (e.g. "32") without
 * premature clamping. The committed value is only pushed to the parent
 * (via onChange) on blur, Enter key, or button click.
 *
 * Props:
 *   value     — externally committed value
 *   onChange  — called with the new committed number
 *   min       — minimum allowed value (default 1)
 *   max       — maximum allowed value (default 9999)
 *   step      — step used by buttons (default 1)
 *   disabled  — disables all controls
 */
export default function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  disabled = false,
}) {
  const [draft, setDraft] = useState(String(value ?? min));
  const [error, setError] = useState('');

  // Keep draft in sync when external value changes (e.g. after a cart refetch)
  useEffect(() => {
    setDraft(String(value ?? min));
    setError('');
  }, [value, min]);

  function clamp(n) {
    return Math.min(max, Math.max(min, n));
  }

  function commit(raw) {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || !isFinite(parsed)) {
      setDraft(String(value ?? min));
      setError(`Düzgün rəqəm daxil edin`);
      return;
    }
    if (parsed < min) {
      setDraft(String(min));
      setError(`Minimum miqdar: ${min}`);
      onChange?.(min);
      return;
    }
    if (parsed > max) {
      setDraft(String(max));
      setError(`Maksimum miqdar: ${max}`);
      onChange?.(max);
      return;
    }
    setDraft(String(parsed));
    setError('');
    onChange?.(parsed);
  }

  function handleChange(e) {
    // Allow free typing — do not clamp yet
    setDraft(e.target.value);
    setError('');
  }

  function handleBlur() {
    commit(draft);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
    }
  }

  function handleDecrement() {
    const next = clamp((parseFloat(draft) || (value ?? min)) - step);
    setDraft(String(next));
    setError('');
    onChange?.(next);
  }

  function handleIncrement() {
    const next = clamp((parseFloat(draft) || (value ?? min)) + step);
    setDraft(String(next));
    setError('');
    onChange?.(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || parseFloat(draft) <= min}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          aria-label="Azalt"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <input
          type="number"
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`input-shell w-20 text-center ${error ? 'input-error' : ''}`}
          aria-label="Miqdar"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || parseFloat(draft) >= max}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          aria-label="Artır"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <p className="helper-error">{error}</p>}
    </div>
  );
}
