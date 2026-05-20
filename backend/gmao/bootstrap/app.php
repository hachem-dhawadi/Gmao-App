<?php

use App\Http\Middleware\EnsureCompanyContext;
use App\Http\Middleware\EnsureMemberHasPermission;
use App\Http\Middleware\EnsureSuperadmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'company.context' => EnsureCompanyContext::class,
            'permission' => EnsureMemberHasPermission::class,
            'superadmin' => EnsureSuperadmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON for API routes — prevents the framework from calling
        // route('login') (which doesn't exist) when an AuthenticationException occurs.
        $exceptions->shouldRenderJsonWhen(function ($request, \Throwable $e): bool {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
