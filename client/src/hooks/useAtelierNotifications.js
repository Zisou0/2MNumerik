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
        addNotification({
          title: '🖨️ Nouveau travail d\'impression !',
          message: `${etapeChangeData.orderNumber} - ${etapeChangeData.client}${etapeChangeData.productName ? ` | ${etapeChangeData.productName}` : ''} est prêt pour impression`,
          priority: 'high', // Use high priority for new work availability
          orderNumber: etapeChangeData.orderNumber,
          type: 'etape_change_impression',
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
