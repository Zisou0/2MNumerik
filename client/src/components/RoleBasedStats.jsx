import React, { useState, useEffect } from 'react';
import { statisticsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const RoleBasedStats = () => {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [liveUpdate, setLiveUpdate] = useState(false);

  useEffect(() => {
    fetchUserStats(true);
  }, []);

  // Listen for real-time statistics updates
  useEffect(() => {
    if (!connected) return;

    console.log('Setting up WebSocket listener for stats updates');
    
    const unsubscribe = subscribe('statsChanged', (data) => {
      console.log('Received stats update:', data);
      // Show live update indicator
      setLiveUpdate(true);
      // Refresh statistics when updated (without showing loading spinner)
      fetchUserStats(false);
      // Hide indicator after a short delay
      setTimeout(() => setLiveUpdate(false), 2000);
    });

    return unsubscribe;
  }, [connected, subscribe]);

  const fetchUserStats = async (isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load
      if (isInitialLoad) {
        setLoading(true);
      } else {
        // For updates, use a separate updating state
        setUpdating(true);
      }
      
      const response = await statisticsAPI.getUserStatsByRole();
      setStats(response.data);
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  const getRoleBasedContent = () => {
    if (!stats || !user) return null;

    switch (user.role) {
      case 'commercial':
        return renderCommercialStats();
      case 'infograph':
        return renderInfographStats();
      case 'atelier':
        return (
          <div className="space-y-4">
            {renderAtelierStats()}
            {renderAtelierFinitionsStats()}
          </div>
        );
      case 'admin':
        // Admin can see all stats
        return (
          <div className="space-y-4">
            {renderCommercialStats()}
            {renderInfographStats()}
            {renderAtelierStats()}
            {renderAtelierFinitionsStats()}
          </div>
        );
      default:
        return null;
    }
  };

  const renderCommercialStats = () => {
    if (!stats.commercial) return null;

    return (
      <div className="bg-white rounded-lg shadow p-4" key="commercial-stats">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          🏆 Top 3 Commerciaux - Commandes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.commercial.ranking.map((commercial, index) => (
            <div 
              key={`commercial-${commercial.username}-${commercial.productOrderCount}`}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                index === 1 ? 'bg-gray-50 border border-gray-200' :
                'bg-orange-50 border border-orange-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`text-xl ${
                  index === 0 ? 'text-yellow-600' :
                  index === 1 ? 'text-gray-600' :
                  'text-orange-600'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </span>
                <div className="font-medium text-gray-900 text-sm">
                  {commercial.username}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {commercial.productOrderCount}
                </div>
                <div className="text-xs text-gray-500">
                  commandes
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderInfographStats = () => {
    if (!stats.infograph) return null;

    return (
      <div className="bg-white rounded-lg shadow p-4" key="infograph-stats">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          🎨 Infographistes - Statistiques
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.infograph.all
            .sort((a, b) => (b.atelierOrderCount + b.serviceCreaCount) - (a.atelierOrderCount + a.serviceCreaCount))
            .map((infograph, index) => (
            <div 
              key={`infograph-${infograph.username}-${infograph.atelierOrderCount}-${infograph.serviceCreaCount}`}
              className={`rounded-lg p-3 hover:shadow-md transition-all duration-200 ${
                index === 0 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200' :
                index === 1 ? 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200' :
                index === 2 ? 'bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200' :
                'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900 text-sm">
                  {infograph.username}
                </div>
                {index <= 2 && (
                  <span className={`text-lg ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-600' :
                    'text-orange-600'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>
              
              <div className="bg-white rounded-md p-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-blue-600">
                      {infograph.atelierOrderCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Atelier
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold text-green-600">
                      {infograph.serviceCreaCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Créa
                    </div>
                  </div>
                  
                  <div className="border-l border-purple-200 pl-2">
                    <div className="text-sm font-bold text-purple-600">
                      {infograph.atelierOrderCount + infograph.serviceCreaCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAtelierStats = () => {
    if (!stats.atelier) return null;

    return (
      <div className="bg-white rounded-lg shadow p-4" key="atelier-stats">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Statistique impression
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.atelier.all
            .sort((a, b) => (b.productOrderCount + b.taskCount) - (a.productOrderCount + a.taskCount))
            .slice(0, 3)
            .map((atelierUser, index) => (
            <div 
              key={`atelier-${atelierUser.username}-${atelierUser.productOrderCount}-${atelierUser.taskCount}`}
              className={`rounded-lg p-3 hover:shadow-md transition-all duration-200 ${
                index === 0 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200' :
                index === 1 ? 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200' :
                index === 2 ? 'bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200' :
                'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900 text-sm">
                  {atelierUser.username}
                </div>
                {index <= 2 && (
                  <span className={`text-lg ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-600' :
                    'text-orange-600'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>
              
              <div className="bg-white rounded-md p-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-blue-600">
                      {atelierUser.productOrderCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Impression
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold text-green-600">
                      {atelierUser.taskCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Tâches
                    </div>
                  </div>
                  
                  <div className="border-l border-blue-200 pl-2">
                    <div className="text-sm font-bold text-blue-600">
                      {atelierUser.productOrderCount + atelierUser.taskCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAtelierFinitionsStats = () => {
    if (!stats.atelierFinitions) return null;

    return (
      <div className="bg-white rounded-lg shadow p-4" key="atelier-finitions-stats">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Statistique finition
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.atelierFinitions.all && stats.atelierFinitions.all.length > 0 ? (
            stats.atelierFinitions.all
              .sort((a, b) => ((b.finitionCount || 0) + (b.taskCount || 0)) - ((a.finitionCount || 0) + (a.taskCount || 0)))
              .slice(0, 3)
              .map((atelierUser, index) => (
              <div 
                key={`atelier-finitions-${atelierUser.username}-${atelierUser.finitionCount || 0}-${atelierUser.taskCount || 0}`}
                className={`rounded-lg p-3 hover:shadow-md transition-all duration-200 ${
                  index === 0 ? 'bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200' :
                  index === 1 ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200' :
                  index === 2 ? 'bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200' :
                  'bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 text-sm">
                    {atelierUser.username}
                  </div>
                  {index <= 2 && (
                    <span className={`text-lg ${
                      index === 0 ? 'text-purple-600' :
                      index === 1 ? 'text-indigo-600' :
                      'text-pink-600'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
                
                <div className="bg-white rounded-md p-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-purple-600">
                        {atelierUser.finitionCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Finition
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-bold text-green-600">
                        {atelierUser.taskCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        Tâches
                      </div>
                    </div>
                    
                    <div className="border-l border-purple-200 pl-2">
                      <div className="text-sm font-bold text-purple-600">
                        {(atelierUser.finitionCount || 0) + (atelierUser.taskCount || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-4">
              Aucune finition assignée ce mois-ci
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center">
          <div className="text-red-600 mb-1 text-sm">⚠️ Erreur</div>
          <div className="text-gray-600 text-sm mb-2">{error}</div>
          <button 
            onClick={() => fetchUserStats(true)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center text-gray-500 text-sm">
          Aucune statistique disponible
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Live update indicator */}
      {(liveUpdate || updating) && (
        <div className="absolute top-0 right-0 z-10 bg-green-100 border border-green-300 rounded-full px-3 py-1 text-xs text-green-700 flex items-center space-x-1 shadow-sm">
          {updating && (
            <div className="animate-spin rounded-full h-3 w-3 border border-green-600 border-t-transparent"></div>
          )}
          <span>{updating ? 'Mise à jour...' : '✓ Mis à jour'}</span>
        </div>
      )}
      
      {/* Error banner for failed updates (non-blocking) */}
      {error && stats && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-sm">⚠️</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
          <button 
            onClick={() => fetchUserStats(false)}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}
      
      {/* Main content with stable layout */}
      <div className={`transition-opacity duration-200 ${updating ? 'opacity-75' : 'opacity-100'}`}>
        {getRoleBasedContent()}
      </div>
    </div>
  );
};

export default RoleBasedStats;