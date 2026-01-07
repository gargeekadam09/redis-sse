import React from 'react';
import { Circle } from 'lucide-react';

const UserList = ({ users, onlineUsers, selectedUser, onSelectUser, unreadCounts = {} }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (lastSeen) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
        <div className="space-y-2">
          {users.map((user) => {
            const isOnline = onlineUsers.has(user._id);
            const isSelected = selectedUser?.id === user._id;
            const unreadCount = unreadCounts[user._id] || 0;
            
            return (
              <div
                key={user._id}
                onClick={() => onSelectUser({ id: user._id, name: user.name, email: user.email })}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    <Circle className="w-full h-full" fill="currentColor" />
                  </div>
                </div>

                {/* User info */}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      {isOnline && (
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      )}
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {isOnline ? 'Active now' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;