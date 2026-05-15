<?php

namespace App\Http\Requests\Api\V1\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->attributes->get('currentCompany')?->id;

        return [
            'title'             => ['sometimes', 'string', 'max:255'],
            'asset_id'          => [
                'sometimes', 'integer',
                Rule::exists('assets', 'id')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at'),
            ],
            'code'              => ['sometimes', 'nullable', 'string', 'max:50'],
            'status'            => ['sometimes', 'string', 'in:open,in_progress,on_hold,completed,cancelled'],
            'priority'          => ['sometimes', 'string', 'in:low,medium,high,critical'],
            'description'       => ['sometimes', 'nullable', 'string'],
            'due_at'            => ['sometimes', 'nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'assigned_member_ids'   => ['sometimes', 'nullable', 'array'],
            'assigned_member_ids.*' => ['integer', 'exists:members,id'],
        ];
    }
}
