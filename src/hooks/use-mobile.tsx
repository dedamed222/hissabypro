
import * as React from "react"

// Mobile breakpoints
export const MOBILE_BREAKPOINTS = {
  SMALL: 480,
  MEDIUM: 768,
  LARGE: 992,
  XLARGE: 1200
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)
  const [screenSize, setScreenSize] = React.useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINTS.MEDIUM - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINTS.MEDIUM)
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    
    // Add event listener
    mql.addEventListener("change", onChange)
    
    // Set initial value
    onChange()
    
    // Cleanup event listener
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return {
    isMobile,
    isSmallMobile: screenSize.width < MOBILE_BREAKPOINTS.SMALL,
    isMediumMobile: screenSize.width < MOBILE_BREAKPOINTS.MEDIUM,
    isLargeMobile: screenSize.width < MOBILE_BREAKPOINTS.LARGE,
    isXLargeMobile: screenSize.width < MOBILE_BREAKPOINTS.XLARGE,
    screenSize,
  }
}
