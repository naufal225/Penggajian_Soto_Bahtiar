<?php

use App\Http\Controllers\Api\Mobile\Auth\AuthController;
use App\Http\Controllers\Api\Mobile\Dashboard\DashboardController;
use App\Http\Controllers\Api\Mobile\Employee\EmployeeController;
use Illuminate\Support\Facades\Route;

Route::prefix('mobile')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::get('/employees/{employeeId}', [EmployeeController::class, 'show'])->whereNumber('employeeId');
        Route::put('/employees/{employeeId}', [EmployeeController::class, 'update'])->whereNumber('employeeId');
        Route::patch('/employees/{employeeId}/deactivate', [EmployeeController::class, 'deactivate'])->whereNumber('employeeId');
        Route::patch('/employees/{employeeId}/activate', [EmployeeController::class, 'activate'])->whereNumber('employeeId');
    });
});
