<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Member;
use App\Models\User;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoCompaniesUsersSeeder extends Seeder
{
    private int $phoneCounter = 30000000;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = fake();
        $rbacSetupService = app(CompanyRbacSetupService::class);

        for ($companyIndex = 1; $companyIndex <= 8; $companyIndex++) {
            $companyName = sprintf('Seed Company %02d', $companyIndex);
            $approvalStatus = $this->approvalStatusFor($companyIndex);
            $isActive = $approvalStatus === 'approved' && $companyIndex % 3 !== 0;
            $timezone = $this->timezoneFor($companyIndex);

            $company = Company::query()->updateOrCreate(
                ['name' => $companyName],
                [
                    'legal_name' => $companyName.' SARL',
                    'phone' => $this->nextPhone(),
                    'email' => sprintf('contact%02d@seed-company.test', $companyIndex),
                    'address_line1' => sprintf('%d Industrial Avenue', 100 + $companyIndex),
                    'address_line2' => sprintf('Building %d', $companyIndex),
                    'city' => $faker->city(),
                    'postal_code' => (string) $faker->numerify('#####'),
                    'country' => $faker->country(),
                    'logo_path' => sprintf('company-logos/seed-company-%02d.png', $companyIndex),
                    'settings_json' => json_encode([
                        'currency' => 'TND',
                        'language' => $companyIndex % 2 === 0 ? 'fr' : 'en',
                        'maintenance_window' => 'sunday-02:00',
                    ], JSON_THROW_ON_ERROR),
                    'timezone' => $timezone,
                    'is_active' => $isActive,
                    'approval_status' => $approvalStatus,
                ]
            );

            $roles = $rbacSetupService->bootstrapForCompany($company);

            $ownerUser = $this->upsertUser(
                email: sprintf('owner%02d@seed-company.test', $companyIndex),
                name: sprintf('Owner %02d', $companyIndex),
                locale: $companyIndex % 2 === 0 ? 'fr' : 'en',
                isSuperadmin: false,
            );

            $ownerMember = $this->upsertMember(
                company: $company,
                user: $ownerUser,
                employeeCode: sprintf('OWN-%02d-001', $companyIndex),
                jobTitle: 'Owner',
                managerMemberId: null,
                status: 'active',
                hiredAt: now()->subYears(2)->toDateString(),
            );
            $ownerMember->roles()->syncWithoutDetaching([$roles['admin']->id]);

            $roleCycle = ['hr', 'manager', 'technician', 'technician', 'manager', 'hr'];

            for ($memberIndex = 1; $memberIndex <= 6; $memberIndex++) {
                $roleCode = $roleCycle[$memberIndex - 1];
                $user = $this->upsertUser(
                    email: sprintf('user%02d_%02d@seed-company.test', $companyIndex, $memberIndex),
                    name: sprintf('User %02d-%02d', $companyIndex, $memberIndex),
                    locale: $memberIndex % 2 === 0 ? 'fr' : 'en',
                    isSuperadmin: false,
                );

                $status = $memberIndex === 6 ? 'inactive' : 'active';
                $jobTitle = match ($roleCode) {
                    'hr' => 'HR Specialist',
                    'manager' => 'Operations Manager',
                    default => 'Technician',
                };

                $member = $this->upsertMember(
                    company: $company,
                    user: $user,
                    employeeCode: sprintf('EMP-%02d-%03d', $companyIndex, $memberIndex),
                    jobTitle: $jobTitle,
                    managerMemberId: $ownerMember->id,
                    status: $status,
                    hiredAt: now()->subMonths(6 + $memberIndex)->toDateString(),
                );

                if (isset($roles[$roleCode])) {
                    $member->roles()->syncWithoutDetaching([$roles[$roleCode]->id]);
                }
            }
        }
    }

    private function approvalStatusFor(int $companyIndex): string
    {
        return match ($companyIndex % 4) {
            0 => 'rejected',
            1 => 'pending',
            default => 'approved',
        };
    }

    private function timezoneFor(int $companyIndex): string
    {
        $timezones = [
            'Africa/Tunis',
            'Europe/Paris',
            'Europe/London',
            'America/New_York',
            'Asia/Dubai',
        ];

        return $timezones[($companyIndex - 1) % count($timezones)];
    }

    private function nextPhone(): string
    {
        $this->phoneCounter++;

        return '+216'.$this->phoneCounter;
    }

    private function upsertUser(
        string $email,
        string $name,
        string $locale,
        bool $isSuperadmin,
    ): User {
        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'phone' => $this->nextPhone(),
                'avatar_path' => 'avatars/default-user.png',
                'locale' => $locale,
                'two_factor_enabled' => false,
                'is_active' => true,
                'is_superadmin' => $isSuperadmin,
                'last_login_at' => now()->subDays(random_int(0, 30)),
                'password' => Hash::make('Password123!'),
            ]
        );

        $user->forceFill([
            'email_verified_at' => now()->subDays(random_int(0, 45)),
            'remember_token' => Str::random(10),
        ])->save();

        return $user;
    }

    private function upsertMember(
        Company $company,
        User $user,
        string $employeeCode,
        string $jobTitle,
        ?int $managerMemberId,
        string $status,
        ?string $hiredAt,
    ): Member {
        $member = Member::query()->firstOrNew([
            'company_id' => $company->id,
            'user_id' => $user->id,
        ]);

        $member->fill([
            'employee_code' => $employeeCode,
            'job_title' => $jobTitle,
            'manager_member_id' => $managerMemberId,
            'status' => $status,
            'hired_at' => $hiredAt,
            'department_id' => null,
            'archived_at' => null,
            'archived_by_user_id' => null,
        ]);
        $member->save();

        return $member;
    }
}
