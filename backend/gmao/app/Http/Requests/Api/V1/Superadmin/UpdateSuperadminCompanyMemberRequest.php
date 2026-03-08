<?php

namespace App\Http\Requests\Api\V1\Superadmin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSuperadminCompanyMemberRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'locale' => ['sometimes', 'nullable', 'string', 'max:20'],
            'department_id' => ['sometimes', 'nullable', 'integer', 'exists:departments,id'],
            'employee_code' => ['sometimes', 'string', 'max:255'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['required'],
        ];
    }
}
