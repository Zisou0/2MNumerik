import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext();

// Export the hook function with a consistent name
const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const audioRef = useRef(null);

  // Initialize audio
  React.useEffect(() => {
    // Create audio element for notifications
    audioRef.current = new Audio();
    audioRef.current.volume = 1.0; // Maximum volume
  }, []);

  const playNotificationSound = useCallback((priority = 'normal') => {
    if (!audioRef.current) return;

    // Different sounds for different priority levels - much louder and more attention-grabbing
    const soundConfig = {
      overdue: {
        frequencies: [1000, 300, 1000, 300, 1000, 300], // Very aggressive alarm pattern
        volume: 1.0, // Maximum volume
        duration: 0.3, // Longest beeps
        gap: 0.08 // Shortest gaps between beeps
      },
      urgent: {
        frequencies: [900, 400, 900, 400, 900], // Alternating high-low alarm pattern
        volume: 0.9, // Very loud
        duration: 0.25, // Longer beeps
        gap: 0.1 // Shorter gaps between beeps
      },
      high: {
        frequencies: [700, 500, 700], // Medium alarm pattern
        volume: 0.7,
        duration: 0.2,
        gap: 0.15
      },
      normal: {
        frequencies: [600, 800], // Pleasant two-tone chime
        volume: 0.3,
        duration: 0.12,
        gap: 0.08
      },
      atelier: {
        frequencies: [600, 800], // Same pleasant two-tone chime as normal
        volume: 0.3,
        duration: 0.12,
        gap: 0.08
      },
      commercial: {
        frequencies: [600, 800], // Same pleasant two-tone chime as normal and atelier
        volume: 0.3,
        duration: 0.12,
        gap: 0.08
      }
    };

    const config = soundConfig[priority] || soundConfig.normal;
    
    // Create audio context for beep sounds
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      config.frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (index * (config.duration + config.gap));
        const endTime = startTime + config.duration;
        
        gainNode.gain.setValueAtTime(config.volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
        
        oscillator.start(startTime);
        oscillator.stop(endTime);
      });
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      showInPopup: true, // New notifications show in popup by default
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep only last 10 notifications

    // Play sound based on priority
    playNotificationSound(notification.priority);

    // Auto-remove notification after delay (30 minutes)
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 1800000); // 30 minutes = 30 * 60 * 1000 = 1,800,000 ms

    return id;
  }, [playNotificationSound]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const hideFromPopup = useCallback((id) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === id 
        ? { ...notification, showInPopup: false }
        : notification
    ));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    hideFromPopup,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Export the hook separately to avoid Fast Refresh issues
export { useNotifications };
