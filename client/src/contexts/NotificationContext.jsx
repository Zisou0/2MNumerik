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
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const audioRef = useRef(null);

  // Initialize audio and check notification permissions
  React.useEffect(() => {
    // Create audio element for notifications
    audioRef.current = new Audio();
    audioRef.current.volume = 1.0; // Maximum volume

    // Log security context information for debugging
    console.log('🔍 Notification Debug Info:');
    console.log('  - URL:', window.location.href);
    console.log('  - Protocol:', window.location.protocol);
    console.log('  - Hostname:', window.location.hostname);
    console.log('  - Is Secure Context:', window.isSecureContext);
    console.log('  - Notification Support:', 'Notification' in window);
    if ('Notification' in window) {
      console.log('  - Permission Status:', Notification.permission);
    }

    // Check if browser supports notifications
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
      
      // If permission is already granted, auto-enable desktop notifications
      if (Notification.permission === 'granted') {
        setDesktopNotificationsEnabled(true);
        localStorage.setItem('desktopNotificationsEnabled', 'true');
        console.log('✅ Desktop notifications auto-enabled (permission already granted)');
      } else {
        // Load saved preference for desktop notifications
        const savedPreference = localStorage.getItem('desktopNotificationsEnabled');
        if (savedPreference === 'true' && Notification.permission === 'granted') {
          setDesktopNotificationsEnabled(true);
        }
      }
    }
  }, []);

  // Request permission for desktop notifications
  const requestNotificationPermission = useCallback(async () => {
    console.log('🔐 Requesting notification permission...');
    
    if (!('Notification' in window)) {
      console.warn('❌ This browser does not support desktop notifications');
      return false;
    }

    console.log('📋 Current permission status:', Notification.permission);

    if (Notification.permission === 'granted') {
      console.log('✅ Permission already granted');
      setDesktopNotificationsEnabled(true);
      localStorage.setItem('desktopNotificationsEnabled', 'true');
      setPermissionStatus('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('❌ Desktop notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    try {
      console.log('🙋 Requesting permission from user...');
      
      // Show a brief message to explain what's happening
      const tempNotification = {
        id: 'permission-request',
        title: '🔔 Activation des notifications',
        message: 'Cliquez "Autoriser" pour recevoir des notifications sur votre bureau',
        type: 'info',
        showInPopup: true,
        timestamp: new Date()
      };
      
      setNotifications(prev => [tempNotification, ...prev]);
      
      const permission = await Notification.requestPermission();
      console.log('📋 Permission result:', permission);
      setPermissionStatus(permission);
      
      // Remove the temporary notification
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== 'permission-request'));
      }, 3000);
      
      if (permission === 'granted') {
        console.log('✅ Permission granted! Enabling desktop notifications');
        setDesktopNotificationsEnabled(true);
        localStorage.setItem('desktopNotificationsEnabled', 'true');
        
        // Show a success notification
        const successNotification = new Notification('🎉 Notifications activées !', {
          body: 'Vous recevrez maintenant des notifications sur votre bureau',
          icon: '/vite.svg'
        });
        
        setTimeout(() => successNotification.close(), 4000);
        
        return true;
      } else {
        console.log('❌ Permission denied');
        localStorage.setItem('desktopNotificationsEnabled', 'false');
        
        // Show helpful message for denied permissions
        const deniedNotification = {
          id: 'permission-denied-help',
          title: '❌ Notifications refusées',
          message: getBrowserSpecificInstructions(),
          type: 'warning',
          showInPopup: true,
          timestamp: new Date(),
          duration: 20000 // Show for 20 seconds
        };
        
        setNotifications(prev => [deniedNotification, ...prev]);
        
        // Auto-remove after 20 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== 'permission-denied-help'));
        }, 20000);
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Toggle desktop notifications
  const toggleDesktopNotifications = useCallback(async () => {
    if (!desktopNotificationsEnabled) {
      const granted = await requestNotificationPermission();
      return granted;
    } else {
      setDesktopNotificationsEnabled(false);
      localStorage.setItem('desktopNotificationsEnabled', 'false');
      return false;
    }
  }, [desktopNotificationsEnabled, requestNotificationPermission]);

  // Show desktop notification
  const showDesktopNotification = useCallback((notification) => {
    console.log('🔔 showDesktopNotification called with:', {
      notification,
      desktopNotificationsEnabled,
      notificationSupported: 'Notification' in window,
      permission: Notification?.permission
    });

    if (!('Notification' in window)) {
      console.warn('❌ Browser does not support notifications');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('❌ Notification permission not granted:', Notification.permission);
      return;
    }

    if (!desktopNotificationsEnabled) {
      console.warn('❌ Desktop notifications disabled in settings');
      return;
    }

    try {
      const { title, message, priority, orderNumber } = notification;
      
      // Create notification title and body
      const notificationTitle = title || 'Nouvelle notification';
      const notificationBody = message || '';
      
      console.log('✅ Creating desktop notification:', { notificationTitle, notificationBody, priority });

      // Create the desktop notification
      const desktopNotification = new Notification(notificationTitle, {
        body: notificationBody,
        icon: '/vite.svg', // You can replace this with a custom icon
        badge: '/vite.svg',
        tag: orderNumber || `notification-${Date.now()}`, // Prevent duplicate notifications for same order
        requireInteraction: priority === 'overdue' || priority === 'urgent', // Keep urgent notifications visible
        silent: false, // Allow system sound
        data: {
          priority,
          orderNumber,
          timestamp: new Date().toISOString()
        }
      });

      console.log('✅ Desktop notification created successfully');

      // Handle notification click
      desktopNotification.onclick = () => {
        console.log('🖱️ Desktop notification clicked');
        window.focus(); // Bring the browser window to front
        desktopNotification.close();
        
        // You can add additional logic here, like navigating to a specific order
        if (orderNumber) {
          console.log(`Desktop notification clicked for order: ${orderNumber}`);
        }
      };

      // Handle notification error
      desktopNotification.onerror = (error) => {
        console.error('❌ Desktop notification error:', error);
      };

      // Handle notification show
      desktopNotification.onshow = () => {
        console.log('📱 Desktop notification shown');
      };

      // Auto-close notification after some time (except for urgent ones)
      if (priority !== 'overdue' && priority !== 'urgent') {
        setTimeout(() => {
          desktopNotification.close();
        }, 8000); // 8 seconds
      }

    } catch (error) {
      console.error('❌ Error showing desktop notification:', error);
    }
  }, [desktopNotificationsEnabled]);

  // Function to manually show permission help
  const showPermissionHelp = useCallback(() => {
    const helpNotification = {
      id: 'manual-permission-help-' + Date.now(),
      title: '🔧 Comment activer les notifications de bureau',
      message: getBrowserSpecificInstructions(),
      type: 'info',
      showInPopup: true,
      timestamp: new Date(),
      duration: 20000 // Show for 20 seconds
    };
    
    setNotifications(prev => [helpNotification, ...prev.slice(0, 9)]);
    
    // Auto-remove after 20 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== helpNotification.id));
    }, 20000);
  }, []);

  // Get browser-specific instructions
  const getBrowserSpecificInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return 'Chrome: Cliquez sur l\'icône 🔒 à gauche de l\'URL → Notifications → Autoriser → Actualiser la page';
    } else if (userAgent.includes('firefox')) {
      return 'Firefox: Cliquez sur l\'icône 🛡️ à gauche de l\'URL → Notifications → Autoriser → Actualiser la page';
    } else if (userAgent.includes('safari')) {
      return 'Safari: Menu Safari → Préférences → Sites web → Notifications → Autoriser → Actualiser la page';
    } else if (userAgent.includes('edge')) {
      return 'Edge: Cliquez sur l\'icône 🔒 à gauche de l\'URL → Notifications → Autoriser → Actualiser la page';
    } else {
      return 'Cliquez sur l\'icône de sécurité à côté de l\'URL → Notifications → Autoriser → Actualiser la page';
    }
  };

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
        frequencies: [ 1047], // Alternating high-low alarm pattern
        volume: 0.9, // Very loud
        duration: 4, // Longer beeps
        gap: 0.1 // Shorter gaps between beeps
      },
      commercial: {
        frequencies: [523, 659, 784, 1047], // Success melody: C5, E5, G5, C6 (major chord progression)
        volume: 0.6,
        duration: 0.3,
        gap: 0.1
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

    // Auto-request permission and show desktop notification if supported
    const tryShowDesktopNotification = async () => {
      if (!('Notification' in window)) {
        console.log('🔔 Browser does not support desktop notifications');
        return;
      }

      // If permission is default (not asked yet), request it automatically
      if (Notification.permission === 'default') {
        console.log('🔐 Auto-requesting notification permission...');
        const granted = await requestNotificationPermission();
        if (granted) {
          showDesktopNotification(newNotification);
        }
      } else if (Notification.permission === 'granted' && desktopNotificationsEnabled) {
        // Permission already granted and enabled
        showDesktopNotification(newNotification);
      } else if (Notification.permission === 'granted' && !desktopNotificationsEnabled) {
        // Permission granted but user disabled in settings - enable it
        setDesktopNotificationsEnabled(true);
        localStorage.setItem('desktopNotificationsEnabled', 'true');
        showDesktopNotification(newNotification);
      } else if (Notification.permission === 'denied') {
        // Permission denied - show help message occasionally (not on every notification)
        const lastHelpShown = localStorage.getItem('lastPermissionHelpShown');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (!lastHelpShown || (now - parseInt(lastHelpShown)) > oneHour) {
          const helpNotification = {
            id: 'permission-help-' + now,
            title: '💡 Notifications de bureau désactivées',
            message: getBrowserSpecificInstructions(),
            type: 'info',
            showInPopup: true,
            timestamp: new Date(),
            duration: 15000 // Show for 15 seconds
          };
          
          // Add help notification without triggering audio
          setNotifications(prev => [helpNotification, ...prev.slice(0, 9)]);
          
          // Save timestamp to avoid showing too frequently
          localStorage.setItem('lastPermissionHelpShown', now.toString());
          
          // Auto-remove after 15 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== helpNotification.id));
          }, 15000);
        }
      }
    };

    // Call async function
    tryShowDesktopNotification();

    // Auto-remove notification after delay (30 minutes)
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 1800000); // 30 minutes = 30 * 60 * 1000 = 1,800,000 ms

    return id;
  }, [playNotificationSound, showDesktopNotification, desktopNotificationsEnabled, requestNotificationPermission]);

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
    clearAllNotifications,
    // Desktop notification functions
    desktopNotificationsEnabled,
    permissionStatus,
    requestNotificationPermission,
    toggleDesktopNotifications,
    showPermissionHelp
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Export the hook separately to avoid Fast Refresh issues
export { useNotifications };
