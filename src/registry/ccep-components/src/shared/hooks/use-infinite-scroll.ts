import { useEffect, useRef } from 'react'

type UseInfiniteScrollOptions = {
  onLoadMore: () => void
  hasMore: boolean
  enabled?: boolean
  threshold?: number
}

function useInfiniteScroll({
  onLoadMore,
  hasMore,
  enabled = true,
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !hasMore || !sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore() },
      { threshold },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [enabled, hasMore, onLoadMore, threshold])

  return sentinelRef
}

export { useInfiniteScroll }
