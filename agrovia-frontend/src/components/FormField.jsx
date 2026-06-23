/**
 * FormField — wrapper that pairs a label with its input and an RHF error message.
 *
 * Usage:
 *   <FormField label="Ad" error={errors.firstName} required>
 *     <input className={`input-shell ${errors.firstName ? 'input-error' : ''}`} {...register('firstName')} />
 *   </FormField>
 */
export default function FormField({ label, error, required = false, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error?.message && (
        <p className="helper-error">{error.message}</p>
      )}
    </div>
  );
}
