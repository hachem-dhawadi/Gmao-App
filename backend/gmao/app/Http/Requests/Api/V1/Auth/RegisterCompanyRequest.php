<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterCompanyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'owner_password' => ['required', 'string', 'min:8', 'confirmed'],
            'owner_phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'device_name' => ['nullable', 'string', 'max:100'],

            'company_name' => ['required', 'string', 'max:255'],
            'company_legal_name' => ['nullable', 'string', 'max:255'],
            'company_email' => ['nullable', 'string', 'email', 'max:255'],
            'company_phone' => ['nullable', 'string', 'max:30'],
            'company_address_line1' => ['nullable', 'string', 'max:255'],
            'company_address_line2' => ['nullable', 'string', 'max:255'],
            'company_city' => ['nullable', 'string', 'max:100'],
            'company_postal_code' => ['nullable', 'string', 'max:50'],
            'company_country' => ['nullable', 'string', 'max:100'],
            'company_timezone' => ['required', 'string', 'max:100'],

            'proof_files' => ['required', 'array', 'min:1'],
            'proof_files.*' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
