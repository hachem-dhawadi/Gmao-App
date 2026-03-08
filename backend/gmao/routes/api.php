<?php

use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\RegisterCompanyController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Companies\ApproveCompanyController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Members\MemberController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class);

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', RegisterController::class);
        Route::post('/register-company', RegisterCompanyController::class);
        Route::post('/login', LoginController::class);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', [LoginController::class, 'logout']);
            Route::get('/me', [LoginController::class, 'me'])->middleware('company.context');
        });
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('members')->group(function (): void {
        Route::get('/', [MemberController::class, 'index'])->middleware('permission:members.read');
        Route::get('/{member}', [MemberController::class, 'show'])->middleware('permission:members.read');
        Route::post('/', [MemberController::class, 'store'])->middleware('permission:members.create');
        Route::patch('/{member}', [MemberController::class, 'update'])->middleware('permission:members.update');
        Route::delete('/{member}', [MemberController::class, 'destroy'])->middleware('permission:members.delete');
    });

    Route::middleware('auth:sanctum')
        ->post('/superadmin/companies/{company}/approve', ApproveCompanyController::class);
});
