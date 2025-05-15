import React, { useState, useEffect } from "react";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";
import { NotificationType } from "../../../store/notificationStore";

interface AlertBannerProps {
  message: string;
  level: NotificationType;
  onClose: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ message, level, onClose }) => {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    // Small delay before showing for staggered appearance when multiple appear
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 50);

    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    // Auto-hide the alert after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Call onClose after fade-out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Define styles based on alert level
  const styles = {
    info: {
      bg: "bg-blue-600",
      border: "border-blue-400",
      icon: Info,
      shadow: "shadow-blue-700/20",
    },
    warning: {
      bg: "bg-amber-600",
      border: "border-amber-400",
      icon: AlertTriangle,
      shadow: "shadow-amber-700/20",
    },
    danger: {
      bg: "bg-red-600",
      border: "border-red-400",
      icon: ShieldAlert,
      shadow: "shadow-red-700/20",
    },
  }[level];

  const Icon = styles.icon;

  return (
    <div
      className={`
        max-w-sm p-0 rounded-lg shadow-lg text-white overflow-hidden
        border-l-4 ${styles.border}
        transform transition-all duration-500 ease-in-out
        ${styles.shadow} shadow-lg
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div className={`${styles.bg} p-4 flex items-center`}>
        <Icon className="mr-3 flex-shrink-0" size={20} />
        <div className="flex-1">
          <p className="font-bold uppercase text-xs tracking-wider mb-1 opacity-90">
            {level === "info" ? "Information" : level === "warning" ? "Warning" : "Alert"}
          </p>
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 500);
          }}
          className="ml-2 text-white opacity-70 hover:opacity-100 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-all"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default AlertBanner;
