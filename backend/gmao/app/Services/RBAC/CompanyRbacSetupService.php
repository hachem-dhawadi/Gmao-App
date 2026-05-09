<?php

namespace App\Services\RBAC;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;

class CompanyRbacSetupService
{
    /**
     * Ensure base permissions and company-scoped roles exist.
     *
     * @return array<string, Role>
     */
    public function bootstrapForCompany(Company $company): array
    {
        $permissions = $this->ensurePermissions();

        $roles = [
            'admin' => Role::query()->firstOrCreate(
                ['company_id' => $company->id, 'code' => 'admin'],
                ['label' => 'Administrator', 'sort_order' => 1, 'is_system' => true]
            ),
            'hr' => Role::query()->firstOrCreate(
                ['company_id' => $company->id, 'code' => 'hr'],
                ['label' => 'HR', 'sort_order' => 2, 'is_system' => true]
            ),
            'manager' => Role::query()->firstOrCreate(
                ['company_id' => $company->id, 'code' => 'manager'],
                ['label' => 'Manager', 'sort_order' => 3, 'is_system' => true]
            ),
            'technician' => Role::query()->firstOrCreate(
                ['company_id' => $company->id, 'code' => 'technician'],
                ['label' => 'Technician', 'sort_order' => 4, 'is_system' => true]
            ),
        ];

        $rolePermissions = [
            'admin' => array_keys($permissions),
            'hr' => [
                'companies.read',
                'members.read',
                'members.create',
                'members.update',
                'members.delete',
                'members.assign_roles',
                'departments.read',
                'departments.create',
                'departments.update',
                'roles.read',
                'notifications.read',
            ],
            'manager' => [
                'companies.read',
                'members.read',
                'departments.read',
                'roles.read',
                'assets.read',
                'assets.write',
                'work_orders.read',
                'work_orders.write',
                'inventory.read',
                'inventory.write',
                'purchasing.read',
                'notifications.read',
            ],
            'technician' => [
                'assets.read',
                'work_orders.read',
                'work_orders.write',
                'inventory.read',
                'files.read',
                'files.write',
                'chat.read',
                'chat.write',
                'notifications.read',
            ],
        ];

        foreach ($roles as $code => $role) {
            $permissionIds = collect($rolePermissions[$code])
                ->map(fn (string $permissionCode): int => $permissions[$permissionCode]->id)
                ->all();

            $role->permissions()->sync($permissionIds);
        }

        return $roles;
    }

    /**
     * @return array<string, Permission>
     */
    private function ensurePermissions(): array
    {
        $permissionMap = [
            'companies.read' => 'Read companies',
            'members.read' => 'Read members',
            'members.create' => 'Create members',
            'members.update' => 'Update members',
            'members.delete' => 'Delete members',
            'members.assign_roles' => 'Assign member roles',
            'roles.read' => 'Read roles',
            'roles.write' => 'Manage roles',
            'departments.read' => 'Read departments',
            'departments.create' => 'Create departments',
            'departments.update' => 'Update departments',
            'departments.delete' => 'Delete departments',
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
            'superadmin.approve_companies' => 'Approve companies as superadmin',
        ];

        $permissions = [];

        foreach ($permissionMap as $code => $label) {
            $permissions[$code] = Permission::query()->firstOrCreate(
                ['code' => $code],
                ['label' => $label]
            );
        }

        return $permissions;
    }
}
