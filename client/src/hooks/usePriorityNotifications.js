import { useEffect, useRef } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

// Hook to monitor priority changes and trigger notifications
export const usePriorityNotifications = (orders) => {
  const { addNotification } = useNotifications();
  const previousOrdersRef = useRef({});
  const overdueReminderRef = useRef({});
  const currentOrdersRef = useRef(orders); // Store current orders in ref

  // Update the ref whenever orders change
  useEffect(() => {
    currentOrdersRef.current = orders;
  }, [orders]);

  // Function to determine priority level based on delivery deadline and estimated work time
  const getPriorityLevel = (orderProductRow) => {
    const { statut, date_limite_livraison_estimee, estimated_work_time_minutes } = orderProductRow;
    
    // If status is finished, return normal priority (no urgent notifications)
    if (statut === 'termine' || statut === 'livre') {
      return 'normal';
    }
    
    // If no deadline date, normal priority
    if (!date_limite_livraison_estimee) {
      return 'normal';
    }
    
    const now = new Date();
    const deadline = new Date(date_limite_livraison_estimee);
    
    // Calculate work time in milliseconds (default to 2 hours if not specified)
    const workTimeMs = estimated_work_time_minutes ? estimated_work_time_minutes * 60 * 1000 : 2 * 60 * 60 * 1000;
    
    // Calculate the latest start time (deadline - work time needed)
    const latestStartTime = new Date(deadline.getTime() - workTimeMs);
    
    // Calculate time until we must start working
    const timeUntilMustStart = latestStartTime - now;
    
    // Determine urgency level - map numeric urgency to priority names
    if (timeUntilMustStart < 0) {
      return 'overdue'; // Most urgent - past the time we should have started (RED)
    } else if (timeUntilMustStart <= 30 * 60 * 1000) {
      return 'urgent'; // Very urgent - 30 minutes or less before must start (ORANGE)
    } else if (timeUntilMustStart <= 60 * 60 * 1000) {
      return 'high'; // Urgent - 1 hour or less before must start (YELLOW)
    } else {
      return 'normal'; // Normal - enough time available (GRAY)
    }
  };

  // Function to check if order is overdue (past the time we should have started working)
  const isOrderOverdue = (orderProductRow) => {
    const { statut, date_limite_livraison_estimee, estimated_work_time_minutes } = orderProductRow;
    
    if (!date_limite_livraison_estimee || statut === 'termine' || statut === 'livre') {
      return false;
    }
    
    const now = new Date();
    const deadline = new Date(date_limite_livraison_estimee);
    
    // Calculate work time in milliseconds (default to 2 hours if not specified)
    const workTimeMs = estimated_work_time_minutes ? estimated_work_time_minutes * 60 * 1000 : 2 * 60 * 60 * 1000;
    
    // Calculate the latest start time (deadline - work time needed)
    const latestStartTime = new Date(deadline.getTime() - workTimeMs);
    
    // Order is overdue if we're past the latest start time
    return now > latestStartTime;
  };

  // Setup periodic reminders for overdue orders
  useEffect(() => {
    const setupOverdueReminders = () => {
      if (!orders || orders.length === 0) return;

      orders.forEach(order => {
        if (isOrderOverdue(order)) {
          const orderId = order.id;
          
          // Clear existing reminder if any
          if (overdueReminderRef.current[orderId]) {
            clearInterval(overdueReminderRef.current[orderId]);
          }

          // Set up new reminder every 1 minute for overdue orders
          overdueReminderRef.current[orderId] = setInterval(() => {
            // Get fresh order data from current orders ref
            const currentOrder = currentOrdersRef.current?.find(o => o.id === orderId);
            if (!currentOrder) {
              // Order no longer exists, clear interval
              clearInterval(overdueReminderRef.current[orderId]);
              delete overdueReminderRef.current[orderId];
              return;
            }

            // Check if order is still overdue and not completed
            if (isOrderOverdue(currentOrder)) {
              const deadline = new Date(currentOrder.date_limite_livraison_estimee);
              const workTimeMs = currentOrder.estimated_work_time_minutes ? 
                currentOrder.estimated_work_time_minutes * 60 * 1000 : 2 * 60 * 60 * 1000;
              const latestStartTime = new Date(deadline.getTime() - workTimeMs);
              const now = new Date();
              const minutesOverdue = Math.ceil((now - latestStartTime) / (1000 * 60));
              
              addNotification({
                title: `🚨 COMMANDE EN RETARD - ${currentOrder.numero_pms}`,
                message: `Travail devrait avoir commencé il y a ${minutesOverdue} min ! Échéance: ${new Date(deadline).toLocaleString('fr-FR')}`,
                priority: 'overdue',
                orderNumber: currentOrder.numero_pms,
                type: 'overdue_reminder',
                duration: 600000 // 10 minutes for overdue reminders
              });
            } else {
              console.log(`✅ Order ${currentOrder.numero_pms} no longer overdue, clearing reminder`);
              // Order is no longer overdue, clear interval
              clearInterval(overdueReminderRef.current[orderId]);
              delete overdueReminderRef.current[orderId];
            }
          },  30 * 1000); // 3 minutes for red/overdue orders
        } else {
          // Clear reminder if order is no longer overdue
          const orderId = order.id;
          if (overdueReminderRef.current[orderId]) {
            clearInterval(overdueReminderRef.current[orderId]);
            delete overdueReminderRef.current[orderId];
          }
        }
      });
    };

    setupOverdueReminders();

    // Cleanup function
    return () => {
      Object.values(overdueReminderRef.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      overdueReminderRef.current = {};
    };
  }, [orders, addNotification]);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    orders.forEach(order => {
      const currentPriority = getPriorityLevel(order); // Use the correct priority function
      const previousPriority = previousOrdersRef.current[order.id]?.priority;
      const previousStatus = previousOrdersRef.current[order.id]?.status;

      // Check for priority level changes (color changes)
      if (previousPriority && previousPriority !== currentPriority) {
        const priorityMessages = {
          overdue: '🚨 URGENT - Temps de démarrage dépassé !',
          urgent: '⚠️ URGENT - Doit commencer dans 30 min ou moins !',
          high: '🟡 ATTENTION - Doit commencer dans 1h ou moins !',
          normal: 'Commande revenue à un délai normal'
        };

        addNotification({
          title: `Changement de priorité - ${order.numero_pms}`,
          message: priorityMessages[currentPriority],
          priority: currentPriority,
          orderNumber: order.numero_pms,
          type: 'priority_change',
          duration: 1800000 // All notifications last 30 minutes
        });
      }

      // Check for status changes that might affect priority
      if (previousStatus && previousStatus !== order.statut) {
        // Notify on status changes to urgent priorities
        if (currentPriority === 'overdue' || currentPriority === 'urgent' || currentPriority === 'high') {
          const statusMessages = {
            'problem_technique': 'Problème technique',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'livre': 'Livré',
            'annule': 'Annulé'
          };

          addNotification({
            title: `Statut modifié - ${order.numero_pms}`,
            message: `Nouveau statut: ${statusMessages[order.statut] || order.statut}`,
            priority: currentPriority,
            orderNumber: order.numero_pms,
            type: 'status_change',
            duration: 1800000 // 30 minutes for status changes
          });
        }
      }

      // Update the reference with current values
      previousOrdersRef.current[order.id] = {
        priority: currentPriority,
        status: order.statut,
        deadline: order.date_limite_livraison_estimee
      };
    });

    // Clean up references for orders that no longer exist
    const currentOrderIds = new Set(orders.map(order => order.id));
    Object.keys(previousOrdersRef.current).forEach(orderId => {
      if (!currentOrderIds.has(parseInt(orderId))) {
        delete previousOrdersRef.current[orderId];
        // Also clear any overdue reminders for deleted orders
        if (overdueReminderRef.current[orderId]) {
          clearInterval(overdueReminderRef.current[orderId]);
          delete overdueReminderRef.current[orderId];
        }
      }
    });

  }, [orders, addNotification]);

  // Function to manually check for urgent orders (can be called periodically)
  const checkUrgentOrders = () => {
    if (!orders) return;

    const urgentOrders = orders.filter(order => {
      const priority = getPriorityLevel(order);
      return (priority === 'overdue' || priority === 'urgent') && order.statut !== 'termine' && order.statut !== 'livre';
    });

    const overdueOrders = urgentOrders.filter(order => isOrderOverdue(order));

    if (urgentOrders.length > 0) {
      const message = overdueOrders.length > 0 
        ? `${overdueOrders.length} commande(s) EN RETARD et ${urgentOrders.length - overdueOrders.length} commande(s) urgente(s)`
        : `${urgentOrders.length} commande(s) urgente(s) - Vérifiez les échéances`;

      addNotification({
        title: `⚠️ ${urgentOrders.length} commande(s) nécessitent votre attention`,
        message,
        priority: overdueOrders.length > 0 ? 'overdue' : 'urgent',
        type: 'urgent_reminder',
        duration: 1800000 // 30 minutes for urgent reminders
      });
    }
  };

  return { checkUrgentOrders };
};
