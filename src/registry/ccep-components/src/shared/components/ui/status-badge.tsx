import { cn } from '@/lib/utils'

export type StatusVariant =
  | 'invited'
  | 'active'
  | 'disabled'
  | 'draft'
  | 'ready'
  | 'review'
  | 'clarification'
  | 'approved'
  | 'in_progress'
  | 'installation'
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'accepted'
  | 'published'
  | 'revoked'

type Props = {
  variant: StatusVariant
  children: React.ReactNode
  className?: string
  showDot?: boolean
}

const variantStyles: Record<StatusVariant, string> = {
  invited:       'bg-[#E0F0FF] text-[#00527C]',
  active:        'bg-[#CDFEE1] text-[#0C5132]',
  disabled:      'bg-[#FEDAD9] text-[#8E1F0B]',
  pending:       'bg-[#E0F0FF] text-[#00527C]',
  accepted:      'bg-[#CDFEE1] text-[#0C5132]',
  published:     'bg-[#CDFEE1] text-[#0C5132]',
  revoked:       'bg-[#FEDAD9] text-[#8E1F0B]',
  draft:         'bg-[#F1F5F9] text-[#475569]',
  ready:         'bg-[#E0F0FF] text-[#00527C]',
  review:        'bg-[#FFE600] text-[#332E00]',
  clarification: 'bg-[#E2E8F0] text-[#334155]',
  approved:      'bg-[#D1FAE5] text-[#065F46]',
  in_progress:   'bg-[#FFEF9D] text-[#4F4700]',
  installation:  'bg-[#FFD6A4] text-[#5E4200]',
  completed:     'bg-[#29845A] text-[#F8FFFB]',
  cancelled:     'bg-[#E51C00] text-[#FFFBFB]',
}

const dotColor: Record<StatusVariant, string> = {
  invited:       'bg-[#00527C]',
  active:        'bg-[#0C5132]',
  disabled:      'bg-[#8E1F0B]',
  pending:       'bg-[#00527C]',
  accepted:      'bg-[#0C5132]',
  published:     'bg-[#0C5132]',
  revoked:       'bg-[#8E1F0B]',
  draft:         'bg-[#475569]',
  ready:         'bg-[#00527C]',
  review:        'bg-[#332E00]',
  clarification: 'bg-[#334155]',
  approved:      'bg-[#065F46]',
  in_progress:   'bg-[#4F4700]',
  installation:  'bg-[#5E4200]',
  completed:     'bg-[#F8FFFB]',
  cancelled:     'bg-[#FFFBFB]',
}

export function StatusBadge({ variant, children, className, showDot = true }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[8px] px-2 py-0.75 text-xs font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {showDot && (
        <span className={cn('size-2 shrink-0 rounded-xs', dotColor[variant])} />
      )}
      {children}
    </span>
  )
}
