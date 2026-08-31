<?php

namespace App\Enums;

enum UserStatus: string
{
    case Active = 'ACTIVE';
    case Suspended = 'SUSPENDED';
    case InactivePaymentPending = 'INACTIVE_PAYMENT_PENDING';

    public function isPortalAllowed(): bool
    {
        return $this === self::Active;
    }
}
