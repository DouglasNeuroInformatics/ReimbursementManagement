import { EXPENSE_POLICIES } from '../../lib/policies'

interface PolicyDisplayProps {
  category?: string
  policyIds?: string[]
  showTitle?: boolean
}

interface Policy {
  id: string
  title: string
  category: string
  description: string
  requirements: string[]
  documentation: string[]
  notes?: string
}

/**
 * PolicyDisplay - Shows relevant reimbursement policies
 */
export function PolicyDisplay({ category, policyIds, showTitle = true }: PolicyDisplayProps) {
  let relevantPolicies = EXPENSE_POLICIES

  if (policyIds) {
    relevantPolicies = EXPENSE_POLICIES.filter((policy: Policy) => policyIds.includes(policy.id))
  } else if (category) {
    relevantPolicies = EXPENSE_POLICIES.filter(
      (policy: Policy) => policy.category === category || policy.category === 'all'
    )
  }

  if (relevantPolicies.length === 0) {
    return null
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-blue-100 shadow-lg shadow-blue-900/5 rounded-xl p-5 mt-4 transition-all duration-300 hover:shadow-blue-900/10">
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Reimbursement Policies</h3>
        </div>
      )}
      <div className="space-y-5">
        {relevantPolicies.map((policy) => (
          <div key={policy.id} className="relative pl-4 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-gradient-to-b before:from-blue-500 before:to-indigo-500 before:rounded-full group transition-all duration-200 hover:-translate-y-0.5">
            <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{policy.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
            {policy.requirements.length > 0 && (
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1 marker:text-blue-400">
                {policy.requirements.map((req: string, idx: number) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            )}
            {policy.documentation.length > 0 && (
              <div className="text-sm text-gray-600 mt-2 bg-blue-50/50 p-3 rounded-lg border border-blue-50">
                <span className="font-semibold text-blue-900 block mb-1">Required documentation:</span>
                <ul className="list-disc list-inside marker:text-blue-400">
                  {policy.documentation.map((doc: string, idx: number) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}
            {policy.notes && (
              <p className="text-sm text-indigo-600 mt-2 flex items-start gap-1 pb-1">
                <svg className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="italic">{policy.notes}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
