<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Member;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialAccessSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $company = Company::query()->firstOrCreate(
            ['name' => 'Demo Company'],
            [
                'legal_name' => 'Demo Company SARL',
                'phone' => '+21600000000',
                'email' => 'contact@demo-company.test',
                'timezone' => 'Africa/Tunis',
                'is_active' => true,
            ]
        );

        $adminUser = User::query()->updateOrCreate(
            ['email' => 'admin@gmao.test'],
            [
                'name' => 'GMAO Admin',
                'password' => Hash::make('Admin123!'),
                'phone' => '+21611111111',
                'locale' => 'fr',
                'two_factor_enabled' => false,
                'is_active' => true,
            ]
        );

        $adminMember = Member::query()->firstOrCreate(
            [
                'company_id' => $company->id,
                'user_id' => $adminUser->id,
            ],
            [
                'employee_code' => 'ADM-001',
                'job_title' => 'Administrator',
                'status' => 'active',
            ]
        );

        $adminRole = Role::query()->firstOrCreate(
            [
                'company_id' => $company->id,
                'code' => 'admin',
            ],
            [
                'label' => 'Administrator',
                'sort_order' => 1,
                'is_system' => true,
            ]
        );

        $managerRole = Role::query()->firstOrCreate(
            [
                'company_id' => $company->id,
                'code' => 'manager',
            ],
            [
                'label' => 'Manager',
                'sort_order' => 2,
                'is_system' => true,
            ]
        );

        $technicianRole = Role::query()->firstOrCreate(
            [
                'company_id' => $company->id,
                'code' => 'technician',
            ],
            [
                'label' => 'Technician',
                'sort_order' => 3,
                'is_system' => true,
            ]
        );

        $permissionMap = [
            'companies.read' => 'Read companies',
            'members.read' => 'Read members',
            'members.write' => 'Manage members',
            'roles.read' => 'Read roles',
            'roles.write' => 'Manage roles',
            'assets.read' => 'Read assets',
            'assets.write' => 'Manage assets',
            'work_orders.read' => 'Read work orders',
            'work_orders.write' => 'Manage work orders',
            'inventory.read' => 'Read inventory',
            'inventory.write' => 'Manage inventory',
            'purchasing.read' => 'Read purchasing',
            'purchasing.write' => 'Manage purchasing',
            'files.read' => 'Read files',
            'files.write' => 'Manage files',
            'chat.read' => 'Read chat',
            'chat.write' => 'Manage chat',
            'notifications.read' => 'Read notifications',
        ];

        $permissionIds = collect($permissionMap)
            ->map(function (string $label, string $code): int {
                return Permission::query()->firstOrCreate(
                    ['code' => $code],
                    ['label' => $label]
                )->id;
            })
            ->values();

        $adminRole->permissions()->sync($permissionIds->all());

        $managerRole->permissions()->sync(
            Permission::query()
                ->whereIn('code', [
                    'companies.read',
                    'members.read',
                    'roles.read',
                    'assets.read',
                    'assets.write',
                    'work_orders.read',
                    'work_orders.write',
                    'inventory.read',
                    'inventory.write',
                    'purchasing.read',
                    'notifications.read',
                ])
                ->pluck('id')
                ->all()
        );

        $technicianRole->permissions()->sync(
            Permission::query()
                ->whereIn('code', [
                    'assets.read',
                    'work_orders.read',
                    'work_orders.write',
                    'inventory.read',
                    'files.read',
                    'files.write',
                    'chat.read',
                    'chat.write',
                    'notifications.read',
                ])
                ->pluck('id')
                ->all()
        );

        $adminMember->roles()->syncWithoutDetaching([$adminRole->id]);
    }
}

