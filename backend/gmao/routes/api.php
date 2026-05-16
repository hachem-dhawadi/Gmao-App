<?php

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Companies\ApproveCompanyController;
use App\Http\Controllers\Api\V1\Companies\OwnerCompanyController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Assets\AssetController;
use App\Http\Controllers\Api\V1\Roles\RoleController;
use App\Http\Controllers\Api\V1\Assets\AssetTypeController;
use App\Http\Controllers\Api\V1\Departments\DepartmentController;
use App\Http\Controllers\Api\V1\Members\MemberController;
use App\Http\Controllers\Api\V1\WorkOrders\WorkOrderController;
use App\Http\Controllers\Api\V1\WorkOrders\WorkLogController;
use App\Http\Controllers\Api\V1\Inventory\ItemController;
use App\Http\Controllers\Api\V1\Inventory\WarehouseController;
use App\Http\Controllers\Api\V1\Inventory\StockMoveController;
use App\Http\Controllers\Api\V1\Dashboard\DashboardController;
use App\Http\Controllers\Api\V1\Pm\PmPlanController;
use App\Http\Controllers\Api\V1\Superadmin\CompanyController as SuperadminCompanyController;
use App\Http\Controllers\Api\V1\Superadmin\CompanyMemberController as SuperadminCompanyMemberController;
use App\Http\Controllers\Api\V1\Superadmin\UserController as SuperadminUserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class);

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', RegisterController::class);
        Route::post('/login', LoginController::class);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', [LoginController::class, 'logout']);
            Route::get('/me', [LoginController::class, 'me']);
            Route::patch('/me', [LoginController::class, 'updateProfile']);
            Route::patch('/password', [LoginController::class, 'updatePassword']);
        });
    });

    Route::middleware('auth:sanctum')->prefix('companies')->group(function (): void {
        Route::post('/', [OwnerCompanyController::class, 'store']);
        Route::patch('/current', [OwnerCompanyController::class, 'update']);
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('departments')->group(function (): void {
        Route::get('/', [DepartmentController::class, 'index'])->middleware('permission:departments.read');
        Route::get('/{department}', [DepartmentController::class, 'show'])->middleware('permission:departments.read');
        Route::post('/', [DepartmentController::class, 'store'])->middleware('permission:departments.create');
        Route::patch('/{department}', [DepartmentController::class, 'update'])->middleware('permission:departments.update');
        Route::delete('/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:departments.delete');
    });

    Route::middleware('auth:sanctum')->get('/asset-types', [AssetTypeController::class, 'index']);

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('roles')->group(function (): void {
        Route::get('/', [RoleController::class, 'index'])->middleware('permission:roles.read');
        Route::post('/', [RoleController::class, 'store'])->middleware('permission:roles.write');
        Route::patch('/{role}', [RoleController::class, 'update'])->middleware('permission:roles.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('assets')->group(function (): void {
        Route::get('/', [AssetController::class, 'index'])->middleware('permission:assets.read');
        Route::get('/{asset}', [AssetController::class, 'show'])->middleware('permission:assets.read');
        Route::post('/', [AssetController::class, 'store'])->middleware('permission:assets.write');
        Route::patch('/{asset}', [AssetController::class, 'update'])->middleware('permission:assets.write');
        Route::delete('/{asset}', [AssetController::class, 'destroy'])->middleware('permission:assets.delete');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('members')->group(function (): void {
        Route::get('/', [MemberController::class, 'index'])->middleware('permission:members.read');
        Route::get('/{member}', [MemberController::class, 'show'])->middleware('permission:members.read');
        Route::post('/', [MemberController::class, 'store'])->middleware('permission:members.create');
        Route::patch('/{member}', [MemberController::class, 'update'])->middleware('permission:members.update');
        Route::delete('/{member}', [MemberController::class, 'destroy'])->middleware('permission:members.delete');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('work-orders')->group(function (): void {
        Route::get('/', [WorkOrderController::class, 'index'])->middleware('permission:work_orders.read');
        Route::get('/{workOrder}', [WorkOrderController::class, 'show'])->middleware('permission:work_orders.read');
        Route::post('/', [WorkOrderController::class, 'store'])->middleware('permission:work_orders.write');
        Route::patch('/{workOrder}', [WorkOrderController::class, 'update'])->middleware('permission:work_orders.write');
        Route::delete('/{workOrder}', [WorkOrderController::class, 'destroy'])->middleware('permission:work_orders.delete');

        // Comments
        Route::post('/{workOrder}/comments', [WorkOrderController::class, 'addComment'])->middleware('permission:work_orders.write');
        Route::delete('/{workOrder}/comments/{comment}', [WorkOrderController::class, 'deleteComment'])->middleware('permission:work_orders.write');

        // Attachments
        Route::post('/{workOrder}/attachments', [WorkOrderController::class, 'addAttachment'])->middleware('permission:work_orders.write');
        Route::get('/{workOrder}/attachments/{attachment}/download', [WorkOrderController::class, 'downloadAttachment'])->middleware('permission:work_orders.read');
        Route::delete('/{workOrder}/attachments/{attachment}', [WorkOrderController::class, 'deleteAttachment'])->middleware('permission:work_orders.write');

        // Work Logs
        Route::get('/{workOrder}/work-logs', [WorkLogController::class, 'index'])->middleware('permission:work_orders.read');
        Route::post('/{workOrder}/work-logs', [WorkLogController::class, 'store'])->middleware('permission:work_orders.write');
        Route::patch('/{workOrder}/work-logs/{workLog}', [WorkLogController::class, 'update'])->middleware('permission:work_orders.write');
        Route::delete('/{workOrder}/work-logs/{workLog}', [WorkLogController::class, 'destroy'])->middleware('permission:work_orders.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('inventory/items')->group(function (): void {
        Route::get('/', [ItemController::class, 'index'])->middleware('permission:inventory.read');
        Route::get('/{item}', [ItemController::class, 'show'])->middleware('permission:inventory.read');
        Route::post('/', [ItemController::class, 'store'])->middleware('permission:inventory.write');
        Route::patch('/{item}', [ItemController::class, 'update'])->middleware('permission:inventory.write');
        Route::delete('/{item}', [ItemController::class, 'destroy'])->middleware('permission:inventory.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('inventory/warehouses')->group(function (): void {
        Route::get('/', [WarehouseController::class, 'index'])->middleware('permission:inventory.read');
        Route::get('/{warehouse}', [WarehouseController::class, 'show'])->middleware('permission:inventory.read');
        Route::post('/', [WarehouseController::class, 'store'])->middleware('permission:inventory.write');
        Route::patch('/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:inventory.write');
        Route::delete('/{warehouse}', [WarehouseController::class, 'destroy'])->middleware('permission:inventory.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('inventory/stock-moves')->group(function (): void {
        Route::get('/', [StockMoveController::class, 'index'])->middleware('permission:inventory.read');
        Route::post('/', [StockMoveController::class, 'store'])->middleware('permission:inventory.write');
        Route::delete('/{stockMove}', [StockMoveController::class, 'destroy'])->middleware('permission:inventory.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('dashboard')->group(function (): void {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/my', [DashboardController::class, 'my']);
        Route::get('/hr', [DashboardController::class, 'hr']);
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('pm/plans')->group(function (): void {
        Route::get('/', [PmPlanController::class, 'index'])->middleware('permission:pm_plans.read');
        Route::get('/{pmPlan}', [PmPlanController::class, 'show'])->middleware('permission:pm_plans.read');
        Route::post('/', [PmPlanController::class, 'store'])->middleware('permission:pm_plans.write');
        Route::patch('/{pmPlan}', [PmPlanController::class, 'update'])->middleware('permission:pm_plans.write');
        Route::delete('/{pmPlan}', [PmPlanController::class, 'destroy'])->middleware('permission:pm_plans.delete');
    });

    Route::middleware(['auth:sanctum', 'superadmin'])->prefix('superadmin')->group(function (): void {
        Route::get('/users', [SuperadminUserController::class, 'index']);
        Route::post('/users', [SuperadminUserController::class, 'store']);
        Route::get('/users/{user}', [SuperadminUserController::class, 'show']);
        Route::patch('/users/{user}', [SuperadminUserController::class, 'update']);
        Route::delete('/users/{user}', [SuperadminUserController::class, 'destroy']);

        Route::get('/stats', [SuperadminCompanyController::class, 'stats']);
        Route::get('/companies', [SuperadminCompanyController::class, 'index']);
        Route::post('/companies', [SuperadminCompanyController::class, 'store']);
        Route::get('/companies/{company}', [SuperadminCompanyController::class, 'show']);
        Route::patch('/companies/{company}', [SuperadminCompanyController::class, 'update']);
        Route::delete('/companies/{company}', [SuperadminCompanyController::class, 'destroy']);
        Route::post('/companies/{company}/approve', ApproveCompanyController::class);

        Route::get('/companies/{company}/members', [SuperadminCompanyMemberController::class, 'index']);
        Route::post('/companies/{company}/members', [SuperadminCompanyMemberController::class, 'store']);
        Route::get('/companies/{company}/members/{member}', [SuperadminCompanyMemberController::class, 'show']);
        Route::patch('/companies/{company}/members/{member}', [SuperadminCompanyMemberController::class, 'update']);
        Route::delete('/companies/{company}/members/{member}', [SuperadminCompanyMemberController::class, 'destroy']);
    });
});

