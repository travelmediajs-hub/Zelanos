import { useState, useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';

import Dashboard from './pages/Dashboard';
import PlanningPage from './pages/PlanningPage';
import ToursPage from './pages/ToursPage';
import RoundTripsPage from './pages/RoundTripsPage';
import CarRentalPage from './pages/CarRentalPage';
import CatalogPage from './pages/CatalogPage';
import GuidesPage from './pages/GuidesPage';
import GuideDossierPage from './pages/GuideDossierPage';
import StopsGuidePage from './pages/StopsGuidePage';
import FleetPage from './pages/FleetPage';
import FuelPage from './pages/FuelPage';
import StopsCarPage from './pages/StopsCarPage';
import CarTasksPage from './pages/CarTasksPage';
import FinesPage from './pages/FinesPage';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { id: 'planning', label: 'Планиране', icon: '\u{1F4C5}' },
  { group: 'ПРОДАЖБИ' },
  { id: 'tours', label: 'Турове', icon: '\u{1F5D3}' },
  { id: 'roundTrips', label: 'Обиколни турове', icon: '\u{1F30D}' },
  { id: 'carRental', label: 'Коли под наем', icon: '\u{1F511}' },
  { id: 'catalog', label: 'Каталог турове', icon: '\u{1F4E6}' },
  { group: 'ХОРА' },
  { id: 'guides', label: 'Гидове', icon: '\u{1F9D1}‍\u{1F3EB}' },
  { id: 'guideDossier', label: 'Досиета гидове', icon: '\u{1F4CB}' },
  { id: 'stopsGuide', label: 'STOP Гидове', icon: '\u{1F6AB}' },
  { group: 'ТРАНСПОРТ' },
  { id: 'fleet', label: 'Автопарк', icon: '\u{1F697}' },
  { id: 'fuel', label: 'Гориво', icon: '⛽' },
  { id: 'stopsCarBus', label: 'STOP Бус/Кола', icon: '\u{1F690}' },
  { id: 'carTasks', label: 'Задачи коли', icon: '\u{1F527}' },
  { id: 'fines', label: 'Фишове', icon: '\u{1F4DD}' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  // Дълбока навигация от таблото: {page, id?|car?} — целевата страница отваря записа и чисти целта
  const [openTarget, setOpenTarget] = useState(null);
  const openRecord = (targetPage, target) => { setOpenTarget({ page: targetPage, ...target }); setPage(targetPage); };
  const clearOpenTarget = () => setOpenTarget(null);
  const targetFor = (p) => (openTarget && openTarget.page === p ? openTarget : null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const state = useAppState();

  // Show failed Supabase writes — otherwise records look saved but vanish on reload
  useEffect(() => {
    const onSyncError = (e) => setSyncError(e.detail);
    window.addEventListener('zelanos-sync-error', onSyncError);
    return () => window.removeEventListener('zelanos-sync-error', onSyncError);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 768) setMobileMenuOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navigateTo = (id) => { setPage(id); setMobileMenuOpen(false); };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontSize:18,color:'#888',background:'#0f172a'}}>
        <span style={{color:'#fff'}}>Зареждане...</span>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage onLogin={signIn} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard tours={state.tours} onOpenRecord={openRecord} serviceRecords={state.serviceRecords} guides={state.guides} fuel={state.fuel} carTasks={state.carTasks} vehicles={state.vehicles} fines={state.fines} stopsCarBus={state.stopsCarBus} stopsGuide={state.stopsGuide} catalog={state.catalog} carRentals={state.carRentals} roundTrips={state.roundTrips} />;
      case 'planning': return <PlanningPage tours={state.tours} setTours={state.setTours} carRentals={state.carRentals} roundTrips={state.roundTrips} vehicles={state.vehicles} guides={state.guides} stopsCarBus={state.stopsCarBus} serviceRecords={state.serviceRecords} />;
      case 'catalog': return <CatalogPage catalog={state.catalog} setCatalog={state.setCatalog} />;
      case 'tours': return <ToursPage tours={state.tours} openTarget={targetFor("tours")} onOpenHandled={clearOpenTarget} setTours={state.setTours} guides={state.guides} catalog={state.catalog} vehicles={state.vehicles} roundTrips={state.roundTrips} stopsCarBus={state.stopsCarBus} tourLanguages={state.tourLanguages} setTourLanguages={state.setTourLanguages} carRentals={state.carRentals} />;
      case 'guides': return <GuidesPage guides={state.guides} setGuides={state.setGuides} />;
      case 'guideDossier': return <GuideDossierPage tours={state.tours} guides={state.guides} stopsGuide={state.stopsGuide} />;
      case 'stopsGuide': return <StopsGuidePage stops={state.stopsGuide} setStops={state.setStopsGuide} />;
      case 'fleet': return <FleetPage tours={state.tours} openTarget={targetFor("fleet")} onOpenHandled={clearOpenTarget} fuel={state.fuel} fines={state.fines} carTasks={state.carTasks} stopsCarBus={state.stopsCarBus} vehicles={state.vehicles} setVehicles={state.setVehicles} serviceRecords={state.serviceRecords} setServiceRecords={state.setServiceRecords} />;
      case 'carRental': return <CarRentalPage rentals={state.carRentals} openTarget={targetFor("carRental")} onOpenHandled={clearOpenTarget} setRentals={state.setCarRentals} vehicles={state.vehicles} roundTrips={state.roundTrips} stopsCarBus={state.stopsCarBus} tours={state.tours} serviceRecords={state.serviceRecords} />;
      case 'roundTrips': return <RoundTripsPage roundTrips={state.roundTrips} openTarget={targetFor("roundTrips")} onOpenHandled={clearOpenTarget} setRoundTrips={state.setRoundTrips} vehicles={state.vehicles} guides={state.guides} tours={state.tours} carRentals={state.carRentals} stopsCarBus={state.stopsCarBus} />;
      case 'fuel': return <FuelPage fuel={state.fuel} setFuel={state.setFuel} />;
      case 'stopsCarBus': return <StopsCarPage stops={state.stopsCarBus} openTarget={targetFor("stopsCarBus")} onOpenHandled={clearOpenTarget} setStops={state.setStopsCarBus} />;
      case 'carTasks': return <CarTasksPage tasks={state.carTasks} setTasks={state.setCarTasks} />;
      case 'fines': return <FinesPage fines={state.fines} setFines={state.setFines} />;
      default: return <Dashboard tours={state.tours} onOpenRecord={openRecord} serviceRecords={state.serviceRecords} guides={state.guides} fuel={state.fuel} carTasks={state.carTasks} vehicles={state.vehicles} fines={state.fines} stopsCarBus={state.stopsCarBus} stopsGuide={state.stopsGuide} catalog={state.catalog} carRentals={state.carRentals} roundTrips={state.roundTrips} />;
    }
  };

  const currentLabel = navItems.find(it => it.id === page)?.label || 'Dashboard';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Меню">
          <span/><span/><span/>
        </button>
        <span className="mobile-topbar-title">{currentLabel}</span>
      </div>

      {/* Sidebar overlay for mobile */}
      {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}/>}

      <div className={`sidebar${mobileMenuOpen ? ' mobile-open' : ''}`}>
        <h1><span>Zelanos Tours</span></h1>
        {navItems.map((it, i) => it.group
          ? <div key={i} className="nav-group">{it.group}</div>
          : <div key={it.id} onClick={() => navigateTo(it.id)} className={'nav-item' + (page === it.id ? ' active' : '')}>
              <span className="icon">{it.icon}</span><span className="label">{it.label}</span>
            </div>
        )}
        <div style={{borderTop:'1px solid rgba(255,255,255,.1)',margin:'16px 12px 8px',paddingTop:12}}>
          <div style={{padding:'6px 16px',fontSize:12,color:'rgba(255,255,255,.5)',overflow:'hidden',textOverflow:'ellipsis'}}>
            {user.email}
          </div>
          <div className="nav-item" onClick={signOut} style={{color:'#f87171'}}>
            <span className="icon">🚪</span><span className="label">Изход</span>
          </div>
        </div>
      </div>
      <div className="main">
        {syncError && (
          <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#dc2626',color:'#fff',padding:'10px 16px',fontSize:14,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
            <span>⚠️ ГРЕШКА ПРИ ЗАПИС В БАЗАТА ({syncError.op} — {syncError.table}): {syncError.message}. Записът НЕ е съхранен — направи снимка на този екран и кажи на Горчо!</span>
            <button onClick={() => setSyncError(null)} style={{background:'rgba(255,255,255,.2)',border:'none',color:'#fff',borderRadius:4,padding:'4px 10px',cursor:'pointer',fontWeight:700}}>✕</button>
          </div>
        )}
        {state.loading
          ? <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh',fontSize:18,color:'#888'}}>Зареждане...</div>
          : renderPage()}
      </div>
    </div>
  );
}
