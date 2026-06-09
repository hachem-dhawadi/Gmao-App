<?php

namespace App\Http\Requests\Api\V1\Sites;

use Illuminate\Foundation\Http\FormRequest;

class StoreSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'code'        => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:2000'],
            'address'     => ['nullable', 'string', 'max:500'],
            'phone'       => ['required', 'string', 'max:50'],
            'timezone'    => ['nullable', 'string', 'max:100'],
            'is_active'   => ['nullable', 'boolean'],
            'geo_lat'     => ['nullable', 'numeric', 'between:-90,90'],
            'geo_lng'     => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
