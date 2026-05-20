<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FmFile extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function directory(): BelongsTo
    {
        return $this->belongsTo(FmDirectory::class, 'fm_directory_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'uploaded_by_member_id')->with('user');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(FmFileShare::class);
    }
}
