import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MessageArea = ({ selectedUser, messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input when user is selected
  useEffect(() => {
    if (selectedUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newMessage.trim() && !isSending) {
      setIsSending(true);
      await onSendMessage(newMessage);
      setNewMessage('');
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <>
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
            {getInitials(selectedUser.name)}
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{selectedUser.name}</h3>
            <p className="text-sm text-gray-500">{selectedUser.email}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 border shadow-sm">
                {formatDate(dateMessages[0].createdAt)}
              </span>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message) => {
              const isOwn = message.sender._id === user.id;
              
              return (
                <div
                  key={message._id}
                  className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {!isOwn && (
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2 flex-shrink-0">
                      {getInitials(message.sender.name)}
                    </div>
                  )}
                  
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-2 rounded-2xl shadow-sm ${
                        isOwn
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <div className={`mt-1 text-xs text-gray-500 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.createdAt)}
                      {message.isRead && isOwn && (
                        <span className="ml-1 text-primary-400">Read</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2 font-medium">No messages yet</p>
              <p className="text-sm text-gray-400">Start a conversation with {selectedUser.name}</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedUser.name}...`}
            rows="1"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-primary-500 text-white p-2 rounded-lg hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </>
  );
};

export default MessageArea;