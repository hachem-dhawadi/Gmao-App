<?php

use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\OtpController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\Companies\ApproveCompanyController;
use App\Http\Controllers\Api\V1\Companies\OwnerCompanyController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Assets\AssetController;
use App\Http\Controllers\Api\V1\Roles\RoleController;
use App\Http\Controllers\Api\V1\Assets\AssetTypeController;
use App\Http\Controllers\Api\V1\Departments\DepartmentController;
use App\Http\Controllers\Api\V1\Sites\SiteController;
use App\Http\Controllers\Api\V1\Members\MemberController;
use App\Http\Controllers\Api\V1\WorkOrders\WorkOrderController;
use App\Http\Controllers\Api\V1\WorkOrders\WorkLogController;
use App\Http\Controllers\Api\V1\WorkOrders\WoPartsController;
use App\Http\Controllers\Api\V1\WorkOrders\WorkOrderChecklistController;
use App\Http\Controllers\Api\V1\Inventory\ItemController;
use App\Http\Controllers\Api\V1\Inventory\WarehouseController;
use App\Http\Controllers\Api\V1\Inventory\StockMoveController;
use App\Http\Controllers\Api\V1\Dashboard\DashboardController;
use App\Http\Controllers\Api\V1\Notifications\NotificationController;
use App\Http\Controllers\Api\V1\Pm\PmPlanController;
use App\Http\Controllers\Api\V1\Purchasing\SupplierController;
use App\Http\Controllers\Api\V1\Purchasing\PurchaseOrderController;
use App\Http\Controllers\Api\V1\Superadmin\CompanyController as SuperadminCompanyController;
use App\Http\Controllers\Api\V1\Superadmin\CompanyMemberController as SuperadminCompanyMemberController;
use App\Http\Controllers\Api\V1\Superadmin\UserController as SuperadminUserController;
use App\Http\Controllers\Api\V1\Calendar\CalendarController;
use App\Http\Controllers\Api\V1\FileManager\FileManagerController;
use App\Http\Controllers\Api\V1\MaintenanceRequests\MaintenanceRequestController;
use App\Http\Controllers\Api\V1\Reports\ReportController;
use App\Http\Controllers\Api\V1\Chat\ConversationController;
use App\Http\Controllers\Api\V1\Chat\MessageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Broadcasting auth under /api so the Vite proxy forwards it correctly
Route::match(['get', 'post'], '/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})->middleware('auth:sanctum');

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class);

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', RegisterController::class);
        Route::post('/login', LoginController::class);
        Route::post('/forgot-password', ForgotPasswordController::class);
        Route::post('/reset-password', ResetPasswordController::class);
        Route::post('/send-otp', [OtpController::class, 'send']);
        Route::post('/verify-otp', [OtpController::class, 'verify']);

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

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('sites')->group(function (): void {
        Route::get('/all', [SiteController::class, 'all'])->middleware('permission:sites.read');
        Route::get('/', [SiteController::class, 'index'])->middleware('permission:sites.read');
        Route::get('/{site}', [SiteController::class, 'show'])->middleware('permission:sites.read');
        Route::post('/', [SiteController::class, 'store'])->middleware('permission:sites.create');
        Route::patch('/{site}', [SiteController::class, 'update'])->middleware('permission:sites.update');
        Route::delete('/{site}', [SiteController::class, 'destroy'])->middleware('permission:sites.delete');
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
        Route::get('/for-mention', [MemberController::class, 'forMention']); // no permission gate — any member can see names for @mention
        Route::get('/for-chat', [MemberController::class, 'forChat']); // no permission gate — any member can see colleagues for chat
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

        // Parts used (technician-friendly — uses work_orders.write, not inventory.write)
        Route::get('/{workOrder}/parts', [WoPartsController::class, 'index'])->middleware('permission:work_orders.read');
        Route::post('/{workOrder}/parts', [WoPartsController::class, 'store'])->middleware('permission:work_orders.write');

        // Checklist
        Route::post('/{workOrder}/checklist/{item}/toggle', [WorkOrderChecklistController::class, 'toggle'])->middleware('permission:work_orders.write');

        // Archive
        Route::post('/{workOrder}/archive', [WorkOrderController::class, 'archive'])->middleware('permission:work_orders.write');
        Route::post('/{workOrder}/unarchive', [WorkOrderController::class, 'unarchive'])->middleware('permission:work_orders.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('inventory/items')->group(function (): void {
        Route::get('/', [ItemController::class, 'index'])->middleware('permission:inventory.read');
        Route::get('/{item}', [ItemController::class, 'show'])->middleware('permission:inventory.read');
        Route::post('/', [ItemController::class, 'store'])->middleware('permission:inventory.write');
        Route::patch('/{item}', [ItemController::class, 'update'])->middleware('permission:inventory.write');
        Route::delete('/{item}', [ItemController::class, 'destroy'])->middleware('permission:inventory.delete');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('inventory/warehouses')->group(function (): void {
        Route::get('/', [WarehouseController::class, 'index'])->middleware('permission:inventory.read');
        Route::get('/{warehouse}', [WarehouseController::class, 'show'])->middleware('permission:inventory.read');
        Route::post('/', [WarehouseController::class, 'store'])->middleware('permission:inventory.write');
        Route::patch('/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:inventory.write');
        Route::delete('/{warehouse}', [WarehouseController::class, 'destroy'])->middleware('permission:inventory.delete');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('inventory/stock-moves')->group(function (): void {
        Route::get('/', [StockMoveController::class, 'index'])->middleware('permission:inventory.read');
        Route::post('/', [StockMoveController::class, 'store'])->middleware('permission:inventory.write');
        Route::delete('/{stockMove}', [StockMoveController::class, 'destroy'])->middleware('permission:inventory.delete');
    });

    Route::middleware('auth:sanctum')->prefix('notifications')->group(function (): void {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('/{notification}/read', [NotificationController::class, 'markRead']);
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('dashboard')->group(function (): void {
        Route::get('/', [DashboardController::class, 'index']);
        Route::get('/my', [DashboardController::class, 'my']);
        Route::get('/hr', [DashboardController::class, 'hr']);
    });

    // ── Purchasing ────────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'company.context'])->prefix('purchasing')->group(function (): void {
        Route::get('/suppliers', [SupplierController::class, 'index'])->middleware('permission:purchasing.read');
        Route::post('/suppliers', [SupplierController::class, 'store'])->middleware('permission:purchasing.write');
        Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:purchasing.write');
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:purchasing.delete');

        Route::get('/orders', [PurchaseOrderController::class, 'index'])->middleware('permission:purchasing.read');
        Route::get('/orders/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->middleware('permission:purchasing.read');
        Route::post('/orders', [PurchaseOrderController::class, 'store'])->middleware('permission:purchasing.write');
        Route::patch('/orders/{purchaseOrder}', [PurchaseOrderController::class, 'update'])->middleware('permission:purchasing.write');
        Route::delete('/orders/{purchaseOrder}', [PurchaseOrderController::class, 'destroy'])->middleware('permission:purchasing.delete');
        Route::post('/orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive'])->middleware('permission:purchasing.write');
        Route::post('/orders/{purchaseOrder}/invoice', [PurchaseOrderController::class, 'recordInvoice'])->middleware('permission:purchasing.write');
        Route::post('/orders/{purchaseOrder}/pay', [PurchaseOrderController::class, 'markAsPaid'])->middleware('permission:purchasing.write');
        Route::post('/orders/{purchaseOrder}/dispute', [PurchaseOrderController::class, 'disputeInvoice'])->middleware('permission:purchasing.write');
        Route::post('/orders/{purchaseOrder}/reopen', [PurchaseOrderController::class, 'reopen'])->middleware('permission:purchasing.write');
        Route::get('/orders/{purchaseOrder}/payment-proof', [PurchaseOrderController::class, 'downloadPaymentProof'])->middleware('permission:purchasing.read');
        Route::post('/orders/{purchaseOrder}/send-to-supplier', [PurchaseOrderController::class, 'sendToSupplier'])->middleware('permission:purchasing.write');

        Route::get('/receipts', [PurchaseOrderController::class, 'receipts'])->middleware('permission:purchasing.read');
    });

    // ── File Manager ─────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'company.context'])->prefix('file-manager')->group(function (): void {
        Route::get('/', [FileManagerController::class, 'index'])->middleware('permission:files.read');

        // Directories
        Route::post('/directories', [FileManagerController::class, 'storeDirectory'])->middleware('permission:files.write');
        Route::patch('/directories/{id}', [FileManagerController::class, 'renameDirectory'])->middleware('permission:files.write');
        Route::delete('/directories/{id}', [FileManagerController::class, 'destroyDirectory'])->middleware('permission:files.write');
        Route::post('/directories/{id}/share', [FileManagerController::class, 'shareDirectory'])->middleware('permission:files.write');

        // Files
        Route::post('/upload', [FileManagerController::class, 'upload'])->middleware('permission:files.write');
        Route::patch('/files/{id}', [FileManagerController::class, 'renameFile'])->middleware('permission:files.write');
        Route::delete('/files/{id}', [FileManagerController::class, 'destroyFile'])->middleware('permission:files.write');
        Route::get('/files/{id}/download', [FileManagerController::class, 'download'])->middleware('permission:files.read');
        Route::post('/files/{id}/share', [FileManagerController::class, 'shareFile'])->middleware('permission:files.write');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('calendar')->group(function (): void {
        Route::get('/', [CalendarController::class, 'index']);
        Route::post('/', [CalendarController::class, 'store']);
        Route::patch('/{calendarEvent}', [CalendarController::class, 'update']);
        Route::delete('/{calendarEvent}', [CalendarController::class, 'destroy']);
    });

    // ── Maintenance Requests ──────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'company.context'])->prefix('requests')->group(function (): void {
        Route::get('/', [MaintenanceRequestController::class, 'index']);
        Route::get('/{maintenanceRequest}', [MaintenanceRequestController::class, 'show']);
        Route::post('/', [MaintenanceRequestController::class, 'store']);
        Route::post('/{maintenanceRequest}/convert', [MaintenanceRequestController::class, 'convert'])->middleware('permission:work_orders.write');
        Route::post('/{maintenanceRequest}/reject', [MaintenanceRequestController::class, 'reject'])->middleware('permission:work_orders.write');
        Route::delete('/{maintenanceRequest}', [MaintenanceRequestController::class, 'destroy'])->middleware('permission:work_orders.delete');
    });

    Route::middleware(['auth:sanctum', 'company.context'])->prefix('pm/plans')->group(function (): void {
        Route::get('/', [PmPlanController::class, 'index'])->middleware('permission:pm_plans.read');
        Route::get('/{pmPlan}', [PmPlanController::class, 'show'])->middleware('permission:pm_plans.read');
        Route::post('/', [PmPlanController::class, 'store'])->middleware('permission:pm_plans.write');
        Route::patch('/{pmPlan}', [PmPlanController::class, 'update'])->middleware('permission:pm_plans.write');
        Route::delete('/{pmPlan}', [PmPlanController::class, 'destroy'])->middleware('permission:pm_plans.delete');
    });

    // ── Chat ─────────────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'company.context'])->prefix('chat')->group(function (): void {
        Route::get('/conversations',                                   [ConversationController::class, 'index']);
        Route::post('/conversations',                                  [ConversationController::class, 'store']);
        Route::post('/conversations/{conversation}/read',              [ConversationController::class, 'markRead']);
        Route::get('/conversations/{conversation}/files',              [ConversationController::class, 'files']);
        Route::post('/conversations/{conversation}/leave',             [ConversationController::class, 'leave']);
        Route::delete('/conversations/{conversation}',                 [ConversationController::class, 'destroy']);
        Route::get('/conversations/{conversation}/messages',           [MessageController::class, 'index']);
        Route::post('/conversations/{conversation}/messages',          [MessageController::class, 'store']);
        Route::delete('/messages/{message}',                           [MessageController::class, 'destroy']);
    });

    // ── Reports ───────────────────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'company.context'])->prefix('reports')->group(function (): void {
        Route::get('/work-orders', [ReportController::class, 'workOrders'])->middleware('permission:work_orders.read');
        Route::get('/assets',      [ReportController::class, 'assets'])->middleware('permission:assets.read');
        Route::get('/pm',          [ReportController::class, 'pmCompliance'])->middleware('permission:pm_plans.read');
        Route::get('/inventory',   [ReportController::class, 'inventory'])->middleware('permission:inventory.read');
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

