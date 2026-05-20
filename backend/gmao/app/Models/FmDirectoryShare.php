<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FmDirectoryShare extends Model
{
    protected $guarded = [];

    public function directory(): BelongsTo
    {
        return $this->belongsTo(FmDirectory::class, 'fm_directory_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class)->with('user');
    }
}
