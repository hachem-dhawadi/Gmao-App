<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Database\Seeder;

/**
 * Re-syncs all company roles with the current permission definitions.
 * Run whenever permissions change: php artisan db:seed --class=RefreshCompanyRbacSeeder
 */
class RefreshCompanyRbacSeeder extends Seeder
{
    public function run(): void
    {
        $rbacSetupService = app(CompanyRbacSetupService::class);

        $companies = Company::all();

        foreach ($companies as $company) {
            $rbacSetupService->bootstrapForCompany($company);
            $this->command->info("Refreshed RBAC for: {$company->name}");
        }

        $this->command->info('Done. All company roles re-synced.');
    }
}
