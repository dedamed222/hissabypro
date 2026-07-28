
import { Toast, ToastProps, ToastActionElement } from "@/components/ui/toast"
import {
  useToast as useToastShadcn,
  toast,
  ToastActionType
} from "@/components/ui/toaster"

export type {
  ToastProps,
  ToastActionElement,
}

export const useToast = useToastShadcn
export { toast }
