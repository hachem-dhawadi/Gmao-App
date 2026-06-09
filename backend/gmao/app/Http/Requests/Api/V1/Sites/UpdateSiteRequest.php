<?php

namespace App\Http\Requests\Api\V1\Sites;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['sometimes', 'string', 'max:255'],
            'code'        => ['sometimes', 'string', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'address'     => ['sometimes', 'nullable', 'string', 'max:500'],
            'phone'       => ['sometimes', 'required', 'string', 'max:50'],
            'timezone'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active'   => ['sometimes', 'boolean'],
            'geo_lat'     => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'geo_lng'     => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
