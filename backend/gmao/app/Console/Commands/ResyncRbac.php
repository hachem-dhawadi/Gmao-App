<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\RBAC\CompanyRbacSetupService;
use Illuminate\Console\Command;

class ResyncRbac extends Command
{
    protected $signature   = 'rbac:resync {--company= : Resync a specific company by ID}';
    protected $description = 'Resync permissions and role assignments for all companies (or a specific one)';

    public function handle(CompanyRbacSetupService $service): int
    {
        $companyId = $this->option('company');

        $query = Company::query();
        if ($companyId) {
            $query->where('id', $companyId);
        }

        $companies = $query->get();

        if ($companies->isEmpty()) {
            $this->warn('No companies found.');
            return self::SUCCESS;
        }

        foreach ($companies as $company) {
            $this->info("Syncing company [{$company->id}] {$company->name} ...");
            $service->bootstrapForCompany($company);
        }

        $this->info('Done. All roles re-synced with latest permissions.');
        return self::SUCCESS;
    }
}
