<?php

namespace App\Providers;

use App\Models\Asset;
use App\Models\PurchaseOrder;
use App\Models\WorkOrder;
use App\Policies\AssetPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\WorkOrderPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Asset::class => AssetPolicy::class,
        WorkOrder::class => WorkOrderPolicy::class,
        PurchaseOrder::class => PurchaseOrderPolicy::class,
    ];

    /**
     * Register services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}
