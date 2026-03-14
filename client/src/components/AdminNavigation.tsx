import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AdminNavigationProps {
  onLogout: () => void;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ onLogout }) => {
  const location = useLocation();

  const navigationItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'User Management', icon: '👥' },
    { path: '/admin/readings', label: 'Reading Sessions', icon: '👁️' },
    { path: '/admin/transactions', label: 'Financial Ledger', icon: '💰' },
    { path: '/admin/forum', label: 'Forum Moderation', icon: '💬' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gray-900 text-white w-64 min-h-screen fixed left-0 top-0 border-r border-gray-800">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-8 flex items-center">
          <span className="mr-2">🔮</span>
          SoulSeer Admin
        </h1>
        
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path) 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="w-5 h-5 mr-3 text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="flex items-center px-4 py-3 w-full text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <span className="w-5 h-5 mr-3 text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavigation;