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

    Route::middleware(['auth:sanctum', 'company.context'])
        ->get('/roles', [RoleController::class, 'index'])
        ->middleware('permission:roles.read');

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

    Route::middleware(['auth:sanctum', 'superadmin'])->prefix('superadmin')->group(function (): void {
        Route::get('/users', [SuperadminUserController::class, 'index']);
        Route::post('/users', [SuperadminUserController::class, 'store']);
        Route::get('/users/{user}', [SuperadminUserController::class, 'show']);
        Route::patch('/users/{user}', [SuperadminUserController::class, 'update']);
        Route::delete('/users/{user}', [SuperadminUserController::class, 'destroy']);

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

