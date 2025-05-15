import React from "react";
import AlertBanner from "./AlertBanner";
import { useNotificationStore } from "../../../store/notificationStore";

const NotificationManager: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-h-[calc(100vh-32px)] overflow-hidden pointer-events-none">
      <div className="flex flex-col-reverse gap-3 max-w-sm w-full pointer-events-auto">
        {notifications.map((notification) => (
          <AlertBanner
            key={notification.id}
            message={notification.message}
            level={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationManager;
