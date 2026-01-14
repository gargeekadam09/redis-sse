import React from 'react';

const UserList = ({ users, selectedUser, onSelectUser, unreadCounts = {} }) => {
  // Filter out test users created by testing scripts
  const filteredUsers = users.filter(user => {
    const name = user.name.toLowerCase();
    const email = user.email.toLowerCase();
    return !name.includes('throughput') && 
           !name.includes('scale') && 
           !name.includes('testuser') &&
           !email.includes('throughput') &&
           !email.includes('scale') &&
           !email.includes('test.com');
  });

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
        <div className="space-y-2">
          {filteredUsers.map((user) => {
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
                </div>

                {/* User info */}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;