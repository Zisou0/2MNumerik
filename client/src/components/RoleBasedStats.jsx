import React, { useState, useEffect } from 'react';
import { statisticsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const RoleBasedStats = () => {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveUpdate, setLiveUpdate] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, []);

  // Listen for real-time statistics updates
  useEffect(() => {
    if (!connected) return;

    console.log('Setting up WebSocket listener for stats updates');
    
    const unsubscribe = subscribe('statsChanged', (data) => {
      console.log('Received stats update:', data);
      // Show live update indicator
      setLiveUpdate(true);
      // Refresh statistics when updated
      fetchUserStats();
      // Hide indicator after a short delay
      setTimeout(() => setLiveUpdate(false), 2000);
    });

    return unsubscribe;
  }, [connected, subscribe]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await statisticsAPI.getUserStatsByRole();
      setStats(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
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
        return renderAtelierStats();
      case 'admin':
        // Admin can see all stats
        return (
          <div className="space-y-4">
            {renderCommercialStats()}
            {renderInfographStats()}
            {renderAtelierStats()}
          </div>
        );
      default:
        return null;
    }
  };

  const renderCommercialStats = () => {
    if (!stats.commercial) return null;

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          🏆 Top 3 Commerciaux - Commandes Produits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.commercial.ranking.map((commercial, index) => (
            <div 
              key={commercial.username}
              className={`flex items-center justify-between p-3 rounded-lg ${
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
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          🎨 Infographistes - Statistiques
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.infograph.all
            .sort((a, b) => (b.atelierOrderCount + b.serviceCreaCount) - (a.atelierOrderCount + a.serviceCreaCount))
            .map((infograph, index) => (
            <div 
              key={infograph.username}
              className={`rounded-lg p-3 hover:shadow-md transition-shadow ${
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
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          🔧 Top 3 Atelier - Commandes Produits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.atelier.ranking.map((atelierUser, index) => (
            <div 
              key={atelierUser.username}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                index === 1 ? 'bg-gray-50 border border-gray-200' :
                'bg-orange-50 border border-orange-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`text-xl ${
                  index === 0 ? 'text-blue-600' :
                  index === 1 ? 'text-gray-600' :
                  'text-purple-600'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </span>
                <div className="font-medium text-gray-900 text-sm">
                  {atelierUser.username}
                </div>
              </div>
              <div className="flex space-x-3 text-center">
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    {atelierUser.productOrderCount}
                  </div>
                  <div className="text-xs text-gray-500">
                    Cmd
                  </div>
                </div>
                
                <div className="border-l border-gray-200 pl-3">
                  <div className="text-sm font-bold text-gray-600">
                    {atelierUser.taskCount}
                  </div>
                  <div className="text-xs text-gray-500">
                    Tâches
                  </div>
                </div>
              </div>
            </div>
          ))}
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

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center">
          <div className="text-red-600 mb-1 text-sm">⚠️ Erreur</div>
          <div className="text-gray-600 text-sm mb-2">{error}</div>
          <button 
            onClick={fetchUserStats}
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
    <div className="space-y-4">
      {/* Live update indicator */}
      {liveUpdate && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Statistiques mises à jour</span>
          </div>
        </div>
      )}
      
      {getRoleBasedContent()}
    </div>
  );
};

export default RoleBasedStats;