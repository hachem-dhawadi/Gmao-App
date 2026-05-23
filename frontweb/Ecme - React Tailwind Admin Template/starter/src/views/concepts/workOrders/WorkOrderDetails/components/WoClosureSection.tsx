import { useState } from 'react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { TbAlertTriangle } from 'react-icons/tb'
import type { WorkOrder, UpdateWorkOrderRequest } from '@/services/WorkOrdersService'

const FAILURE_CODES = [
    { value: 'electrical_fault',     label: 'Electrical Fault' },
    { value: 'mechanical_failure',   label: 'Mechanical Failure' },
    { value: 'wear_and_tear',        label: 'Wear & Tear' },
    { value: 'operator_error',       label: 'Operator Error' },
    { value: 'lack_of_maintenance',  label: 'Lack of Maintenance' },
    { value: 'manufacturing_defect', label: 'Manufacturing Defect' },
    { value: 'environmental',        label: 'Environmental' },
    { value: 'unknown',              label: 'Unknown' },
]

const ROOT_CAUSES = [
    { value: 'inadequate_maintenance', label: 'Inadequate Maintenance' },
    { value: 'operator_error',         label: 'Operator Error' },
    { value: 'design_flaw',            label: 'Design Flaw' },
    { value: 'normal_aging',           label: 'Normal Aging' },
    { value: 'overload',               label: 'Overload / Misuse' },
    { value: 'external_factor',        label: 'External Factor' },
    { value: 'unknown',                label: 'Unknown' },
]

type Props = {
    wo: WorkOrder
    canEdit: boolean
    patch: (payload: UpdateWorkOrderRequest) => void
}

const WoClosureSection = ({ wo, canEdit, patch }: Props) => {
    const [resolutionDraft, setResolutionDraft] = useState(wo.resolution_notes ?? '')

    const handleResolutionBlur = () => {
        if (resolutionDraft !== (wo.resolution_notes ?? '')) {
            patch({ resolution_notes: resolutionDraft || null })
        }
    }

    const failureOption = FAILURE_CODES.find((o) => o.value === wo.failure_code) ?? null
    const rootOption    = ROOT_CAUSES.find((o) => o.value === wo.root_cause) ?? null

    return (
        <Card>
            <h6 className="flex items-center gap-2 mb-4 text-sm font-semibold">
                <TbAlertTriangle className="text-amber-500 text-base" />
                Failure Analysis
            </h6>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Failure Code
                    </label>
                    <Select
                        size="sm"
                        placeholder="Select failure code…"
                        options={FAILURE_CODES}
                        value={failureOption}
                        onChange={(opt) =>
                            patch({ failure_code: (opt as { value: string } | null)?.value ?? null })
                        }
                        isDisabled={!canEdit}
                        isClearable
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Root Cause
                    </label>
                    <Select
                        size="sm"
                        placeholder="Select root cause…"
                        options={ROOT_CAUSES}
                        value={rootOption}
                        onChange={(opt) =>
                            patch({ root_cause: (opt as { value: string } | null)?.value ?? null })
                        }
                        isDisabled={!canEdit}
                        isClearable
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Resolution Notes
                </label>
                <textarea
                    className={`w-full min-h-[80px] p-3 rounded-xl border text-sm resize-none outline-none transition-colors
                        ${canEdit
                            ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary/30'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-default'
                        }`}
                    placeholder={canEdit ? 'Describe what was done to fix the issue…' : 'No resolution notes.'}
                    value={resolutionDraft}
                    onChange={(e) => setResolutionDraft(e.target.value)}
                    onBlur={handleResolutionBlur}
                    readOnly={!canEdit}
                />
            </div>
        </Card>
    )
}

export default WoClosureSection
