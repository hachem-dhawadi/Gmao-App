<?php

namespace Database\Seeders;

use App\Models\AssetType;
use Illuminate\Database\Seeder;

class AssetTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Pump',             'code' => 'PUMP'],
            ['name' => 'Motor',            'code' => 'MOTOR'],
            ['name' => 'HVAC',             'code' => 'HVAC'],
            ['name' => 'Compressor',       'code' => 'COMP'],
            ['name' => 'Generator',        'code' => 'GEN'],
            ['name' => 'Electrical Panel', 'code' => 'ELEC'],
            ['name' => 'Conveyor',         'code' => 'CONV'],
            ['name' => 'Vehicle',          'code' => 'VEH'],
            ['name' => 'Boiler',           'code' => 'BOIL'],
            ['name' => 'Computer',         'code' => 'IT'],
            ['name' => 'Other',            'code' => 'OTHER'],
        ];

        foreach ($types as $type) {
            AssetType::query()->firstOrCreate(
                ['code' => $type['code']],
                ['name' => $type['name']],
            );
        }
    }
}
