"use client"

import * as React from "react"

type OverlayPortalContainer = HTMLElement | undefined

const OverlayPortalContext = React.createContext<OverlayPortalContainer>(undefined)

function OverlayPortalProvider({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

  return (
    <OverlayPortalContext.Provider value={container ?? undefined}>
      {children}
      <div ref={setContainer} className="contents" />
    </OverlayPortalContext.Provider>
  )
}

function useOverlayPortalContainer() {
  return React.useContext(OverlayPortalContext)
}

export { OverlayPortalProvider, useOverlayPortalContainer }
