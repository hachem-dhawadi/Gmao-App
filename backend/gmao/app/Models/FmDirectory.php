<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FmDirectory extends Model
{
    protected $guarded = [];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(FmDirectory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(FmDirectory::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(FmFile::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'created_by_member_id')->with('user');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(FmDirectoryShare::class);
    }

    /** Returns ordered ancestors from root to this directory (excluding self). */
    public function getAncestors(): array
    {
        $ancestors = [];
        $current = $this;

        while ($current->parent_id !== null) {
            $current = $current->parent()->first();
            if (! $current) {
                break;
            }
            array_unshift($ancestors, $current);
        }

        return $ancestors;
    }
}
