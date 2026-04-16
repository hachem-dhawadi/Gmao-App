<?php

namespace App\Http\Requests\Api\V1\Members;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMemberRequest extends FormRequest
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
            'department_id' => ['sometimes', 'nullable', 'integer', 'exists:departments,id'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['required'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'employee_code' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'avatar' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'remove_avatar' => ['sometimes', 'boolean'],
        ];
    }
}
