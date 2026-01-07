import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserList from './UserList';
import MessageArea from './MessageArea';
import NotificationSettings from './NotificationSettings';
import { useSSE } from '../hooks/useSSE';
import { useNotifications } from '../hooks/useNotifications';
import { useSoundNotifications } from '../hooks/useSoundNotifications';
import { Settings, Bell } from 'lucide-react';
import axios from 'axios';

const Chat = () => {
  const { user, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  
  // Notification hooks
  const { showMessageNotification, showUserStatusNotification } = useNotifications();
  const { playNotificationSound } = useSoundNotifications();
  
  // SSE for real-time notifications
  useSSE('/api/sse/notifications', (data) => {
    if (data.type === 'new_message') {
      const message = data.data;
      
      // Add new message if it's from the selected user
      if (selectedUser && message.sender._id === selectedUser.id) {
        setMessages(prev => [...prev, message]);
        markMessagesAsRead(selectedUser.id);
      } else {
        // Update unread count for other users
        setUnreadCounts(prev => ({
          ...prev,
          [message.sender._id]: (prev[message.sender._id] || 0) + 1
        }));
        
        // Show notifications for messages from other users
        showMessageNotification(message.sender.name, message.content);
        playNotificationSound('message');
      }
    }
  });

  // SSE for online users
  useSSE('/api/sse/online-users', (data) => {
    if (data.type === 'user_status_update') {
      const { userId, isOnline, userName } = data.data;
      
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        const wasOnline = newSet.has(userId);
        
        if (isOnline) {
          newSet.add(userId);
          if (!wasOnline) {
            showUserStatusNotification(userName, true);
            playNotificationSound('user-online');
          }
        } else {
          newSet.delete(userId);
          if (wasOnline) {
            showUserStatusNotification(userName, false);
            playNotificationSound('user-offline');
          }
        }
        return newSet;
      });
    }
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    fetchUnreadCounts();
  }, []);

  // Fetch messages when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      markMessagesAsRead(selectedUser.id);
      // Clear unread count for selected user
      setUnreadCounts(prev => ({
        ...prev,
        [selectedUser.id]: 0
      }));
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      console.log('Current user ID:', user?.id);
      console.log('Fetched users:', response.data.map(u => ({ id: u._id, name: u.name })));
      
      setUsers(response.data); // Backend already filters out current user
      
      // Update online status
      const onlineSet = new Set();
      response.data.forEach(u => {
        if (u.isOnline) {
          onlineSet.add(u._id);
        }
      });
      setOnlineUsers(onlineSet);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await axios.get(`/api/chat/conversation/${userId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await axios.get('/api/chat/unread-counts');
      setUnreadCounts(response.data);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const markMessagesAsRead = async (senderId) => {
    try {
      await axios.put(`/api/chat/read/${senderId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (content) => {
    if (!selectedUser || !content.trim()) return;

    try {
      const response = await axios.post('/api/chat/send', {
        receiverId: selectedUser.id,
        content: content.trim()
      });

      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getTotalUnreadCount = () => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-primary-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Chat App</h1>
              <p className="text-primary-100 text-sm">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Notification Settings Button */}
              <button
                onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                className="relative text-primary-100 hover:text-white transition-colors p-1"
              >
                <Bell className="w-5 h-5" />
                {getTotalUnreadCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalUnreadCount() > 9 ? '9+' : getTotalUnreadCount()}
                  </span>
                )}
              </button>
              
              <button
                onClick={logout}
                className="text-primary-100 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Notification Settings Panel */}
        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}

        {/* User List */}
        <UserList
          users={users}
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <MessageArea
            selectedUser={selectedUser}
            messages={messages}
            onSendMessage={sendMessage}
            isOnline={onlineUsers.has(selectedUser.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a user from the sidebar to start chatting</p>
              {getTotalUnreadCount() > 0 && (
                <p className="text-primary-500 mt-2 font-medium">
                  You have {getTotalUnreadCount()} unread message{getTotalUnreadCount() > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;