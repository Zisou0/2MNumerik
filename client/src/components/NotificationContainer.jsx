import React, { useEffect, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationContainer = () => {
  const { notifications, hideFromPopup } = useNotifications();
  const [dismissingIds, setDismissingIds] = useState(new Set());

  // Filter notifications to only show those that should appear in popup
  const popupNotifications = notifications.filter(notification => notification.showInPopup);

  // Auto-dismiss notifications with priority-based timing
  useEffect(() => {
    const timers = popupNotifications.map((notification) => {
      // Don't auto-dismiss if already dismissing
      if (dismissingIds.has(notification.id)) return null;
      
      // Set timeout based on priority
      const timeout = notification.priority === 'overdue' ? 12000 : // 12 seconds for critical
                     notification.priority === 'urgent' ? 10000 :   // 10 seconds for urgent
                     notification.priority === 'high' ? 8000 :      // 8 seconds for high
                     6000; // 6 seconds for normal
      
      return setTimeout(() => {
        // Add dismissing animation
        setDismissingIds(prev => new Set([...prev, notification.id]));
        
        // Remove after animation completes
        setTimeout(() => {
          hideFromPopup(notification.id);
          setDismissingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(notification.id);
            return newSet;
          });
        }, 300); // Match animation duration
      }, timeout);
    });

    // Cleanup timers on unmount or notifications change
    return () => {
      timers.forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [popupNotifications, hideFromPopup, dismissingIds]);

  const handleManualDismiss = (notificationId) => {
    setDismissingIds(prev => new Set([...prev, notificationId]));
    setTimeout(() => {
      hideFromPopup(notificationId);
      setDismissingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 300);
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'overdue':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'urgent':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'high':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getPriorityClasses = (priority) => {
    switch (priority) {
      case 'overdue':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'urgent':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'high':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Early return after all hooks are called
  if (popupNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {popupNotifications.map((notification) => {
        const isDismissing = dismissingIds.has(notification.id);
        
        return (
          <div
            key={notification.id}
            className={`transform transition-all duration-300 ease-in-out ${
              isDismissing 
                ? 'opacity-0 scale-95 translate-x-full' 
                : 'opacity-100 scale-100 translate-x-0 animate-in slide-in-from-right-full'
            } p-4 rounded-lg border shadow-lg backdrop-blur-sm bg-white/95 ${getPriorityClasses(notification.priority)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getPriorityIcon(notification.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold truncate">
                    {notification.title}
                  </h4>
                  <button
                    onClick={() => handleManualDismiss(notification.id)}
                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm mt-1 text-gray-700">
                  {notification.message}
                </p>
                {notification.orderNumber && (
                  <p className="text-xs mt-1 font-mono bg-white/50 px-2 py-1 rounded">
                    Commande: {notification.orderNumber}
                  </p>
                )}
                <p className="text-xs mt-2 text-gray-500">
                  {notification.timestamp.toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            {!isDismissing && (
              <div className="mt-2 w-full bg-white/30 rounded-full h-1 overflow-hidden">
                <div 
                  className={`h-full bg-current transition-all ease-linear ${
                    notification.priority === 'overdue' ? 'animate-[shrink_12s_linear]' :
                    notification.priority === 'urgent' ? 'animate-[shrink_10s_linear]' :
                    notification.priority === 'high' ? 'animate-[shrink_8s_linear]' :
                    'animate-[shrink_6s_linear]'
                  }`}
                  style={{
                    animation: notification.priority === 'overdue' ? 'shrink 12s linear' :
                              notification.priority === 'urgent' ? 'shrink 10s linear' :
                              notification.priority === 'high' ? 'shrink 8s linear' :
                              'shrink 6s linear'
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NotificationContainer;
