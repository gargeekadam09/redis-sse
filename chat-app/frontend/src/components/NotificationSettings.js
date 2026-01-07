import React, { useState, useEffect } from 'react';
import { X, Bell, Volume2, VolumeX, Monitor } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationSettings = ({ onClose }) => {
  const { permission, requestPermission } = useNotifications();
  const [settings, setSettings] = useState({
    browserNotifications: permission === 'granted',
    soundNotifications: true,
    desktopNotifications: true,
    messageNotifications: true,
    userStatusNotifications: true,
    notificationSound: 'default'
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const handleBrowserNotificationToggle = async () => {
    if (permission === 'granted') {
      updateSetting('browserNotifications', !settings.browserNotifications);
    } else {
      await requestPermission();
      updateSetting('browserNotifications', true);
    }
  };

  return (
    <div className="absolute top-16 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Browser Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">Browser Notifications</p>
              <p className="text-sm text-gray-500">Show desktop notifications for new messages</p>
            </div>
          </div>
          <button
            onClick={handleBrowserNotificationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.browserNotifications ? 'bg-primary-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.soundNotifications ? (
              <Volume2 className="w-5 h-5 text-gray-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="font-medium text-gray-900">Sound Notifications</p>
              <p className="text-sm text-gray-500">Play sound for new messages</p>
            </div>
          </div>
          <button
            onClick={() => updateSetting('soundNotifications', !settings.soundNotifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.soundNotifications ? 'bg-primary-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.soundNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Message Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Monitor className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">Message Notifications</p>
              <p className="text-sm text-gray-500">Get notified for new messages</p>
            </div>
          </div>
          <button
            onClick={() => updateSetting('messageNotifications', !settings.messageNotifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.messageNotifications ? 'bg-primary-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.messageNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* User Status Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 rounded-full bg-green-500"></div>
            <div>
              <p className="font-medium text-gray-900">User Status</p>
              <p className="text-sm text-gray-500">Notify when users come online/offline</p>
            </div>
          </div>
          <button
            onClick={() => updateSetting('userStatusNotifications', !settings.userStatusNotifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.userStatusNotifications ? 'bg-primary-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.userStatusNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Permission Status */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Notification Permission:</span>
            <span className={`text-sm font-medium ${
              permission === 'granted' ? 'text-green-600' : 
              permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {permission === 'granted' ? 'Granted' : 
               permission === 'denied' ? 'Blocked' : 'Not Requested'}
            </span>
          </div>
          {permission === 'denied' && (
            <p className="text-xs text-gray-500 mt-1">
              Enable notifications in your browser settings to receive alerts
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;