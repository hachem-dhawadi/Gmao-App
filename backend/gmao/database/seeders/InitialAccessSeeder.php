<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Member;
use App\Models\User;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialAccessSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rbacSetupService = app(CompanyRbacSetupService::class);

        User::query()->updateOrCreate(
            ['email' => 'superadmin@gmao.test'],
            [
                'name' => 'Platform Superadmin',
                'password' => Hash::make('SuperAdmin123!'),
                'phone' => '+21699999999',
                'locale' => 'fr',
                'two_factor_enabled' => false,
                'is_active' => true,
                'is_superadmin' => true,
            ]
        );

        $company = Company::query()->firstOrCreate(
            ['name' => 'Demo Company'],
            [
                'legal_name' => 'Demo Company SARL',
                'phone' => '+21600000000',
                'email' => 'contact@demo-company.test',
                'timezone' => 'Africa/Tunis',
                'is_active' => true,
                'approval_status' => 'approved',
            ]
        );

        if (! $company->is_active || $company->approval_status !== 'approved') {
            $company->forceFill([
                'is_active' => true,
                'approval_status' => 'approved',
            ])->save();
        }

        $roles = $rbacSetupService->bootstrapForCompany($company);

        $adminUser = User::query()->updateOrCreate(
            ['email' => 'admin@gmao.test'],
            [
                'name' => 'Company Owner',
                'password' => Hash::make('Admin123!'),
                'phone' => '+21611111111',
                'locale' => 'fr',
                'two_factor_enabled' => false,
                'is_active' => true,
                'is_superadmin' => false,
            ]
        );

        $adminMember = Member::query()->firstOrCreate(
            [
                'company_id' => $company->id,
                'user_id' => $adminUser->id,
            ],
            [
                'employee_code' => 'ADM-001',
                'job_title' => 'Owner',
                'status' => 'active',
            ]
        );

        $adminMember->roles()->syncWithoutDetaching([$roles['admin']->id]);

        $hrUser = User::query()->updateOrCreate(
            ['email' => 'hr@gmao.test'],
            [
                'name' => 'HR Manager',
                'password' => Hash::make('Hr123456!'),
                'phone' => '+21622222222',
                'locale' => 'fr',
                'two_factor_enabled' => false,
                'is_active' => true,
                'is_superadmin' => false,
            ]
        );

        $hrMember = Member::query()->firstOrCreate(
            [
                'company_id' => $company->id,
                'user_id' => $hrUser->id,
            ],
            [
                'employee_code' => 'HR-001',
                'job_title' => 'HR',
                'status' => 'active',
            ]
        );

        $hrMember->roles()->syncWithoutDetaching([$roles['hr']->id]);
    }
}
