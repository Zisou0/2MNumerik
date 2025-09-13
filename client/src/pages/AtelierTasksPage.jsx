import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { atelierTaskAPI, orderAPI, userAPI } from '../utils/api';
import Button from '../components/ButtonComponent';
import AlertDialog from '../components/AlertDialog';
import { useAuth } from '../contexts/AuthContext';
import UserSelector from '../components/UserSelector';

const AtelierTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [atelierUsers, setAtelierUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    atelier_type: ''
  });

  const statusOptions = [
    { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-800' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Faible', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Moyen', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'Élevé', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const atelierTypeOptions = [
    { value: 'type_extern', label: 'Type Externe' },
    { value: 'type_intern', label: 'Type Interne' }
  ];

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = { 
        ...filters
      };
      
      // Only exclude completed and cancelled tasks if no specific status filter is applied
      if (!filters.status) {
        params.exclude_status = 'completed,cancelled';
      }
      
      Object.keys(params).forEach(key => params[key] === '' && delete params[key]);
      
      const response = await atelierTaskAPI.getTasks(params);
      setTasks(response.tasks);
    } catch (err) {
      setError('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const fetchAtelierUsers = async () => {
    try {
      const response = await userAPI.getUsers({ role: 'atelier' });
      setAtelierUsers(response.users || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs atelier:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchAtelierUsers();
  }, [filters]);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowCreateModal(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDelete) {
      try {
        await atelierTaskAPI.deleteTask(taskToDelete);
        fetchTasks();
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

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await atelierTaskAPI.updateTaskStatus(taskId, { status: newStatus });
      fetchTasks();
    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await atelierTaskAPI.updateTask(taskId, { 
        started_at: new Date().toISOString(),
        status: 'in_progress'
      });
      fetchTasks();
    } catch (err) {
      setError('Erreur lors du démarrage de la tâche');
    }
  };

  const handleEndTask = async (taskId) => {
    setTaskToComplete(taskId);
    setShowCompleteDialog(true);
  };

  const confirmCompleteTask = async () => {
    if (taskToComplete) {
      try {
        await atelierTaskAPI.updateTask(taskToComplete, { 
          completed_at: new Date().toISOString(),
          status: 'completed'
        });
        fetchTasks();
        setShowCompleteDialog(false);
        setTaskToComplete(null);
      } catch (err) {
        setError('Erreur lors de la finalisation de la tâche');
        setShowCompleteDialog(false);
        setTaskToComplete(null);
      }
    }
  };

  const cancelCompleteTask = () => {
    setShowCompleteDialog(false);
    setTaskToComplete(null);
  };

  const getStatusLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const getAtelierTypeLabel = (type) => {
    const option = atelierTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getAtelierTypeColor = (type) => {
    switch (type) {
      case 'type_extern':
        return 'bg-orange-100 text-orange-800';
      case 'type_intern':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const isOverdue = (dueDate, status) => {
    // No longer using due dates, so always return false
    return false;
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des tâches...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Gestion des tâches d'atelier</h1>
        
        {/* Filters and Actions */}
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
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

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

              {/* Clear Filters Button */}
              {(filters.search || filters.status || filters.atelier_type) && (
                <button
                  onClick={() => setFilters({
                    search: '',
                    status: '',
                    atelier_type: ''
                  })}
                  className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-shrink-0">
              {(user?.role === 'admin' || user?.role === 'atelier') && (
                <Link to="/history-atelier-tasks">
                  <Button variant="secondary">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Historique
                  </Button>
                </Link>
              )}
              <Button onClick={handleCreateTask}>
                Nouvelle tâche
              </Button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type de tâche
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tâche
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigné à
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className={isOverdue(task.due_date, task.status) ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-1 whitespace-nowrap">
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 ${getAtelierTypeColor(task.atelier_type)}`}>
                        {getAtelierTypeLabel(task.atelier_type)}
                      </span>
                    </td>
                    <td className="px-6 py-1">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-900">
                      {Array.isArray(task.assigned_to) && task.assigned_to.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.assigned_to.map((username, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {username}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm">
                      {task.started_at ? (
                        <span className="text-green-600 font-medium">
                          {formatDate(task.started_at)}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartTask(task.id)}
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg transition-all duration-200 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 6h6" />
                          </svg>
                          Démarrer
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm">
                      {task.completed_at ? (
                        <span className="text-blue-600 font-medium">
                          {formatDate(task.completed_at)}
                        </span>
                      ) : task.started_at ? (
                        <button
                          onClick={() => handleEndTask(task.id)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-all duration-200 text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Terminer
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap">
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Modifier
                      </button>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <AlertDialog
          isOpen={showDeleteDialog}
          onClose={cancelDeleteTask}
          onConfirm={confirmDeleteTask}
          title="Supprimer la tâche"
          message="Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible."
          confirmText="Supprimer"
          cancelText="Annuler"
          type="danger"
        />
      )}

      {/* Complete Task Confirmation Dialog */}
      {showCompleteDialog && (
        <AlertDialog
          isOpen={showCompleteDialog}
          onClose={cancelCompleteTask}
          onConfirm={confirmCompleteTask}
          title="Terminer la tâche"
          message="Êtes-vous sûr de vouloir marquer cette tâche comme terminée ? Elle sera déplacée vers l'historique."
          confirmText="Confirmer"
          cancelText="Annuler"
          type="success"
        />
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <TaskModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          atelierUsers={atelierUsers}
          onSave={() => {
            fetchTasks();
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedTask(null);
          }}
          statusOptions={statusOptions}
          atelierTypeOptions={atelierTypeOptions}
        />
      )}
    </div>
  );
};

// Task Modal Component
const TaskModal = ({ isOpen, onClose, task, atelierUsers, onSave, statusOptions, atelierTypeOptions }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: [],
    status: 'pending',
    atelier_type: 'type_extern',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigned_to: Array.isArray(task.assigned_to) ? task.assigned_to : (task.assigned_to ? [task.assigned_to] : []),
        status: task.status || 'pending',
        atelier_type: task.atelier_type || 'type_extern',
        notes: task.notes || ''
      });
    } else {
      // For new tasks, always default to 'pending' status (which displays as "En attente")
      setFormData({
        title: '',
        description: '',
        assigned_to: [],
        status: 'pending', // Default status for new tasks
        atelier_type: 'type_extern',
        notes: ''
      });
    }
  }, [task]);  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setError('Le titre est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const submitData = {
        ...formData
      };

      if (task) {
        await atelierTaskAPI.updateTask(task.id, submitData);
      } else {
        await atelierTaskAPI.createTask(submitData);
      }

      onSave();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ background: 'rgba(75, 85, 99, 50%)' }}>
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigné à
              </label>
              <UserSelector
                selectedUsers={formData.assigned_to}
                onChange={(users) => setFormData({ ...formData, assigned_to: users })}
                users={atelierUsers.map(user => user.username)}
                placeholder="Sélectionner des utilisateurs..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-600">
                {statusOptions.find(opt => opt.value === formData.status)?.label || formData.status}
              </div>
              <p className="text-xs text-gray-500 mt-1">Le statut est géré automatiquement par les boutons d'action</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de tâche
              </label>
              <select
                value={formData.atelier_type}
                onChange={(e) => setFormData({ ...formData, atelier_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {atelierTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
            >
              {saving ? 'Sauvegarde...' : (task ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AtelierTasksPage;
