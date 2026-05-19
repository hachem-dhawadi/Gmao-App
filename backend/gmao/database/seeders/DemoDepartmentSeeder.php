<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Department;
use Illuminate\Database\Seeder;

/**
 * Seeds a realistic industrial department hierarchy per company.
 * Run: php artisan db:seed --class=DemoDepartmentSeeder
 */
class DemoDepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::query()
            ->where('approval_status', 'approved')
            ->where('is_active', true)
            ->get();

        if ($companies->isEmpty()) {
            $this->command->warn('No approved active companies found.');
            return;
        }

        foreach ($companies as $company) {
            $this->seedForCompany($company->id, $company->name);
        }
    }

    private function seedForCompany(int $companyId, string $companyName): void
    {
        // ── Top-level departments ───────────────────────────────────────────────
        $maintenance = $this->dept($companyId, null, 'MAINT', 'Maintenance',
            'Responsible for all preventive and corrective maintenance of equipment and facilities.');

        $production = $this->dept($companyId, null, 'PROD', 'Production',
            'Manages all manufacturing and production activities across lines.');

        $this->dept($companyId, null, 'QC', 'Quality Control',
            'Ensures product quality, compliance, and continuous improvement.');

        $this->dept($companyId, null, 'LOG', 'Warehouse & Logistics',
            'Handles receiving, storage, inventory control, and dispatch.');

        $this->dept($companyId, null, 'HSE', 'Health, Safety & Environment',
            'Enforces safety standards, conducts audits, and manages environmental compliance.');

        $this->dept($companyId, null, 'ADMIN', 'Administration',
            'General administration, finance support, and office management.');

        $hr = $this->dept($companyId, null, 'HR', 'Human Resources',
            'Recruitment, onboarding, training, and employee relations.');

        $this->dept($companyId, null, 'IT', 'Information Technology',
            'Manages IT infrastructure, SCADA systems, network, and user support.');

        $this->dept($companyId, null, 'PURCH', 'Purchasing',
            'Supplier management, purchase orders, and procurement planning.');

        // ── Maintenance sub-departments ─────────────────────────────────────────
        $this->dept($companyId, $maintenance->id, 'MAINT-MECH', 'Mechanical Maintenance',
            'Mechanical repairs, rotating equipment, piping, and structural work.');

        $this->dept($companyId, $maintenance->id, 'MAINT-ELEC', 'Electrical Maintenance',
            'Electrical panels, motors, wiring, and instrumentation support.');

        $this->dept($companyId, $maintenance->id, 'MAINT-INST', 'Instrumentation & Control',
            'Calibration, PLC/SCADA maintenance, sensors, and control loops.');

        $this->dept($companyId, $maintenance->id, 'MAINT-UTIL', 'Utilities Maintenance',
            'Boilers, HVAC, compressed air, and water treatment systems.');

        // ── Production sub-departments ──────────────────────────────────────────
        $this->dept($companyId, $production->id, 'PROD-L1', 'Production Line 1',
            'Operates and oversees all activities on production line 1.');

        $this->dept($companyId, $production->id, 'PROD-L2', 'Production Line 2',
            'Operates and oversees all activities on production line 2.');

        $this->dept($companyId, $production->id, 'PROD-PKG', 'Packaging',
            'Packaging, labelling, and palletising finished goods.');

        // ── HR sub-departments ──────────────────────────────────────────────────
        $this->dept($companyId, $hr->id, 'HR-TRAIN', 'Training & Development',
            'Manages employee training programs, certifications, and skills development.');

        $count = Department::query()->where('company_id', $companyId)->count();
        $this->command->info("Seeded departments for: {$companyName} — {$count} departments");
    }

    private function dept(
        int $companyId,
        ?int $parentId,
        string $code,
        string $name,
        ?string $description,
    ): Department {
        return Department::query()->firstOrCreate(
            ['company_id' => $companyId, 'code' => $code],
            [
                'parent_department_id' => $parentId,
                'name'                 => $name,
                'description'          => $description,
            ],
        );
    }
}
