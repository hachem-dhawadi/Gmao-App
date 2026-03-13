<?php

namespace App\Http\Controllers\Api\V1\Companies;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Companies\StoreOwnerCompanyRequest;
use App\Http\Requests\Api\V1\Companies\UpdateOwnerCompanyRequest;
use App\Models\Company;
use App\Models\File;
use App\Models\Member;
use App\Models\User;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
        $logoPath = $request->file('logo')?->store('company-logos', 'public');

        /** @var array<int, UploadedFile> $proofFiles */
        $proofFiles = $request->file('proof_files', []);

        [$company, $ownerMember] = DB::transaction(function () use ($validated, $logoPath, $proofFiles, $user, $rbacSetupService): array {
            $company = Company::query()->create([
                'name' => $validated['name'],
                'legal_name' => $validated['legal_name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'address_line1' => $validated['address_line1'],
                'address_line2' => $validated['address_line2'] ?? null,
                'city' => $validated['city'],
                'postal_code' => $validated['postal_code'],
                'country' => $validated['country'],
                'logo_path' => $logoPath,
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

            $this->createProofFileRecords($company->id, $user->id, $proofFiles);

            return [$company, $ownerMember];
        });

        return response()->json([
            'success' => true,
            'message' => 'Company created successfully and sent for superadmin approval.',
            'data' => [
                'company' => $this->transformCompany($company),
                'owner_member' => [
                    'id' => $ownerMember->id,
                    'company_id' => $ownerMember->company_id,
                    'user_id' => $ownerMember->user_id,
                    'status' => $ownerMember->status,
                ],
            ],
        ], 201);
    }

    public function update(UpdateOwnerCompanyRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $companyId = $request->header('X-Company-Id');

        $membershipQuery = Member::query()
            ->with('company')
            ->where('user_id', $user->id);

        if (is_string($companyId) && ctype_digit($companyId)) {
            $membershipQuery->where('company_id', (int) $companyId);
        }

        $membership = $membershipQuery->first();

        if (! $membership && is_string($companyId) && ctype_digit($companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a member of the selected company.',
            ], 403);
        }

        if (! $membership) {
            $membership = Member::query()
                ->with('company')
                ->where('user_id', $user->id)
                ->first();
        }

        if (! $membership || ! $membership->company) {
            return response()->json([
                'success' => false,
                'message' => 'No owned company found. Create your company first.',
            ], 422);
        }

        $validated = $request->validated();
        $company = $membership->company;

        if (! $company->logo_path && ! $request->hasFile('logo')) {
            return response()->json([
                'success' => false,
                'message' => 'Company logo is required.',
            ], 422);
        }

        /** @var array<int, UploadedFile>|null $proofFiles */
        $proofFiles = $request->hasFile('proof_files')
            ? $request->file('proof_files', [])
            : null;

        $previousLogoPath = $company->logo_path;
        $newLogoPath = $request->hasFile('logo')
            ? $request->file('logo')?->store('company-logos', 'public')
            : null;

        DB::transaction(function () use ($validated, $company, $newLogoPath, $previousLogoPath, $proofFiles, $user): void {
            $company->update([
                'name' => $validated['name'],
                'legal_name' => $validated['legal_name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'address_line1' => $validated['address_line1'],
                'address_line2' => $validated['address_line2'] ?? null,
                'city' => $validated['city'],
                'postal_code' => $validated['postal_code'],
                'country' => $validated['country'],
                'logo_path' => $newLogoPath ?? $company->logo_path,
                'timezone' => $validated['timezone'] ?? $company->timezone,
            ]);

            if ($newLogoPath && $previousLogoPath && $previousLogoPath !== $newLogoPath) {
                Storage::disk('public')->delete($previousLogoPath);
            }

            if ($proofFiles !== null) {
                $this->replaceCompanyProofFiles($company, $user->id, $proofFiles);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Company updated successfully.',
            'data' => [
                'company' => $this->transformCompany($company->fresh()),
            ],
        ]);
    }

    /**
     * @param  array<int, UploadedFile>  $proofFiles
     */
    private function createProofFileRecords(int $companyId, int $uploadedByUserId, array $proofFiles): void
    {
        foreach ($proofFiles as $proofFile) {
            $storedPath = $proofFile->store('company-proofs/'.$companyId, 'local');

            File::query()->create([
                'company_id' => $companyId,
                'uploaded_by_user_id' => $uploadedByUserId,
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
    }

    /**
     * @param  array<int, UploadedFile>  $proofFiles
     */
    private function replaceCompanyProofFiles(Company $company, int $uploadedByUserId, array $proofFiles): void
    {
        $existingProofFiles = File::query()
            ->where('company_id', $company->id)
            ->where('category', 'company_proof')
            ->get(['id', 'file_path']);

        foreach ($existingProofFiles as $existingProofFile) {
            if ($existingProofFile->file_path) {
                Storage::disk('local')->delete($existingProofFile->file_path);
            }
        }

        File::query()
            ->where('company_id', $company->id)
            ->where('category', 'company_proof')
            ->delete();

        $this->createProofFileRecords($company->id, $uploadedByUserId, $proofFiles);
    }

    private function transformCompany(Company $company): array
    {
        return [
            'id' => $company->id,
            'name' => $company->name,
            'legal_name' => $company->legal_name,
            'phone' => $company->phone,
            'email' => $company->email,
            'address_line1' => $company->address_line1,
            'address_line2' => $company->address_line2,
            'city' => $company->city,
            'postal_code' => $company->postal_code,
            'country' => $company->country,
            'logo_path' => $company->logo_path,
            'logo_url' => $company->logo_path ? Storage::disk('public')->url($company->logo_path) : null,
            'timezone' => $company->timezone,
            'is_active' => (bool) $company->is_active,
            'approval_status' => $company->approval_status,
            'proof_files' => $this->transformCompanyProofFiles($company->id),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function transformCompanyProofFiles(int $companyId): array
    {
        return File::query()
            ->where('company_id', $companyId)
            ->where('category', 'company_proof')
            ->orderByDesc('id')
            ->get(['id', 'original_name', 'mime_type', 'size_bytes', 'is_verified', 'created_at'])
            ->map(static fn (File $file): array => [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'is_verified' => (bool) $file->is_verified,
                'created_at' => $file->created_at,
            ])
            ->values()
            ->all();
    }
}
