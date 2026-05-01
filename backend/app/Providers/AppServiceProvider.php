<?php

namespace App\Providers;

use App\Repositories\Contracts\DashboardRepositoryInterface;
use App\Repositories\Contracts\DailyWageRepositoryInterface;
use App\Repositories\Contracts\EmployeeRepositoryInterface;
use App\Repositories\Contracts\MobileSyncHistoryRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\Contracts\WeekPeriodRepositoryInterface;
use App\Repositories\Contracts\WeeklyPaymentRepositoryInterface;
use App\Repositories\Eloquent\DashboardRepository;
use App\Repositories\Eloquent\DailyWageRepository;
use App\Repositories\Eloquent\EmployeeRepository;
use App\Repositories\Eloquent\MobileSyncHistoryRepository;
use App\Repositories\Eloquent\UserRepository;
use App\Repositories\Eloquent\WeekPeriodRepository;
use App\Repositories\Eloquent\WeeklyPaymentRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(EmployeeRepositoryInterface::class, EmployeeRepository::class);
        $this->app->bind(DashboardRepositoryInterface::class, DashboardRepository::class);
        $this->app->bind(WeekPeriodRepositoryInterface::class, WeekPeriodRepository::class);
        $this->app->bind(DailyWageRepositoryInterface::class, DailyWageRepository::class);
        $this->app->bind(WeeklyPaymentRepositoryInterface::class, WeeklyPaymentRepository::class);
        $this->app->bind(MobileSyncHistoryRepositoryInterface::class, MobileSyncHistoryRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
