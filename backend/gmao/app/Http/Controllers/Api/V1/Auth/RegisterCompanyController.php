<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\RegisterCompanyRequest;
use App\Http\Resources\Api\V1\Auth\AuthUserResource;
use App\Models\Company;
use App\Models\File;
use App\Models\Member;
use App\Models\User;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class RegisterCompanyController extends Controller
{
    public function __invoke(RegisterCompanyRequest $request, CompanyRbacSetupService $rbacSetupService): JsonResponse
    {
        $validated = $request->validated();
        $deviceName = $validated['device_name'] ?? 'api-client';

        [$owner, $company] = DB::transaction(function () use ($validated, $request, $rbacSetupService): array {
            $company = Company::query()->create([
                'name' => $validated['company_name'],
                'legal_name' => $validated['company_legal_name'] ?? null,
                'phone' => $validated['company_phone'] ?? null,
                'email' => $validated['company_email'] ?? null,
                'address_line1' => $validated['company_address_line1'] ?? null,
                'address_line2' => $validated['company_address_line2'] ?? null,
                'city' => $validated['company_city'] ?? null,
                'postal_code' => $validated['company_postal_code'] ?? null,
                'country' => $validated['company_country'] ?? null,
                'timezone' => $validated['company_timezone'],
                'is_active' => false,
            ]);

            $owner = User::query()->create([
                'name' => $validated['owner_name'],
                'email' => $validated['owner_email'],
                'password' => $validated['owner_password'],
                'phone' => $validated['owner_phone'],
                'is_active' => true,
                'is_superadmin' => false,
            ]);

            $ownerMember = Member::query()->create([
                'company_id' => $company->id,
                'user_id' => $owner->id,
                'status' => 'active',
                'job_title' => 'Owner',
            ]);

            $roles = $rbacSetupService->bootstrapForCompany($company);
            $ownerMember->roles()->syncWithoutDetaching([$roles['admin']->id]);

            /** @var array<int, UploadedFile> $proofFiles */
            $proofFiles = $request->file('proof_files', []);

            foreach ($proofFiles as $proofFile) {
                $storedPath = $proofFile->store('company-proofs/'.$company->id, 'local');

                File::query()->create([
                    'company_id' => $company->id,
                    'uploaded_by_user_id' => $owner->id,
                    'category' => 'company_proof',
                    'asset_id' => null,
                    'work_order_id' => null,
                    'item_id' => null,
                    'file_path' => $storedPath,
                    'original_name' => $proofFile->getClientOriginalName(),
                    'mime_type' => $proofFile->getClientMimeType() ?: 'application/octet-stream',
                    'size_bytes' => $proofFile->getSize(),
                    'checksum' => hash_file('sha256', $proofFile->getRealPath()),
                    'is_verified' => false,
                ]);
            }

            return [$owner, $company];
        });

        $token = $owner->createToken($deviceName)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Company registration submitted successfully. Your company is pending superadmin approval.',
            'data' => [
                'user' => AuthUserResource::make($owner)->resolve(),
                'company' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'legal_name' => $company->legal_name,
                    'is_active' => (bool) $company->is_active,
                ],
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 201);
    }
}
