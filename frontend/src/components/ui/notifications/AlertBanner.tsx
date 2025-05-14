import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AlertBannerProps {
  message: string;
  level: 'info' | 'warning' | 'danger';
  onClose: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ message, level, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    // Auto-hide the alert after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Call onClose after fade-out animation
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  // Define background color based on alert level
  const bgColor = {
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }[level];
  
  // Define icon based on alert level
  const Icon = {
    info: Info,
    warning: AlertTriangle,
    danger: ShieldAlert
  }[level];

  return (
    <div 
      className={`
        fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg text-white
        flex items-center ${bgColor} transform transition-all duration-300
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Icon className="mr-3 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-bold uppercase text-xs mb-1">
          {level === 'info' ? 'Information' : level === 'warning' ? 'Warning' : 'Alert'}
        </p>
        <p className="text-sm">{message}</p>
      </div>
      <button 
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 text-white opacity-70 hover:opacity-100"
      >
        &times;
      </button>
    </div>
  );
};

export default AlertBanner;