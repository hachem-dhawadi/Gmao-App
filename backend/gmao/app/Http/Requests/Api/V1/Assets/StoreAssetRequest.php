<?php

namespace App\Http\Requests\Api\V1\Assets;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => ['required', 'string', 'max:255'],
            'code'            => ['required', 'string', 'max:100'],
            'asset_type_id'   => ['required', 'integer', 'exists:asset_types,id'],
            'status'          => ['required', 'string', 'in:active,inactive,under_maintenance,decommissioned'],
            'serial_number'   => ['nullable', 'string', 'max:255'],
            'manufacturer'    => ['nullable', 'string', 'max:255'],
            'model'           => ['nullable', 'string', 'max:255'],
            'location'        => ['nullable', 'string', 'max:255'],
            'address_label'   => ['nullable', 'string', 'max:255'],
            'notes'           => ['nullable', 'string'],
            'purchase_date'   => ['nullable', 'date'],
            'warranty_end_at' => ['nullable', 'date'],
            'installed_at'    => ['nullable', 'date'],
        ];
    }
}
