export function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <div className={`${className} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
