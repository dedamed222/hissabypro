
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface AspectRatioProps extends React.ComponentProps<typeof AspectRatioPrimitive.Root> {
  mobileSmallerRatio?: boolean;
}

const AspectRatio = ({
  className, 
  mobileSmallerRatio = true, 
  ratio, 
  ...props
}: AspectRatioProps) => {
  const { isSmallMobile } = useIsMobile();
  
  // عندما تكون الشاشة صغيرة ويكون خيار mobileSmallerRatio مفعلاً،
  // نقوم بزيادة النسبة قليلاً لجعل المحتوى أقل ارتفاعًا على الشاشات الصغيرة
  const adjustedRatio = (mobileSmallerRatio && isSmallMobile && ratio) 
    ? (typeof ratio === 'number' ? ratio * 1.25 : ratio) 
    : ratio;
  
  return (
    <AspectRatioPrimitive.Root
      ratio={adjustedRatio}
      className={cn(className)}
      {...props}
    />
  );
};

export { AspectRatio }
