import React from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

const WebSocketStatus = () => {
  const { connected, connectionError, reconnect } = useWebSocket();

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live updates active</span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-red-600">Connection lost</span>
        <button
          onClick={reconnect}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-yellow-600">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span>Connecting...</span>
    </div>
  );
};

export default WebSocketStatus;
