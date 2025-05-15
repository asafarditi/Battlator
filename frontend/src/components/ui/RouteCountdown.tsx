import React, { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

interface RouteCountdownProps {
  onConfirm: () => void;
  onCancel: () => void;
  routeName?: string; // Route identifier (A, B, C, etc.)
}

const RouteCountdown: React.FC<RouteCountdownProps> = ({ onConfirm, onCancel, routeName = "" }) => {
  const [countdown, setCountdown] = useState(5);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<number | null>(null);

  // Use a more reliable countdown based on actual elapsed time
  useEffect(() => {
    startTimeRef.current = Date.now();

    const updateCountdown = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newCount = Math.max(5 - elapsedSeconds, 0);

      setCountdown(newCount);

      if (newCount > 0) {
        // Continue countdown
        timerRef.current = window.requestAnimationFrame(updateCountdown);
      } else {
        // Reached zero, call onConfirm
        onConfirm();
      }
    };

    // Start the countdown
    timerRef.current = window.requestAnimationFrame(updateCountdown);

    // Cleanup function
    return () => {
      if (timerRef.current !== null) {
        window.cancelAnimationFrame(timerRef.current);
      }
    };
  }, [onConfirm]); // Only run once when component mounts or onConfirm changes

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-6 max-w-sm w-full border border-gray-700 animate-fade-in">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold mb-2">Mission Will Start</h3>
          <p className="text-gray-300 text-sm mb-4">
            {routeName
              ? `Route ${routeName} is chosen. Starting navigation along selected route.`
              : "Starting navigation along selected route."}
          </p>

          {/* Countdown timer */}
          <div className="flex justify-center items-center mb-2">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">{countdown}</div>
          </div>
          <p className="text-xs text-gray-400">
            Automatically starting in {countdown} second{countdown !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex justify-between space-x-3">
          <button
            onClick={() => {
              if (timerRef.current !== null) {
                window.cancelAnimationFrame(timerRef.current);
              }
              onCancel();
            }}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md flex items-center justify-center"
          >
            <X size={18} className="mr-1" />
            Cancel
          </button>
          <button
            onClick={() => {
              if (timerRef.current !== null) {
                window.cancelAnimationFrame(timerRef.current);
              }
              onConfirm();
            }}
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
