import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { atelierTaskAPI } from '../utils/api';
import Button from '../components/ButtonComponent';
import AlertDialog from '../components/AlertDialog';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import WebSocketStatus from '../components/WebSocketStatus';

const HistoryAtelierTasksPage = () => {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null); // ID of task being edited
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    atelier_type: '',
    assigned_to: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTasks: 0
  });
  const [stats, setStats] = useState({});

  // All status options available for admin editing
  const allStatusOptions = [
    { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Terminé', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Annulé', color: 'bg-red-100 text-red-800' }
  ];

  // Only completed and cancelled tasks are shown in history by default
  const historyStatusOptions = [
    { value: 'completed', label: 'Terminé', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Annulé', color: 'bg-red-100 text-red-800' }
  ];

  const atelierTypeOptions = [
    { value: 'type_extern', label: 'Type Extern' },
    { value: 'type_intern', label: 'Type Intern' }
  ];

  const fetchHistoryTasks = async (page = 1) => {
    try {
      setLoading(true);
      
      // Always fetch only completed and cancelled tasks for history
      // But admins can edit status to move tasks back to other statuses
      const historyFilters = {
        ...filters,
        status: 'completed,cancelled', // Filter for history tasks only
        page,
        limit: 10
      };

      // Remove empty filters
      Object.keys(historyFilters).forEach(key => {
        if (historyFilters[key] === '') {
          delete historyFilters[key];
        }
      });

      const response = await atelierTaskAPI.getTasks(historyFilters);
      setTasks(response.tasks || []);
      setPagination(response.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalTasks: 0
      });
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique des tâches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryStats = async () => {
    try {
      // Get stats for completed and cancelled tasks only
      const response = await atelierTaskAPI.getTaskStats({ status: 'completed,cancelled' });
      setStats(response.stats || {
        completed: 0,
        cancelled: 0,
        total: 0
      });
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  useEffect(() => {
    fetchHistoryTasks();
    fetchHistoryStats();
  }, [filters]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!connected) return;

    const unsubscribeTaskUpdated = subscribe('atelierTaskUpdated', (updatedTask) => {
      console.log('Real-time: Atelier task updated in history', updatedTask);
      
      // Check if the updated task is still in history status or moved out
      if (updatedTask.status === 'completed' || updatedTask.status === 'cancelled') {
        // Update the task in the list if it's still in history
        setTasks(prevTasks => {
          const taskExists = prevTasks.find(task => task.id === updatedTask.id);
          if (taskExists) {
            return prevTasks.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            );
          } else {
            // Task was moved back to history, refresh the list
            fetchHistoryTasks(pagination.currentPage);
            return prevTasks;
          }
        });
        fetchHistoryStats();
      } else {
        // Task moved out of history (back to pending/in_progress), remove it
        setTasks(prevTasks => prevTasks.filter(task => task.id !== updatedTask.id));
        fetchHistoryStats();
      }
    });

    const unsubscribeTaskDeleted = subscribe('atelierTaskDeleted', (deletedTaskData) => {
      console.log('Real-time: Atelier task deleted from history', deletedTaskData);
      
      setTasks(prevTasks => prevTasks.filter(task => task.id !== deletedTaskData.id));
      fetchHistoryStats();
    });

    return () => {
      unsubscribeTaskUpdated();
      unsubscribeTaskDeleted();
    };
  }, [connected, subscribe, pagination.currentPage]);

  const handleDeleteTask = async (taskId) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      try {
        await atelierTaskAPI.deleteTask(taskToDelete);
        fetchHistoryTasks(pagination.currentPage);
        fetchHistoryStats();
        setShowDeleteDialog(false);
        setTaskToDelete(null);
      } catch (err) {
        setError('Erreur lors de la suppression');
        setShowDeleteDialog(false);
        setTaskToDelete(null);
      }
    }
  };

  const cancelDeleteTask = () => {
    setShowDeleteDialog(false);
    setTaskToDelete(null);
  };

  const getStatusLabel = (status) => {
    const option = allStatusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getStatusColor = (status) => {
    const option = allStatusOptions.find(opt => opt.value === status);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const handleStatusEdit = (taskId) => {
    if (canEditStatus()) {
      setEditingStatus(taskId);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setUpdatingStatus(true);
      setError(''); // Clear any previous errors
      await atelierTaskAPI.updateTaskStatus(taskId, { status: newStatus });
      
      // Update the task in the local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      // Refresh stats
      fetchHistoryStats();
      setEditingStatus(null);
    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const cancelStatusEdit = () => {
    setEditingStatus(null);
  };

  const getAtelierTypeLabel = (type) => {
    const option = atelierTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRowBackgroundClass = (task) => {
    if (task.status === 'completed') {
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400';
    } else if (task.status === 'cancelled') {
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-400';
    }
    return 'bg-gray-50 hover:bg-gray-100';
  };

  const canDeleteTasks = () => {
    // Only admin users can delete history tasks
    return user && user.role === 'admin';
  };

  const canEditStatus = () => {
    // Only admin users can edit status in history
    return user && user.role === 'admin';
  };

  const canViewHistory = () => {
    // Both admin and atelier users can view history
    return user && (user.role === 'admin' || user.role === 'atelier');
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement de l'historique des tâches...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Historique des tâches d'atelier</h1>
            <WebSocketStatus />
          </div>
          <Link to="/atelier-tasks">
            <Button variant="secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Retour aux tâches
            </Button>
          </Link>
        </div>
        
        {/* Admin/Atelier Info Message */}
        {user?.role === 'atelier' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                <strong>Mode consultation :</strong> Vous pouvez consulter l'historique de toutes les tâches d'atelier terminées et annulées.
              </span>
            </div>
          </div>
        )}
        {canEditStatus() && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                <strong>Mode administrateur :</strong> Vous pouvez cliquer sur le statut d'une tâche pour le modifier en cas d'erreur humaine.
              </span>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
            <div className="text-2xl font-bold text-gray-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total historique</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
            <div className="text-sm text-gray-600">Terminées</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled || 0}</div>
            <div className="text-sm text-gray-600">Annulées</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              <input
                type="text"
                placeholder="Titre, description, notes..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />

              <select
                value={filters.atelier_type}
                onChange={(e) => setFilters({ ...filters, atelier_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Tous les types de tâche</option>
                {atelierTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Assigné à..."
                value={filters.assigned_to}
                onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />

              {/* Clear Filters Button */}
              {(filters.search || filters.atelier_type || filters.assigned_to) && (
                <button
                  onClick={() => setFilters({
                    search: '',
                    atelier_type: '',
                    assigned_to: ''
                  })}
                  className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Tasks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tâche
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigné à
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type de tâche
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date début
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date fin
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  {canDeleteTasks() && (
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className={`transition-colors duration-200 ${getRowBackgroundClass(task)}`}>
                    <td className="px-6 py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                        )}
                        {task.notes && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                            Notes: {task.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                      {task.assigned_to || '-'}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                      {getAtelierTypeLabel(task.atelier_type)}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(task.started_at)}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(task.completed_at)}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      {editingStatus === task.id ? (
                        <div className="flex items-center gap-2">
                          {updatingStatus ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-xs text-gray-600">Mise à jour...</span>
                            </div>
                          ) : (
                            <>
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500"
                              >
                                {allStatusOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={cancelStatusEdit}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span 
                          className={`text-xs font-semibold rounded-full px-2 py-1 ${getStatusColor(task.status)} ${
                            canEditStatus() ? 'cursor-pointer hover:opacity-80' : ''
                          }`}
                          onClick={() => handleStatusEdit(task.id)}
                          title={canEditStatus() ? 'Cliquez pour modifier le statut' : ''}
                        >
                          {getStatusLabel(task.status)}
                          {canEditStatus() && (
                            <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(task.createdAt)}
                    </td>
                    {canDeleteTasks() && (
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white">
              Aucune tâche trouvée dans l'historique
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => fetchHistoryTasks(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => fetchHistoryTasks(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage <span className="font-medium">{((pagination.currentPage - 1) * 10) + 1}</span> à{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * 10, pagination.totalTasks)}
                    </span>{' '}
                    sur <span className="font-medium">{pagination.totalTasks}</span> tâches
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: pagination.totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => fetchHistoryTasks(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.currentPage === i + 1
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <AlertDialog
          isOpen={showDeleteDialog}
          onClose={cancelDeleteTask}
          onConfirm={confirmDeleteTask}
          title="Supprimer la tâche"
          message="Êtes-vous sûr de vouloir supprimer définitivement cette tâche ? Cette action est irréversible."
          confirmText="Supprimer"
          cancelText="Annuler"
          type="danger"
        />
      )}
    </div>
  );
};

export default HistoryAtelierTasksPage;
