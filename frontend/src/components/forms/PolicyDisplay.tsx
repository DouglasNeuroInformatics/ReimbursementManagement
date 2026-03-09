import { EXPENSE_POLICIES } from '../../lib/policies'

interface PolicyDisplayProps {
  category: string
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
 * PolicyDisplay - Shows relevant reimbursement policies for a given category
 */
export function PolicyDisplay({ category, showTitle = true }: PolicyDisplayProps) {
  const relevantPolicies = EXPENSE_POLICIES.filter(
    (policy: Policy) => policy.category === category || policy.category === 'all'
  )

  if (relevantPolicies.length === 0) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      {showTitle && (
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Reimbursement Policies</h3>
      )}
      <div className="space-y-3">
        {relevantPolicies.map((policy) => (
          <div key={policy.id} className="border-l-4 border-blue-400 pl-3">
            <h4 className="font-medium text-blue-800">{policy.title}</h4>
            <p className="text-sm text-blue-700 mt-1">{policy.description}</p>
            {policy.requirements.length > 0 && (
              <ul className="list-disc list-inside text-sm text-blue-600 mt-1 space-y-1">
                {policy.requirements.map((req: string, idx: number) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            )}
            {policy.documentation.length > 0 && (
              <div className="text-sm text-blue-600 mt-1">
                <span className="font-medium">Required documentation:</span>
                <ul className="list-disc list-inside">
                  {policy.documentation.map((doc: string, idx: number) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}
            {policy.notes && (
              <p className="text-sm text-blue-600 italic mt-1">{policy.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
