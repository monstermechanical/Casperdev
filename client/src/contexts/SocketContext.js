import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to socket server
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          userId: user.id,
          username: user.username
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to real-time server');
        setConnected(true);
        toast.success('Real-time connection established');
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from real-time server');
        setConnected(false);
        toast.warn('Real-time connection lost');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Failed to establish real-time connection');
      });

      // Handle user-joined event
      newSocket.on('user-joined', (userId) => {
        console.log(`User ${userId} joined the room`);
        setOnlineUsers(prev => [...prev, userId]);
      });

      // Handle incoming messages
      newSocket.on('receive-message', (messageData) => {
        console.log('New message received:', messageData);
        setMessages(prev => [...prev, messageData]);
        
        // Show notification if not in the active room
        if (activeRoom !== messageData.room) {
          toast.info(`New message from ${messageData.sender}`);
        }
      });

      // Handle user status updates
      newSocket.on('user-status-update', (statusData) => {
        console.log('User status update:', statusData);
        // Update user status in your application
      });

      // Handle connection notifications
      newSocket.on('connection-request', (requestData) => {
        toast.info(`New connection request from ${requestData.senderUsername}`);
      });

      newSocket.on('connection-accepted', (connectionData) => {
        toast.success(`Connection accepted by ${connectionData.username}`);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
        setSocket(null);
        setConnected(false);
        setOnlineUsers([]);
        setMessages([]);
      };
    }
  }, [isAuthenticated, user, activeRoom]);

  const joinRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('join-room', roomId);
      setActiveRoom(roomId);
      console.log(`Joined room: ${roomId}`);
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && connected) {
      socket.emit('leave-room', roomId);
      if (activeRoom === roomId) {
        setActiveRoom(null);
      }
      console.log(`Left room: ${roomId}`);
    }
  };

  const sendMessage = (roomId, message) => {
    if (socket && connected) {
      const messageData = {
        room: roomId,
        message: message,
        timestamp: new Date().toISOString()
      };
      
      socket.emit('send-message', messageData);
      
      // Add to local messages immediately
      setMessages(prev => [...prev, {
        ...messageData,
        sender: user.id,
        senderUsername: user.username,
        isOwn: true
      }]);
      
      console.log('Message sent:', messageData);
    } else {
      toast.error('Not connected to real-time server');
    }
  };

  const sendNotification = (userId, notificationData) => {
    if (socket && connected) {
      socket.emit('send-notification', {
        targetUserId: userId,
        ...notificationData
      });
    }
  };

  const updateUserStatus = (status) => {
    if (socket && connected) {
      socket.emit('update-status', {
        userId: user.id,
        status: status,
        timestamp: new Date().toISOString()
      });
    }
  };

  const getConnectionStatus = () => {
    return {
      connected,
      socket: !!socket,
      activeRoom,
      onlineUsersCount: onlineUsers.length
    };
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const value = {
    socket,
    connected,
    onlineUsers,
    messages,
    activeRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendNotification,
    updateUserStatus,
    getConnectionStatus,
    clearMessages,
    isConnected: connected && !!socket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};