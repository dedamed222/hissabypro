
import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

interface InvoiceNotificationProps {
  error: string;
  success: string;
}

const InvoiceNotification = ({ error, success }: InvoiceNotificationProps) => {
  if (!error && !success) return null;
  
  return (
    <>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm flex items-center gap-2 mb-4">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
    </>
  );
};

export default InvoiceNotification;
