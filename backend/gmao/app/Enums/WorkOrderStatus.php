<?php

namespace App\Enums;

enum WorkOrderStatus: string
{
    case OPEN = 'open';
    case IN_PROGRESS = 'in_progress';
    case DONE = 'done';
    case CLOSED = 'closed';
}
