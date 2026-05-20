<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FmFileShare extends Model
{
    protected $guarded = [];

    public function file(): BelongsTo
    {
        return $this->belongsTo(FmFile::class, 'fm_file_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class)->with('user');
    }
}
