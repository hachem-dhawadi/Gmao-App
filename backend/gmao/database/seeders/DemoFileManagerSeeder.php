<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\FmDirectory;
use App\Models\FmFile;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Seeds a realistic File Manager structure with folders, documents, and images.
 * Run: php artisan db:seed --class=DemoFileManagerSeeder
 */
class DemoFileManagerSeeder extends Seeder
{
    // Minimal valid PDF content
    private function makePdf(string $title): string
    {
        $text = "GMAO - {$title}";
        return "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
             . "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
             . "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n"
             . "/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
             . "4 0 obj\n<< /Length " . (strlen($text) + 50) . " >>\nstream\n"
             . "BT /F1 16 Tf 72 720 Td ({$text}) Tj ET\n"
             . "BT /F1 11 Tf 72 680 Td (GMAO Platform - Confidential Document) Tj ET\n"
             . "endstream\nendobj\n"
             . "xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n"
             . "0000000115 00000 n\n0000000266 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n400\n%%EOF";
    }

    private function downloadImage(string $path, int $width, int $height, int $seed): bool
    {
        try {
            $response = Http::timeout(10)->get("https://picsum.photos/seed/{$seed}/{$width}/{$height}");
            if ($response->successful()) {
                Storage::disk('public')->put($path, $response->body());
                return true;
            }
        } catch (\Exception) {}
        return false;
    }

    private function storeFile(string $diskPath, string $content, bool $isBinary = false): void
    {
        if ($isBinary) {
            Storage::disk('public')->put($diskPath, $content);
        } else {
            Storage::disk('public')->put($diskPath, $content);
        }
    }

