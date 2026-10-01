import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import NavigationTabs from './components/NavigationTabs';
import Toast from './components/Toast';

// Pages
import OutflowPage from './pages/OutflowPage';
import InflowPage from './pages/InflowPage';
import ProductsPage from './pages/ProductsPage';
import LowStockAlertsPage from './pages/LowStockAlertsPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('saida');
  const [toast, setToast] = useState(null);
  const [preselectedProduct, setPreselectedProduct] = useState(null);

  const showToast = ({ type = 'info', message, title }) => {
    setToast({ type, message, title });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleSelectProductForOutflow = (product) => {
    setPreselectedProduct(product);
    setActiveTab('saida');
  };

  const handleSelectProductForInflow = (product) => {
    setPreselectedProduct(product);
    setActiveTab('entrada');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-semibold text-sm">Carregando Estoque Vetter...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Tablet Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Navigation Sub-Tabs */}
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Tablet Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'saida' && (
          <OutflowPage
            preselectedProduct={preselectedProduct}
            onClearPreselected={() => setPreselectedProduct(null)}
            showToast={showToast}
          />
        )}

        {activeTab === 'entrada' && (
          <InflowPage
            preselectedProduct={preselectedProduct}
            onClearPreselected={() => setPreselectedProduct(null)}
            showToast={showToast}
          />
        )}

        {activeTab === 'produtos' && (
          <ProductsPage
            onSelectProductForOutflow={handleSelectProductForOutflow}
            onSelectProductForInflow={handleSelectProductForInflow}
            showToast={showToast}
          />
        )}

        {activeTab === 'alertas' && (
          <LowStockAlertsPage
            onReplenishProduct={handleSelectProductForInflow}
            showToast={showToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigateToAlerts={() => setActiveTab('alertas')}
            showToast={showToast}
          />
        )}

        {activeTab === 'historico' && (
          <HistoryPage showToast={showToast} />
        )}

        {activeTab === 'usuarios' && (
          <UsersPage showToast={showToast} />
        )}
      </main>

      {/* Global Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
