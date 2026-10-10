'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { buttonVariants, type ButtonProps } from '../Button';
import { Icon, type IconName } from '../Icon';
import { Tooltip } from '../Tooltip';

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: IconName;
  /** Required: becomes aria-label and the tooltip. */
  label: string;
}

/** Square button with only an icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ icon, label, variant = 'ghost', size = 'sm', className, ...props }, ref) => (
  <Tooltip content={label}>
    <button ref={ref} type="button" aria-label={label} className={cn(buttonVariants({ variant, size }), 'aspect-square px-0', className)} {...props}>
      <Icon name={icon} size={16} />
    </button>
  </Tooltip>
));
IconButton.displayName = 'IconButton';