    public function run(): void
    {
        $companies = Company::where('approval_status', 'approved')->get();

        foreach ($companies as $company) {
            $members = Member::where('company_id', $company->id)
                ->where('status', 'active')
                ->get();

            if ($members->isEmpty()) continue;

            $uploader = $members->random();
            $baseDir  = "file-manager/{$company->id}";

            // ── Root folders ─────────────────────────────────────────────────

            $folders = [
                'Maintenance Procedures' => [
                    'Electrical Procedures',
                    'Mechanical Procedures',
                    'HVAC Procedures',
                ],
                'Equipment Manuals' => [
                    'Pumps & Compressors',
                    'Electrical Equipment',
                    'Production Machines',
                ],
                'Reports' => [
                    'Monthly Reports',
                    'Inspection Reports',
                ],
                'Safety & Compliance' => [],
                'Photos & Site Images' => [],
            ];

            $dirMap = [];

            foreach ($folders as $rootName => $subNames) {
                $root = FmDirectory::create([
                    'company_id'           => $company->id,
                    'created_by_member_id' => $uploader->id,
                    'parent_id'            => null,
                    'name'                 => $rootName,
                    'created_at'           => Carbon::now()->subDays(rand(30, 90)),
                    'updated_at'           => Carbon::now()->subDays(rand(1, 10)),
                ]);
                $dirMap[$rootName] = $root;

                foreach ($subNames as $subName) {
                    $sub = FmDirectory::create([
                        'company_id'           => $company->id,
                        'created_by_member_id' => $uploader->id,
                        'parent_id'            => $root->id,
                        'name'                 => $subName,
                        'created_at'           => Carbon::now()->subDays(rand(20, 80)),
                        'updated_at'           => Carbon::now()->subDays(rand(1, 10)),
                    ]);
                    $dirMap[$subName] = $sub;
                }
            }

            // ── Helper to create file record ──────────────────────────────────

            $mkFile = function (
                string $name,
                string $storedPath,
                string $mime,
                int    $sizeBytes,
                ?int   $dirId,
                int    $daysAgo = 10
            ) use ($company, $uploader) {
                FmFile::create([
                    'company_id'             => $company->id,
                    'fm_directory_id'        => $dirId,
                    'uploaded_by_member_id'  => $uploader->id,
                    'original_name'          => $name,
                    'stored_path'            => $storedPath,
                    'mime_type'              => $mime,
                    'size_bytes'             => $sizeBytes,
                    'created_at'             => Carbon::now()->subDays($daysAgo),
                    'updated_at'             => Carbon::now()->subDays(rand(0, 3)),
                ]);
            };

            // ── Electrical Procedures ─────────────────────────────────────────

            $elecDir = $dirMap['Electrical Procedures'] ?? null;

            $files = [
                ['Electrical Safety Procedure.pdf',     'electrical_safety.pdf'],
                ['Lockout Tagout (LOTO) Procedure.pdf', 'loto_procedure.pdf'],
                ['Cable Management Guidelines.pdf',     'cable_management.pdf'],
                ['Emergency Shutdown Procedure.pdf',    'emergency_shutdown.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $elecDir?->id, rand(5, 60));
            }

            // ── Mechanical Procedures ─────────────────────────────────────────

            $mechDir = $dirMap['Mechanical Procedures'] ?? null;

            $files = [
                ['Pump Maintenance Checklist.pdf',      'pump_maintenance.pdf'],
                ['Conveyor Belt Alignment Guide.pdf',   'conveyor_guide.pdf'],
                ['Gearbox Lubrication Schedule.pdf',    'gearbox_lube.pdf'],
                ['Hydraulic System Procedure.pdf',      'hydraulic_proc.pdf'],
                ['Bearing Replacement SOP.pdf',         'bearing_sop.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $mechDir?->id, rand(5, 60));
            }

            // ── HVAC Procedures ───────────────────────────────────────────────

            $hvacDir = $dirMap['HVAC Procedures'] ?? null;

            $files = [
                ['HVAC Filter Replacement Procedure.pdf', 'hvac_filter.pdf'],
                ['Cooling Tower Inspection Form.pdf',     'cooling_tower.pdf'],
                ['Refrigerant Handling Guidelines.pdf',   'refrigerant.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $hvacDir?->id, rand(5, 60));
            }

            // ── Equipment Manuals ─────────────────────────────────────────────

            $pumpDir = $dirMap['Pumps & Compressors'] ?? null;

            $files = [
                ['Grundfos CM5-6 User Manual.pdf',       'grundfos_manual.pdf'],
                ['Atlas Copco GA15 Compressor Manual.pdf','atlascopco_manual.pdf'],
                ['Parker Hydraulic Pump Datasheet.pdf',  'parker_datasheet.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $pumpDir?->id, rand(10, 90));
            }

            $elecEqDir = $dirMap['Electrical Equipment'] ?? null;

            $files = [
                ['Schneider Electric Panel Manual.pdf',  'schneider_manual.pdf'],
                ['Siemens PLC S7-1200 Manual.pdf',       'siemens_plc_manual.pdf'],
                ['ABB Motor Drive ACS580 Manual.pdf',    'abb_drive_manual.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $elecEqDir?->id, rand(10, 90));
            }

            // ── Monthly Reports ───────────────────────────────────────────────

            $monthlyDir = $dirMap['Monthly Reports'] ?? null;

            $months = [
                ['Maintenance Report – January 2026.pdf',  'report_jan2026.pdf'],
                ['Maintenance Report – February 2026.pdf', 'report_feb2026.pdf'],
                ['Maintenance Report – March 2026.pdf',    'report_mar2026.pdf'],
                ['Maintenance Report – April 2026.pdf',    'report_apr2026.pdf'],
                ['Maintenance Report – May 2026.pdf',      'report_may2026.pdf'],
            ];
            foreach ($months as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $monthlyDir?->id, rand(1, 90));
            }

            // ── Inspection Reports ────────────────────────────────────────────

            $inspDir = $dirMap['Inspection Reports'] ?? null;

            $files = [
                ['Annual Safety Inspection Report 2025.pdf', 'safety_insp_2025.pdf'],
                ['Fire System Inspection Q1 2026.pdf',       'fire_insp_q1.pdf'],
                ['Electrical Installation Audit 2025.pdf',   'elec_audit_2025.pdf'],
                ['Equipment Condition Assessment Q4 2025.pdf','cond_assess_q4.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $inspDir?->id, rand(5, 60));
            }

            // ── Safety & Compliance (root level) ──────────────────────────────

            $safetyDir = $dirMap['Safety & Compliance'] ?? null;

            $files = [
                ['Emergency Evacuation Plan.pdf',       'evacuation_plan.pdf'],
                ['Personal Protective Equipment SOP.pdf','ppe_sop.pdf'],
                ['Chemical Safety Data Sheet – Oil.pdf','sds_oil.pdf'],
                ['Incident Reporting Procedure.pdf',    'incident_report.pdf'],
                ['Risk Assessment Template 2026.pdf',   'risk_assessment.pdf'],
            ];
            foreach ($files as [$name, $fname]) {
                $path = "{$baseDir}/{$fname}";
                $content = $this->makePdf($name);
                Storage::disk('public')->put($path, $content);
                $mkFile($name, $path, 'application/pdf', strlen($content), $safetyDir?->id, rand(3, 60));
            }

            // ── Photos & Site Images ──────────────────────────────────────────

            $photoDir = $dirMap['Photos & Site Images'] ?? null;

            $photos = [
                ['Equipment Room Overview.jpg',     'photo_equip_room.jpg',   800, 600, 42],
                ['Production Hall Line 1.jpg',      'photo_prod_line1.jpg',   800, 600, 87],
                ['Workshop Bay 3.jpg',              'photo_workshop_bay3.jpg',800, 600, 133],
                ['Pump Room Installation.jpg',      'photo_pump_room.jpg',    800, 600, 211],
                ['HVAC Rooftop Unit.jpg',           'photo_hvac_roof.jpg',    800, 600, 356],
                ['Electrical Panel Room.jpg',       'photo_elec_panel.jpg',   800, 600, 478],
                ['Warehouse Storage Area.jpg',      'photo_warehouse.jpg',    800, 600, 512],
                ['Server Room Rack Setup.jpg',      'photo_server_room.jpg',  800, 600, 624],
            ];

            foreach ($photos as [$name, $fname, $w, $h, $seed]) {
                $path = "{$baseDir}/{$fname}";
                $downloaded = $this->downloadImage($path, $w, $h, $seed);
                $size = $downloaded
                    ? Storage::disk('public')->size($path)
                    : rand(150000, 800000);

                if (! $downloaded) {
                    // Fallback: store a small colored placeholder if download fails
                    Storage::disk('public')->put($path, base64_decode(
                        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH'
                        . 'BwYIDAoMCwsKCwsNCxAQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAAR'
                        . 'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA'
                        . 'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAA'
                        . 'AAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k='
                    ));
                }

                $mkFile($name, $path, 'image/jpeg', $size, $photoDir?->id, rand(1, 30));
            }

            $this->command->info("✅ File manager seeded for company: {$company->name}");
        }

        $this->command->info('✅ File Manager demo data seeded successfully.');
    }
}
