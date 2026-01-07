import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    // Request notification permission on mount
    if (permission === 'default') {
      requestPermission();
    }
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifications enabled!');
      } else if (result === 'denied') {
        toast.error('Notifications blocked. Enable in browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const showNotification = (title, options = {}) => {
    if (permission === 'granted' && document.hidden) {
      // Only show notification if tab is not active
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chat-message',
        renotify: true,
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Focus window when notification is clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }
  };

  const showMessageNotification = (senderName, message) => {
    showNotification(`New message from ${senderName}`, {
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      icon: '/favicon.ico'
    });
  };

  const showUserStatusNotification = (userName, isOnline) => {
    showNotification(`${userName} is now ${isOnline ? 'online' : 'offline'}`, {
      body: `${userName} ${isOnline ? 'joined' : 'left'} the chat`,
      icon: '/favicon.ico'
    });
  };

  return {
    permission,
    requestPermission,
    showNotification,
    showMessageNotification,
    showUserStatusNotification
  };
};