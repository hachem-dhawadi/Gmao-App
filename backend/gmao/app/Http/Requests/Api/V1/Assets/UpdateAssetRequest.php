<?php

namespace App\Http\Requests\Api\V1\Assets;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => ['sometimes', 'string', 'max:255'],
            'code'            => ['sometimes', 'string', 'max:100'],
            'asset_type_id'   => ['sometimes', 'integer', 'exists:asset_types,id'],
            'status'          => ['sometimes', 'string', 'in:active,inactive,under_maintenance,decommissioned'],
            'serial_number'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'manufacturer'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'model'           => ['sometimes', 'nullable', 'string', 'max:255'],
            'location'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'address_label'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes'           => ['sometimes', 'nullable', 'string'],
            'purchase_date'   => ['sometimes', 'nullable', 'date'],
            'warranty_end_at' => ['sometimes', 'nullable', 'date'],
            'installed_at'    => ['sometimes', 'nullable', 'date'],
        ];
    }
}
