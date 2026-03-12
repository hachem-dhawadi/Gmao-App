<?php

namespace App\Http\Controllers\Api\V1\Companies;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Companies\ApproveCompanyRequest;
use App\Models\Company;
use App\Models\File;
use Illuminate\Http\JsonResponse;

class ApproveCompanyController extends Controller
{
    public function __invoke(ApproveCompanyRequest $request, Company $company): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! $user->is_superadmin) {
            return response()->json([
                'success' => false,
                'message' => 'Only superadmin can approve/reject companies.',
            ], 403);
        }

        $action = $request->string('action')->toString();

        if ($action === 'reject') {
            $company->forceFill([
                'is_active' => false,
                'approval_status' => 'rejected',
            ])->save();

            return response()->json([
                'success' => true,
                'message' => 'Company rejected successfully.',
                'data' => [
                    'company' => [
                        'id' => $company->id,
                        'name' => $company->name,
                        'legal_name' => $company->legal_name,
                        'is_active' => (bool) $company->is_active,
                        'approval_status' => $company->approval_status,
                    ],
                ],
            ]);
        }

        $company->forceFill([
            'is_active' => true,
            'approval_status' => 'approved',
        ])->save();

        if ($request->boolean('verify_proofs', true)) {
            File::query()
                ->where('company_id', $company->id)
                ->where('category', 'company_proof')
                ->where('is_verified', false)
                ->update([
                    'is_verified' => true,
                    'verified_at' => now(),
                    'verified_by_user_id' => $user->id,
                    'updated_at' => now(),
                ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Company approved successfully.',
            'data' => [
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'legal_name' => $company->legal_name,
                    'is_active' => (bool) $company->is_active,
                    'approval_status' => $company->approval_status,
                ],
            ],
        ]);
    }
}
