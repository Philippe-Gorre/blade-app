<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_accounts', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100);
            $table->string('email', 254)->unique();
            $table->string('password');
            $table->string('role', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_accounts');
    }
};
