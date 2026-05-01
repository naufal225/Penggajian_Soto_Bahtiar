<?php

use App\Http\Controllers\Api\Mobile\Auth\AuthController;
use App\Http\Controllers\Api\Mobile\DailyWage\DailyWageController;
use App\Http\Controllers\Api\Mobile\Dashboard\DashboardController;
use App\Http\Controllers\Api\Mobile\Employee\EmployeeController;
use App\Http\Controllers\Api\Mobile\Report\ReportController;
use App\Http\Controllers\Api\Mobile\Sync\SyncController;
use App\Http\Controllers\Api\Mobile\WeekPeriod\WeekPeriodController;
use App\Http\Controllers\Api\Mobile\WeeklyPayment\WeeklyPaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('mobile')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::get('/dashboard', [DashboardController::class, 'index']);

        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::get('/employees/{employeeId}', [EmployeeController::class, 'show'])->whereNumber('employeeId');
        Route::put('/employees/{employeeId}', [EmployeeController::class, 'update'])->whereNumber('employeeId');
        Route::patch('/employees/{employeeId}/deactivate', [EmployeeController::class, 'deactivate'])->whereNumber('employeeId');
        Route::patch('/employees/{employeeId}/activate', [EmployeeController::class, 'activate'])->whereNumber('employeeId');
        Route::delete('/employees/{employeeId}', [EmployeeController::class, 'destroy'])->whereNumber('employeeId');

        Route::get('/week-periods/current', [WeekPeriodController::class, 'current']);
        Route::get('/week-periods', [WeekPeriodController::class, 'index']);
        Route::get('/week-periods/{weekPeriodId}', [WeekPeriodController::class, 'show'])->whereNumber('weekPeriodId');

        Route::get('/daily-wages', [DailyWageController::class, 'index']);
        Route::post('/daily-wages', [DailyWageController::class, 'store']);
        Route::put('/daily-wages/{dailyWageId}', [DailyWageController::class, 'update'])->whereNumber('dailyWageId');
        Route::get('/daily-wages/{dailyWageId}', [DailyWageController::class, 'show'])->whereNumber('dailyWageId');
        Route::get('/daily-wages/history', [DailyWageController::class, 'history']);

        Route::post('/weekly-payments/employee', [WeeklyPaymentController::class, 'payEmployee']);
        Route::post('/weekly-payments/all', [WeeklyPaymentController::class, 'payAll']);
        Route::get('/weekly-payments', [WeeklyPaymentController::class, 'index']);
        Route::get('/weekly-payments/{paymentId}', [WeeklyPaymentController::class, 'show'])->whereNumber('paymentId');
        Route::post('/weekly-payments/{paymentId}/undo', [WeeklyPaymentController::class, 'undo'])->whereNumber('paymentId');

        Route::get('/reports/weekly-summary-pdf', [ReportController::class, 'weeklySummaryPdf']);

        Route::post('/sync/push', [SyncController::class, 'push']);
        Route::get('/sync/pull', [SyncController::class, 'pull']);
    });
});
