<?php

namespace App\Http\Requests\Api\V1\WorkOrders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $companyId = $this->attributes->get('currentCompany')?->id;

        return [
            'title'             => ['required', 'string', 'max:255'],
            'asset_id'          => [
                'required', 'integer',
                Rule::exists('assets', 'id')
                    ->where('company_id', $companyId)
                    ->whereNull('deleted_at'),
            ],
            'team_id'           => ['nullable', 'integer', Rule::exists('teams', 'id')->where('company_id', $companyId)->whereNull('deleted_at')],
            'code'              => ['nullable', 'string', 'max:50'],
            'status'            => ['nullable', 'string', 'in:open,in_progress,on_hold,completed,cancelled'],
            'priority'          => ['required', 'string', 'in:low,medium,high,critical'],
            'description'       => ['nullable', 'string'],
            'due_at'            => ['nullable', 'date'],
            'estimated_minutes' => ['nullable', 'integer', 'min:0'],
            'assigned_member_id' => ['nullable', 'integer', 'exists:members,id'],
        ];
    }
}
