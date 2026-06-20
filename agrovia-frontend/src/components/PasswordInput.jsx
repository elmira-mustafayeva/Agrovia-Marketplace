import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * PasswordInput — a password field with an Eye/EyeOff toggle.
 * Fully compatible with React Hook Form (forwards ref).
 *
 * Usage:
 *   <PasswordInput
 *     className={`input-shell ${errors.password ? 'input-error' : ''}`}
 *     placeholder="Şifrə"
 *     {...register('password')}
 *   />
 */
const PasswordInput = forwardRef(function PasswordInput(
  { className = '', ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition"
        tabIndex={-1}
        aria-label={visible ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

export default PasswordInput;
