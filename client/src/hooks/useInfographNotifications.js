import { useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

// Hook to handle real-time notifications for infograph users when orders become available
export const useInfographNotifications = () => {
  const { subscribe, connected } = useWebSocket();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    // Only set up notifications for infograph users
    if (!connected || !user || user.role !== 'infograph') {
      return;
    }

    // Subscribe to the orderEtapeChanged event
    const unsubscribeEtapeChanged = subscribe('orderEtapeChanged', (etapeChangeData) => {
      // Create notification for the infograph user
      const message = `${etapeChangeData.orderNumber} - ${etapeChangeData.client}${etapeChangeData.productName ? ` | ${etapeChangeData.productName}` : ''}`;
      
      addNotification({
        title: '🎨 Nouvelle commande disponible !',
        message: message,
        priority: 'normal', // Use normal priority for a simple, pleasant sound
        orderNumber: etapeChangeData.orderNumber,
        type: 'new_order_product',
        duration: 1800000 // 30 minutes
      });
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribeEtapeChanged();
    };
  }, [connected, subscribe, addNotification, user]);
};
