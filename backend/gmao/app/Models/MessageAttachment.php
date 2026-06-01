<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageAttachment extends Model
{
    protected $guarded = [];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function getUrlAttribute(): string
    {
        return '/storage/' . $this->path;
    }

    protected $appends = ['url'];
}
