import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";

interface RouteCountdownProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const RouteCountdown: React.FC<RouteCountdownProps> = ({ onConfirm, onCancel }) => {
  const [countdown, setCountdown] = useState(5);

  // Start countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      onConfirm();
    }
  }, [countdown, onConfirm]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-6 max-w-sm w-full border border-gray-700 animate-fade-in">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold mb-2">Navigation Will Start</h3>
          <p className="text-gray-300 text-sm mb-4">Starting navigation along selected route.</p>

          {/* Countdown timer */}
          <div className="flex justify-center items-center mb-2">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">{countdown}</div>
          </div>
          <p className="text-xs text-gray-400">Automatically starting in {countdown} seconds</p>
        </div>

        <div className="flex justify-between space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md flex items-center justify-center"
          >
            <X size={18} className="mr-1" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md flex items-center justify-center"
          >
            <Check size={18} className="mr-1" />
            Start Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteCountdown;
