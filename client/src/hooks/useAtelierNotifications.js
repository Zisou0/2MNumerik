import { useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

// Hook to handle real-time notifications for atelier users when orders become ready for printing
export const useAtelierNotifications = () => {
  const { subscribe, connected } = useWebSocket();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    // Only set up notifications for atelier users
    if (!connected || !user || user.role !== 'atelier') {
      return;
    }

    // Subscribe to the orderEtapeChanged event
    const unsubscribeEtapeChanged = subscribe('orderEtapeChanged', (etapeChangeData) => {
      // Only handle impression notifications for atelier users
      if (etapeChangeData.toEtape === 'impression') {
        // Create notification for the atelier user
        const message = `${etapeChangeData.orderNumber} - ${etapeChangeData.client}${etapeChangeData.productName ? ` | ${etapeChangeData.productName}` : ''} prêt pour impression`;
        
        addNotification({
          title: '🖨️ Nouveau travail d\'impression !',
          message: message,
          priority: 'atelier', // Use specific atelier priority for the pleasant sound
          orderNumber: etapeChangeData.orderNumber,
          type: 'impression_ready',
          duration: 1800000 // 30 minutes
        });
      }
    });

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribeEtapeChanged();
    };
  }, [connected, subscribe, addNotification, user]);
};
