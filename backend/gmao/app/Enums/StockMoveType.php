<?php

namespace App\Enums;

enum StockMoveType: string
{
    case IN = 'in';
    case OUT = 'out';
    case ADJUST = 'adjust';
}
