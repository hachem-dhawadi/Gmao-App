<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Member;
use App\Models\User;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds realistic technician/manager members into approved companies.
 * Run: php artisan db:seed --class=DemoWorkOrderMembersSeeder
 */
class DemoWorkOrderMembersSeeder extends Seeder
{
    private int $phoneCounter = 50000000;

    private array $people = [
        ['name' => 'Ahmed Ben Salah',    'role' => 'manager',    'title' => 'Operations Manager'],
        ['name' => 'Leila Mansouri',     'role' => 'manager',    'title' => 'Maintenance Manager'],
        ['name' => 'Karim Trabelsi',     'role' => 'technician', 'title' => 'Senior Technician'],
        ['name' => 'Fatma Riahi',        'role' => 'technician', 'title' => 'Electrical Technician'],
        ['name' => 'Yassine Chaabane',   'role' => 'technician', 'title' => 'Mechanical Technician'],
        ['name' => 'Sonia Jebali',       'role' => 'technician', 'title' => 'HVAC Technician'],
        ['name' => 'Mohamed Belhaj',     'role' => 'technician', 'title' => 'Plumbing Technician'],
        ['name' => 'Amira Oueslati',     'role' => 'hr',         'title' => 'HR Coordinator'],
    ];

    public function run(): void
    {
        $rbacSetupService = app(CompanyRbacSetupService::class);

        $companies = Company::query()
            ->where('approval_status', 'approved')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No approved active companies found.');
            return;
        }

        foreach ($companies as $company) {
            $roles = $rbacSetupService->bootstrapForCompany($company);

            foreach ($this->people as $index => $person) {
                $slug  = Str::slug($person['name'], '.');
                $email = "{$slug}@{$company->id}.demo.test";

                $user = User::query()->updateOrCreate(
                    ['email' => $email],
                    [
                        'name'               => $person['name'],
                        'phone'              => '+216' . (++$this->phoneCounter),
                        'avatar_path'        => 'avatars/default-user.png',
                        'locale'             => 'en',
                        'two_factor_enabled' => false,
                        'is_active'          => true,
                        'is_superadmin'      => false,
                        'password'           => Hash::make('Password123!'),
                        'email_verified_at'  => now(),
                        'remember_token'     => Str::random(10),
                    ]
                );

                $member = Member::query()->firstOrNew([
                    'company_id' => $company->id,
                    'user_id'    => $user->id,
                ]);

                $member->fill([
                    'employee_code' => 'DEMO-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                    'job_title'     => $person['title'],
                    'status'        => 'active',
                    'hired_at'      => now()->subMonths(rand(3, 24))->toDateString(),
                ])->save();

                $roleKey = $person['role'];
                if (isset($roles[$roleKey])) {
                    $member->roles()->syncWithoutDetaching([$roles[$roleKey]->id]);
                }
            }

            $this->command->info("Seeded " . count($this->people) . " members for: {$company->name}");
        }
    }
}
