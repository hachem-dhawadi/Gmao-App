<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoFileManagerSeeder extends Seeder
{
    public function run(): void
    {
        $company = DB::table('companies')->where('name', 'Demo Company')->first();
        if (! $company) {
            $this->command->warn('Demo Company not found.');
            return;
        }

        $cid = $company->id;

        // Member IDs to rotate through for realistic authorship
        $members = DB::table('members')->where('company_id', $cid)->pluck('id')->toArray();
        if (empty($members)) {
            $this->command->warn('No members found.');
            return;
        }

        $m = fn(int $i) => $members[$i % count($members)];

        // ── 1. Fetch existing root folders ──────────────────────────────────
        $existing = DB::table('fm_directories')
            ->where('company_id', $cid)
            ->whereNull('parent_id')
            ->pluck('id', 'name');

        $safetyId  = $existing['Safety & Compliance'] ?? null;
        $photosId  = $existing['Photos & Site Images'] ?? null;
        $procId    = $existing['Maintenance Procedures'] ?? null;
        $reportsId = $existing['Reports'] ?? null;

        // ── 2. New root-level folders ────────────────────────────────────────
        $newRoots = [
            'Training Materials'      => $m(0),
            'Contracts & Warranties'  => $m(1),
            'Spare Parts Catalog'     => $m(2),
            'Project Documentation'   => $m(3),
        ];

        $rootIds = [];
        foreach ($newRoots as $name => $memberId) {
            if ($existing->has($name)) {
                $rootIds[$name] = $existing[$name];
                continue;
            }
            $rootIds[$name] = DB::table('fm_directories')->insertGetId([
                'company_id'           => $cid,
                'created_by_member_id' => $memberId,
                'parent_id'            => null,
                'name'                 => $name,
                'created_at'           => now()->subDays(rand(30, 90)),
                'updated_at'           => now()->subDays(rand(1, 29)),
            ]);
        }

        // ── 3. Sub-folders ───────────────────────────────────────────────────
        $subFolders = [];

        // Training Materials
        foreach (['Video Tutorials', 'Presentations', 'Operator Manuals', 'Certification Programs'] as $i => $name) {
            $subFolders["training_$i"] = $this->mkdir($cid, $rootIds['Training Materials'], $name, $m($i));
        }

        // Contracts & Warranties
        foreach (['Vendor Contracts', 'Equipment Warranties', 'Service Level Agreements', 'Insurance Documents'] as $i => $name) {
            $subFolders["contracts_$i"] = $this->mkdir($cid, $rootIds['Contracts & Warranties'], $name, $m($i + 1));
        }

        // Spare Parts Catalog
        foreach (['Electrical Components', 'Mechanical Parts', 'Hydraulic & Pneumatic', 'Consumables'] as $i => $name) {
            $subFolders["parts_$i"] = $this->mkdir($cid, $rootIds['Spare Parts Catalog'], $name, $m($i + 2));
        }

        // Project Documentation
        foreach (['As-Built Drawings', 'Commissioning Reports', 'Change Orders', 'Meeting Minutes'] as $i => $name) {
            $subFolders["project_$i"] = $this->mkdir($cid, $rootIds['Project Documentation'], $name, $m($i));
        }

        // Safety & Compliance sub-folders (if root exists)
        if ($safetyId) {
            foreach (['SDS / MSDS Sheets', 'Risk Assessments', 'Training Records', 'Audit Reports', 'Permits & Certificates'] as $i => $name) {
                $subFolders["safety_$i"] = $this->mkdir($cid, $safetyId, $name, $m($i + 3));
            }
        }

        // Photos & Site Images sub-folders (if root exists)
        if ($photosId) {
            foreach (['Site A — North Plant', 'Site B — South Warehouse', 'Before & After', 'Drone Surveys', 'Equipment Condition'] as $i => $name) {
                $subFolders["photos_$i"] = $this->mkdir($cid, $photosId, $name, $m($i));
            }
        }

        // Maintenance Procedures — additional sub-folder (if root exists)
        if ($procId) {
            $this->mkdir($cid, $procId, 'Lubrication Schedules', $m(2));
            $this->mkdir($cid, $procId, 'Calibration Procedures', $m(3));
        }

        // Reports — additional sub-folder (if root exists)
        if ($reportsId) {
            $this->mkdir($cid, $reportsId, 'Annual Reports', $m(1));
            $this->mkdir($cid, $reportsId, 'KPI Dashboards', $m(4));
        }

        // ── 4. Files ─────────────────────────────────────────────────────────
        $files = [];

        // --- Training Materials / Video Tutorials ---
        $tid = $subFolders['training_0'] ?? null;
        if ($tid) {
            $files = array_merge($files, [
                [$cid, $tid, $m(0), 'Forklift Safety Training — Module 1.mp4',   "file-manager/training/forklift_safety_m1.mp4",   'video/mp4',       245_000_000],
                [$cid, $tid, $m(1), 'Confined Space Entry — Safety Video.mp4',   "file-manager/training/confined_space_entry.mp4", 'video/mp4',       189_000_000],
                [$cid, $tid, $m(2), 'Arc Flash Awareness Training.mp4',           "file-manager/training/arc_flash_awareness.mp4",  'video/mp4',       312_000_000],
                [$cid, $tid, $m(3), 'LOTO Refresher 2025.mp4',                   "file-manager/training/loto_refresher_2025.mp4",  'video/mp4',       134_000_000],
            ]);
        }

        // --- Training Materials / Presentations ---
        $tid2 = $subFolders['training_1'] ?? null;
        if ($tid2) {
            $files = array_merge($files, [
                [$cid, $tid2, $m(1), 'New Employee Onboarding — Maintenance Dept.pptx', "file-manager/training/onboarding_maintenance.pptx", 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 4_200_000],
                [$cid, $tid2, $m(2), 'Annual Safety Day — Presentation 2025.pptx',       "file-manager/training/safety_day_2025.pptx",         'application/vnd.openxmlformats-officedocument.presentationml.presentation', 6_800_000],
                [$cid, $tid2, $m(3), 'CMMS Overview for Technicians.pptx',               "file-manager/training/cmms_overview_techs.pptx",     'application/vnd.openxmlformats-officedocument.presentationml.presentation', 3_100_000],
                [$cid, $tid2, $m(4), 'Root Cause Analysis Methodology.pptx',             "file-manager/training/rca_methodology.pptx",         'application/vnd.openxmlformats-officedocument.presentationml.presentation', 5_600_000],
            ]);
        }

        // --- Training Materials / Operator Manuals ---
        $tid3 = $subFolders['training_2'] ?? null;
        if ($tid3) {
            $files = array_merge($files, [
                [$cid, $tid3, $m(0), 'Hydraulic Press — Operator Manual.pdf',     "file-manager/training/hydraulic_press_ops.pdf",    'application/pdf', 8_200_000],
                [$cid, $tid3, $m(1), 'CNC Machine Tool — User Guide.pdf',         "file-manager/training/cnc_user_guide.pdf",         'application/pdf', 12_400_000],
                [$cid, $tid3, $m(2), 'Conveyor System — Operator Handbook.pdf',   "file-manager/training/conveyor_handbook.pdf",      'application/pdf', 6_700_000],
                [$cid, $tid3, $m(3), 'Cooling Tower — Operating Procedures.pdf',  "file-manager/training/cooling_tower_ops.pdf",      'application/pdf', 5_100_000],
                [$cid, $tid3, $m(0), 'Air Compressor — Quick Reference Card.pdf', "file-manager/training/air_compressor_qrc.pdf",     'application/pdf', 1_200_000],
            ]);
        }

        // --- Training Materials / Certification Programs ---
        $tid4 = $subFolders['training_3'] ?? null;
        if ($tid4) {
            $files = array_merge($files, [
                [$cid, $tid4, $m(1), 'ISO 55001 Asset Management — Study Guide.pdf',   "file-manager/training/iso55001_study_guide.pdf",   'application/pdf', 9_800_000],
                [$cid, $tid4, $m(2), 'Certified Maintenance Manager (CMM) Prep.pdf',   "file-manager/training/cmm_prep_guide.pdf",         'application/pdf', 7_500_000],
                [$cid, $tid4, $m(3), 'Vibration Analysis Level I — Course Notes.pdf',  "file-manager/training/vibration_analysis_l1.pdf",  'application/pdf', 4_300_000],
                [$cid, $tid4, $m(4), 'Thermography Certification Checklist.xlsx',      "file-manager/training/thermography_checklist.xlsx",'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 280_000],
            ]);
        }

        // --- Contracts & Warranties / Vendor Contracts ---
        $cid1 = $subFolders['contracts_0'] ?? null;
        if ($cid1) {
            $files = array_merge($files, [
                [$cid, $cid1, $m(0), 'Siemens — Preventive Maintenance Contract 2025.pdf',   "file-manager/contracts/siemens_pm_contract_2025.pdf",   'application/pdf', 3_400_000],
                [$cid, $cid1, $m(1), 'Schneider Electric — Service Agreement.pdf',           "file-manager/contracts/schneider_service_agreement.pdf", 'application/pdf', 2_800_000],
                [$cid, $cid1, $m(2), 'ABB Robotics — Annual Maintenance Contract.pdf',       "file-manager/contracts/abb_annual_contract.pdf",         'application/pdf', 4_100_000],
                [$cid, $cid1, $m(3), 'Parts Supply Agreement — Industrial Supplies Co.docx', "file-manager/contracts/parts_supply_agreement.docx",     'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 890_000],
                [$cid, $cid1, $m(4), 'Cleaning & Janitorial Services Contract.pdf',          "file-manager/contracts/cleaning_services_contract.pdf",  'application/pdf', 1_600_000],
            ]);
        }

        // --- Contracts & Warranties / Equipment Warranties ---
        $cid2 = $subFolders['contracts_1'] ?? null;
        if ($cid2) {
            $files = array_merge($files, [
                [$cid, $cid2, $m(0), 'Compressor Unit #1 — Warranty Certificate.pdf',     "file-manager/warranties/compressor_1_warranty.pdf",    'application/pdf', 1_200_000],
                [$cid, $cid2, $m(1), 'Hydraulic Press Line A — Warranty Document.pdf',   "file-manager/warranties/hydraulic_press_a_warranty.pdf",'application/pdf', 1_500_000],
                [$cid, $cid2, $m(2), 'HVAC Unit Rooftop — Extended Warranty.pdf',        "file-manager/warranties/hvac_rooftop_warranty.pdf",    'application/pdf', 980_000],
                [$cid, $cid2, $m(3), 'Warranty Tracker — All Equipment 2025.xlsx',       "file-manager/warranties/warranty_tracker_2025.xlsx",   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 420_000],
                [$cid, $cid2, $m(4), 'Generator Backup — 5-Year Warranty.pdf',           "file-manager/warranties/generator_5yr_warranty.pdf",   'application/pdf', 1_100_000],
            ]);
        }

        // --- Contracts & Warranties / Service Level Agreements ---
        $cid3 = $subFolders['contracts_2'] ?? null;
        if ($cid3) {
            $files = array_merge($files, [
                [$cid, $cid3, $m(1), 'IT Infrastructure SLA — Response Times.pdf',       "file-manager/sla/it_infrastructure_sla.pdf",      'application/pdf', 2_100_000],
                [$cid, $cid3, $m(2), 'HVAC Maintenance SLA — 2025.pdf',                  "file-manager/sla/hvac_maintenance_sla_2025.pdf",  'application/pdf', 1_800_000],
                [$cid, $cid3, $m(3), 'Critical Equipment SLA Matrix.xlsx',               "file-manager/sla/sla_matrix.xlsx",                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 350_000],
            ]);
        }

        // --- Spare Parts Catalog / Electrical Components ---
        $pid1 = $subFolders['parts_0'] ?? null;
        if ($pid1) {
            $files = array_merge($files, [
                [$cid, $pid1, $m(2), 'Electrical Parts Catalog — Q1 2025.xlsx',         "file-manager/parts/electrical_catalog_q1_2025.xlsx",   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1_800_000],
                [$cid, $pid1, $m(3), 'Motor Spare Parts List — All Lines.xlsx',         "file-manager/parts/motor_spare_parts.xlsx",            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 980_000],
                [$cid, $pid1, $m(4), 'PLC Modules & I/O Cards Reference.pdf',           "file-manager/parts/plc_modules_reference.pdf",        'application/pdf', 4_600_000],
                [$cid, $pid1, $m(0), 'Circuit Breaker Compatibility Chart.pdf',         "file-manager/parts/circuit_breaker_chart.pdf",        'application/pdf', 2_200_000],
                [$cid, $pid1, $m(1), 'Sensor & Transducer Cross-Reference.xlsx',        "file-manager/parts/sensor_cross_reference.xlsx",      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 620_000],
            ]);
        }

        // --- Spare Parts Catalog / Mechanical Parts ---
        $pid2 = $subFolders['parts_1'] ?? null;
        if ($pid2) {
            $files = array_merge($files, [
                [$cid, $pid2, $m(3), 'Bearing Specifications Catalog.pdf',              "file-manager/parts/bearing_catalog.pdf",               'application/pdf', 6_400_000],
                [$cid, $pid2, $m(4), 'Belt & Chain Drive Reference Guide.pdf',          "file-manager/parts/belt_chain_reference.pdf",         'application/pdf', 3_800_000],
                [$cid, $pid2, $m(0), 'Mechanical Seals — Pump Applications.xlsx',      "file-manager/parts/mechanical_seals_pumps.xlsx",      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 760_000],
                [$cid, $pid2, $m(1), 'Gearbox Spare Parts — OEM List.xlsx',            "file-manager/parts/gearbox_oem_parts.xlsx",           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 540_000],
                [$cid, $pid2, $m(2), 'Coupling & Shaft Alignment Tolerances.pdf',      "file-manager/parts/coupling_alignment_tol.pdf",       'application/pdf', 2_900_000],
            ]);
        }

        // --- Spare Parts Catalog / Hydraulic & Pneumatic ---
        $pid3 = $subFolders['parts_2'] ?? null;
        if ($pid3) {
            $files = array_merge($files, [
                [$cid, $pid3, $m(0), 'Hydraulic Hose & Fitting Specifications.pdf',    "file-manager/parts/hydraulic_hoses.pdf",              'application/pdf', 5_100_000],
                [$cid, $pid3, $m(1), 'Pneumatic Valve Catalog — Parker Series.pdf',   "file-manager/parts/parker_pneumatic_catalog.pdf",    'application/pdf', 8_700_000],
                [$cid, $pid3, $m(2), 'Hydraulic Fluid Compatibility Chart.xlsx',       "file-manager/parts/hydraulic_fluid_compat.xlsx",     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 290_000],
                [$cid, $pid3, $m(3), 'O-Ring & Seal Sizing Guide.pdf',                "file-manager/parts/oring_seal_sizing.pdf",           'application/pdf', 3_300_000],
            ]);
        }

        // --- Spare Parts Catalog / Consumables ---
        $pid4 = $subFolders['parts_3'] ?? null;
        if ($pid4) {
            $files = array_merge($files, [
                [$cid, $pid4, $m(4), 'Lubricants & Greases Selection Guide.pdf',       "file-manager/parts/lubricants_guide.pdf",            'application/pdf', 4_200_000],
                [$cid, $pid4, $m(0), 'Filter Replacements — All Equipment.xlsx',       "file-manager/parts/filter_replacements.xlsx",        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 490_000],
                [$cid, $pid4, $m(1), 'Consumables Monthly Usage Report.xlsx',          "file-manager/parts/consumables_usage.xlsx",          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 730_000],
                [$cid, $pid4, $m(2), 'Abrasives & Cleaning Supplies Catalog.pdf',      "file-manager/parts/abrasives_catalog.pdf",           'application/pdf', 2_600_000],
            ]);
        }

        // --- Project Documentation / As-Built Drawings ---
        $prj1 = $subFolders['project_0'] ?? null;
        if ($prj1) {
            $files = array_merge($files, [
                [$cid, $prj1, $m(0), 'North Plant — Electrical Layout As-Built.pdf',   "file-manager/project/north_plant_elec_asbuilt.pdf",  'application/pdf', 18_400_000],
                [$cid, $prj1, $m(1), 'South Warehouse — Piping & Instrumentation.pdf', "file-manager/project/south_wh_p&id.pdf",             'application/pdf', 21_200_000],
                [$cid, $prj1, $m(2), 'HVAC Ducting — Rooftop Layout.pdf',              "file-manager/project/hvac_rooftop_layout.pdf",       'application/pdf', 9_600_000],
                [$cid, $prj1, $m(3), 'Compressed Air Network — Floor Plan.pdf',        "file-manager/project/compressed_air_layout.pdf",     'application/pdf', 7_800_000],
            ]);
        }

        // --- Project Documentation / Commissioning Reports ---
        $prj2 = $subFolders['project_1'] ?? null;
        if ($prj2) {
            $files = array_merge($files, [
                [$cid, $prj2, $m(1), 'Line 3 Commissioning Report — 2024.pdf',          "file-manager/project/line3_commissioning_2024.pdf",  'application/pdf', 11_500_000],
                [$cid, $prj2, $m(2), 'New Boiler Installation — Commissioning Sign-off.pdf', "file-manager/project/boiler_commissioning.pdf", 'application/pdf', 6_300_000],
                [$cid, $prj2, $m(3), 'Commissioning Punch List — Phase 2.xlsx',         "file-manager/project/commissioning_punchlist.xlsx",  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 890_000],
            ]);
        }

        // --- Project Documentation / Meeting Minutes ---
        $prj4 = $subFolders['project_3'] ?? null;
        if ($prj4) {
            $files = array_merge($files, [
                [$cid, $prj4, $m(0), 'Q2 Maintenance Review Meeting — Minutes.docx',    "file-manager/project/q2_review_minutes.docx",        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 780_000],
                [$cid, $prj4, $m(1), 'Safety Committee Meeting — June 2025.docx',        "file-manager/project/safety_committee_jun2025.docx", 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 650_000],
                [$cid, $prj4, $m(2), 'Asset Lifecycle Planning Meeting — Q3.docx',       "file-manager/project/asset_lifecycle_q3.docx",       'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 920_000],
                [$cid, $prj4, $m(3), 'Corrective Maintenance Backlog Review.docx',       "file-manager/project/cm_backlog_review.docx",        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 560_000],
            ]);
        }

        // --- Safety & Compliance / SDS Sheets ---
        $safety1 = $subFolders['safety_0'] ?? null;
        if ($safety1) {
            $files = array_merge($files, [
                [$cid, $safety1, $m(2), 'SDS — Hydraulic Oil ISO 46.pdf',                "file-manager/safety/sds_hydraulic_oil_46.pdf",       'application/pdf', 1_900_000],
                [$cid, $safety1, $m(3), 'SDS — Grease NLGI Grade 2.pdf',                 "file-manager/safety/sds_grease_nlgi2.pdf",           'application/pdf', 1_400_000],
                [$cid, $safety1, $m(4), 'SDS — Cleaning Solvent IPA.pdf',                "file-manager/safety/sds_ipa_solvent.pdf",            'application/pdf', 1_600_000],
                [$cid, $safety1, $m(0), 'SDS — Compressed Nitrogen Gas.pdf',             "file-manager/safety/sds_nitrogen_gas.pdf",           'application/pdf', 1_200_000],
                [$cid, $safety1, $m(1), 'SDS — Penetrating Oil WD-40.pdf',               "file-manager/safety/sds_wd40.pdf",                   'application/pdf', 1_100_000],
                [$cid, $safety1, $m(2), 'SDS — Battery Acid H2SO4.pdf',                  "file-manager/safety/sds_battery_acid.pdf",           'application/pdf', 1_800_000],
                [$cid, $safety1, $m(3), 'MSDS Master Index — All Chemicals.xlsx',        "file-manager/safety/msds_master_index.xlsx",         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 580_000],
            ]);
        }

        // --- Safety & Compliance / Risk Assessments ---
        $safety2 = $subFolders['safety_1'] ?? null;
        if ($safety2) {
            $files = array_merge($files, [
                [$cid, $safety2, $m(1), 'Working at Heights — Risk Assessment.pdf',     "file-manager/safety/risk_working_at_heights.pdf",    'application/pdf', 2_800_000],
                [$cid, $safety2, $m(2), 'Confined Space Entry — Risk Register.pdf',     "file-manager/safety/risk_confined_space.pdf",        'application/pdf', 3_100_000],
                [$cid, $safety2, $m(3), 'Hot Work Permit — Risk Assessment Form.pdf',   "file-manager/safety/risk_hot_work_permit.pdf",       'application/pdf', 1_900_000],
                [$cid, $safety2, $m(4), 'Electrical Isolation Risk Matrix.xlsx',        "file-manager/safety/risk_electrical_isolation.xlsx", 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 460_000],
                [$cid, $safety2, $m(0), 'Chemical Handling Risk Assessment.pdf',        "file-manager/safety/risk_chemical_handling.pdf",     'application/pdf', 2_400_000],
            ]);
        }

        // --- Safety & Compliance / Training Records ---
        $safety3 = $subFolders['safety_2'] ?? null;
        if ($safety3) {
            $files = array_merge($files, [
                [$cid, $safety3, $m(0), 'Staff Training Matrix — 2025.xlsx',            "file-manager/safety/training_matrix_2025.xlsx",      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1_200_000],
                [$cid, $safety3, $m(1), 'LOTO Training Completion Register.xlsx',       "file-manager/safety/loto_training_register.xlsx",    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 780_000],
                [$cid, $safety3, $m(2), 'First Aid Certification — Team Records.pdf',   "file-manager/safety/first_aid_certifications.pdf",   'application/pdf', 4_200_000],
                [$cid, $safety3, $m(3), 'Fire Warden Training Records — H1 2025.pdf',   "file-manager/safety/fire_warden_records_h1.pdf",     'application/pdf', 2_100_000],
            ]);
        }

        // --- Safety & Compliance / Audit Reports ---
        $safety4 = $subFolders['safety_3'] ?? null;
        if ($safety4) {
            $files = array_merge($files, [
                [$cid, $safety4, $m(4), 'Internal Safety Audit — Q1 2025 Report.pdf',  "file-manager/safety/internal_audit_q1_2025.pdf",     'application/pdf', 6_800_000],
                [$cid, $safety4, $m(0), 'ISO 45001 External Audit — Findings.pdf',     "file-manager/safety/iso45001_audit_findings.pdf",    'application/pdf', 9_200_000],
                [$cid, $safety4, $m(1), 'HSE Corrective Action Plan — 2025.xlsx',      "file-manager/safety/hse_corrective_action.xlsx",     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 890_000],
                [$cid, $safety4, $m(2), 'Near-Miss Incident Register — 2025.xlsx',     "file-manager/safety/near_miss_register_2025.xlsx",   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 560_000],
            ]);
        }

        // --- Safety & Compliance / Permits & Certificates ---
        $safety5 = $subFolders['safety_4'] ?? null;
        if ($safety5) {
            $files = array_merge($files, [
                [$cid, $safety5, $m(3), 'Operating License — Pressure Vessels.pdf',    "file-manager/safety/license_pressure_vessels.pdf",   'application/pdf', 2_300_000],
                [$cid, $safety5, $m(4), 'Electrical Installation Certificate 2025.pdf', "file-manager/safety/elec_install_cert_2025.pdf",    'application/pdf', 1_800_000],
                [$cid, $safety5, $m(0), 'Crane & Lifting Equipment Inspection.pdf',    "file-manager/safety/crane_inspection_cert.pdf",      'application/pdf', 2_600_000],
                [$cid, $safety5, $m(1), 'Environmental Compliance Permit.pdf',         "file-manager/safety/env_compliance_permit.pdf",      'application/pdf', 3_100_000],
            ]);
        }

        // --- Photos & Site Images ---
        $photos1 = $subFolders['photos_0'] ?? null;
        if ($photos1) {
            foreach ([
                'North Plant Overview — Jan 2025.jpg', 'Compressor Room — Before Overhaul.jpg',
                'Electrical Panel Bay 4.jpg', 'Cooling Tower — Inspection Jan 2025.jpg',
            ] as $i => $name) {
                $files[] = [$cid, $photos1, $m($i), $name, "file-manager/photos/north_plant_$i.jpg", 'image/jpeg', rand(2_000_000, 6_000_000)];
            }
        }

        $photos2 = $subFolders['photos_1'] ?? null;
        if ($photos2) {
            foreach ([
                'South Warehouse — Loading Dock.jpg', 'Forklift Fleet — Parking Area.jpg',
                'Racking System Inspection.jpg', 'Fire Suppression System.jpg',
            ] as $i => $name) {
                $files[] = [$cid, $photos2, $m($i + 1), $name, "file-manager/photos/south_wh_$i.jpg", 'image/jpeg', rand(2_000_000, 5_000_000)];
            }
        }

        $photos3 = $subFolders['photos_2'] ?? null;
        if ($photos3) {
            foreach ([
                'Pump #3 Before Rebuild.jpg', 'Pump #3 After Rebuild.jpg',
                'Gearbox Line 2 — Before.jpg', 'Gearbox Line 2 — After.jpg',
                'Conveyor Belt Replacement — Before.jpg', 'Conveyor Belt Replacement — After.jpg',
            ] as $i => $name) {
                $files[] = [$cid, $photos3, $m($i % 4), $name, "file-manager/photos/before_after_$i.jpg", 'image/jpeg', rand(1_500_000, 4_500_000)];
            }
        }

        $photos5 = $subFolders['photos_4'] ?? null;
        if ($photos5) {
            foreach ([
                'Boiler Unit — Thermal Image.jpg', 'Motor Bearing — Vibration Scan.png',
                'Electrical Cabinet — IR Scan 2025.jpg', 'Hydraulic Leak Detection — UV.jpg',
            ] as $i => $name) {
                $ext = str_ends_with($name, '.png') ? 'image/png' : 'image/jpeg';
                $files[] = [$cid, $photos5, $m($i), $name, "file-manager/photos/condition_$i.".(str_ends_with($name, '.png') ? 'png' : 'jpg'), $ext, rand(3_000_000, 8_000_000)];
            }
        }

        // ── 5. Insert all files ──────────────────────────────────────────────
        $now = now();
        $inserted = 0;
        foreach ($files as [$companyId, $dirId, $memberId, $originalName, $storedPath, $mimeType, $sizeBytes]) {
            $exists = DB::table('fm_files')
                ->where('company_id', $companyId)
                ->where('fm_directory_id', $dirId)
                ->where('original_name', $originalName)
                ->exists();

            if ($exists) continue;

            DB::table('fm_files')->insert([
                'company_id'             => $companyId,
                'fm_directory_id'        => $dirId,
                'uploaded_by_member_id'  => $memberId,
                'original_name'          => $originalName,
                'stored_path'            => $storedPath,
                'mime_type'              => $mimeType,
                'size_bytes'             => $sizeBytes,
                'created_at'             => now()->subDays(rand(1, 120)),
                'updated_at'             => now()->subDays(rand(0, 10)),
            ]);
            $inserted++;
        }

        $totalDirs  = DB::table('fm_directories')->where('company_id', $cid)->count();
        $totalFiles = DB::table('fm_files')->where('company_id', $cid)->count();

        $this->command->info("File Manager seeded: {$inserted} files inserted | Total: {$totalDirs} dirs, {$totalFiles} files");
    }

    private function mkdir(int $cid, int $parentId, string $name, int $memberId): int
    {
        $existing = DB::table('fm_directories')
            ->where('company_id', $cid)
            ->where('parent_id', $parentId)
            ->where('name', $name)
            ->value('id');

        if ($existing) return $existing;

        return DB::table('fm_directories')->insertGetId([
            'company_id'           => $cid,
            'created_by_member_id' => $memberId,
            'parent_id'            => $parentId,
            'name'                 => $name,
            'created_at'           => now()->subDays(rand(10, 90)),
            'updated_at'           => now()->subDays(rand(0, 9)),
        ]);
    }
}
