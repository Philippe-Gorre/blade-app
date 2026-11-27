<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_accounts', function (Blueprint $table): void {
            $table->string('active_session_id', 255)->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('staff_accounts', function (Blueprint $table): void {
            $table->dropColumn('active_session_id');
        });
    }
};
