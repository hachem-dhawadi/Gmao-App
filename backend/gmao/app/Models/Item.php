<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'unit_cost'  => 'decimal:2',
        'min_stock'  => 'decimal:3',
        'is_stocked' => 'boolean',
        'images'     => 'array',
    ];

    public function stockMoves(): HasMany
    {
        return $this->hasMany(StockMove::class);
    }
}
