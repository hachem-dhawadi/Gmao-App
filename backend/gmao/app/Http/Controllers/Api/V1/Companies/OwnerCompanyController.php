<?php

namespace App\Http\Controllers\Api\V1\Companies;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Companies\StoreOwnerCompanyRequest;
use App\Models\Company;
use App\Models\Member;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OwnerCompanyController extends Controller
{
    public function store(StoreOwnerCompanyRequest $request, CompanyRbacSetupService $rbacSetupService): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $existingMembership = Member::query()->where('user_id', $user->id)->exists();

        if ($existingMembership) {
            return response()->json([
                'success' => false,
                'message' => 'You already belong to a company. Company creation is only for first-time owners.',
            ], 422);
        }

        $validated = $request->validated();

        [$company, $ownerMember] = DB::transaction(function () use ($validated, $user, $rbacSetupService): array {
            $company = Company::query()->create([
                'name' => $validated['name'],
                'legal_name' => $validated['legal_name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'] ?? null,
                'address_line1' => $validated['address_line1'] ?? null,
                'address_line2' => $validated['address_line2'] ?? null,
                'city' => $validated['city'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'country' => $validated['country'] ?? null,
                'timezone' => $validated['timezone'] ?? 'Africa/Tunis',
                'is_active' => false,
                'approval_status' => 'pending',
            ]);

            $ownerMember = Member::query()->create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'status' => 'active',
                'job_title' => 'Owner',
                'employee_code' => 'OWN-'.$company->id,
            ]);

            $roles = $rbacSetupService->bootstrapForCompany($company);
            $ownerMember->roles()->syncWithoutDetaching([$roles['admin']->id]);

            return [$company, $ownerMember];
        });

        return response()->json([
            'success' => true,
            'message' => 'Company created successfully and sent for superadmin approval.',
            'data' => [
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'legal_name' => $company->legal_name,
                    'is_active' => (bool) $company->is_active,
                    'approval_status' => $company->approval_status,
                ],
                'owner_member' => [
                    'id' => $ownerMember->id,
                    'company_id' => $ownerMember->company_id,
                    'user_id' => $ownerMember->user_id,
                    'status' => $ownerMember->status,
                ],
            ],
        ], 201);
    }
}
