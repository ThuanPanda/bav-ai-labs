import { createFileRoute } from '@tanstack/react-router'
import { AdminLayout } from '@/components/layout'

export const Route = createFileRoute('/_app')({
  component: AdminLayout,
})
