/**
 * Inline form error summary. Renders nothing when there's no message. Used both
 * at the top of a form and immediately above the submit buttons so a validation
 * failure is visible wherever the user is looking (issue #6b).
 */
export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
      {message}
    </div>
  )
}
