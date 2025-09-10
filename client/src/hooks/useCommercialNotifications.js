import { useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

// Hook to handle real-time notifications for commercial users when orders are completed
export const useCommercialNotifications = () => {
  const { subscribe, connected } = useWebSocket();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    // Only set up notifications for commercial users
    if (!connected || !user || user.role !== 'commercial') {
      return;
    }

    // Subscribe to the orderStatusChanged event
    const unsubscribeStatusChanged = subscribe('orderStatusChanged', (statusChangeData) => {
      // Only handle "terminé" status notifications for commercial users
      if (statusChangeData.toStatus === 'termine') {
        // Create notification for the commercial user
        const message = `${statusChangeData.orderNumber} - ${statusChangeData.client}${statusChangeData.productName ? ` | ${statusChangeData.productName}` : ''} terminé`;
        
        addNotification({
          title: '✅ Commande terminée !',
          message: message,
          priority: 'commercial', // Use specific commercial priority for the pleasant sound
          orderNumber: statusChangeData.orderNumber,
          type: 'order_completed',
          duration: 1800000 // 30 minutes
        });
      }
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribeStatusChanged();
    };
  }, [connected, subscribe, addNotification, user]);
};
