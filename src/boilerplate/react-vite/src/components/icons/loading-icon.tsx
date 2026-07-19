import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

type Props = {
    className?: string
}

export const LoadingIcon = ({ className }: Props) => {
    return <Loader2 className={cn("size-8 animate-spin text-primary", className)} />
}
