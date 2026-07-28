
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface AnimatedLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function AnimatedLogo({ className, size = "md" }: AnimatedLogoProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  
  useEffect(() => {
    setIsAnimated(true);
    const intervalId = setInterval(() => {
      setIsAnimated(prev => !prev);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    xl: "w-64 h-64",
  };
  
  return (
    <div className={cn("relative overflow-hidden", sizeClasses[size], className)}>
      <AspectRatio ratio={1/1} className="w-full h-full">
        <div className={cn(
          "absolute inset-0 transition-all duration-1000 ease-in-out",
          isAnimated ? "scale-105" : "scale-100",
          isAnimated ? "opacity-100" : "opacity-90",
        )}>
          <img 
            src="/lovable-uploads/9bf8f3b6-2cd1-4788-a907-3ea9cb2eb6fc.png"
            alt="Hissaby Pro Logo"
            className={cn(
              "w-full h-full object-contain transition-transform duration-1000 ease-in-out",
              isAnimated ? "rotate-3" : "rotate-0"
            )}
          />
        </div>
      </AspectRatio>
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-full",
        "transition-opacity duration-1000",
        isAnimated ? "opacity-50" : "opacity-0"
      )}></div>
    </div>
  );
}
