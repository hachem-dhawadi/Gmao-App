<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetType extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(Field::class);
    }
}
