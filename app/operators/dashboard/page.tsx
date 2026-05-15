'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RouteManager } from '@/components/operators/RouteManager';
import { getOperatorMe, operatorLogout, OperatorProfile } from '@/lib/api';
import {
  LayoutDashboard,
  Route,
  Bus,
  CalendarDays,
  BookOpen,
  LogOut,
  ChevronRight,
  Building2,
  Loader2,
} from 'lucide-react';

// ─── Tab definitions ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'routes' | 'buses' | 'trips' | 'bookings';

interface TabItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const TABS: TabItem[] = [
  { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={16} /> },
  { id: 'routes',    label: 'Routes',    icon: <Route size={16} /> },
  { id: 'buses',     label: 'Buses',     icon: <Bus size={16} />,          badge: 'Soon' },
  { id: 'trips',     label: 'Trips',     icon: <CalendarDays size={16} />, badge: 'Soon' },
  { id: 'bookings',  label: 'Bookings',  icon: <BookOpen size={16} />,     badge: 'Soon' },
];

// ─── Overview quick-action cards ─────────────────────────────────────────────

interface QuickCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
  disabled?: boolean;
}

function QuickCard({ icon, title, desc, onClick, disabled }: QuickCardProps) {
  return (
    <button
      id={`quick-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="qcard"
      onClick={onClick}
      disabled={disabled}
      style={{ textAlign: 'left', width: '100%', background: 'none', border: 'none', padding: 0 }}
    >
      <div className="qcard-inner">
        <div className="qcard-icon">{icon}</div>
        <div className="qcard-text">
          <p className="qcard-title">{title}</p>
          <p className="qcard-desc">{desc}</p>
        </div>
        <ChevronRight size={16} className="qcard-arrow" />
      </div>
    </button>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profile, onNavigate }: { profile: OperatorProfile; onNavigate: (t: Tab) => void }) {
  return (
    <div className="overview-grid">
      {/* Welcome card */}
      <div className="welcome-card">
        <div className="welcome-avatar">
          {profile.companyName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="welcome-title">Welcome back, {profile.name.split(' ')[0]}!</h2>
          <p className="welcome-sub">
            <Building2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {profile.companyName}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions-card">
        <h3 className="section-label">Quick actions</h3>
        <div className="quick-actions-list">
          <QuickCard
            icon={<Route size={18} className="text-rose-500" />}
            title="Manage routes"
            desc="View and add origin → destination pairs"
            onClick={() => onNavigate('routes')}
          />
          <QuickCard
            icon={<Bus size={18} className="text-slate-500" />}
            title="Add a bus"
            desc="Register your fleet layout and capacity"
            disabled
          />
          <QuickCard
            icon={<CalendarDays size={18} className="text-slate-500" />}
            title="Schedule a trip"
            desc="Publish a new departure on a route"
            disabled
          />
          <QuickCard
            icon={<BookOpen size={18} className="text-slate-500" />}
            title="View bookings"
            desc="See your passenger lists and payments"
            disabled
          />
        </div>
      </div>
    </div>
  );
}

// ─── Coming Soon placeholder ──────────────────────────────────────────────────

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">🚧</div>
      <p className="coming-soon-title">{label}</p>
      <p className="coming-soon-sub">This section is under construction. Check back soon!</p>
    </div>
  );
}

// ─── Main dashboard page ──────────────────────────────────────────────────────

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getOperatorMe()
      .then(setProfile)
      .catch(() => router.push('/operators/signup'))
      .finally(() => setProfileLoading(false));
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await operatorLogout();
    } finally {
      router.push('/operators/signup');
    }
  }

  return (
    <>
      <style>{`
        /* ── Operator Dashboard Scoped Styles ── */
        .dash-root { min-height: 100vh; background: #f9fafb; display: flex; flex-direction: column; }

        /* Top bar */
        .dash-topbar { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1px solid #f0f0f0; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 60px; }
        .dash-logo   { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .dash-logo-dot { width: 28px; height: 28px; background: #f43f5e; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .dash-logo-dot span { color: #fff; font-weight: 800; font-size: 13px; }
        .dash-logo-name { color: #f43f5e; font-weight: 800; font-size: 17px; letter-spacing: -0.5px; }
        .dash-logout { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #6b7280; transition: background .15s, color .15s; }
        .dash-logout:hover:not(:disabled) { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .dash-logout:disabled { opacity: .55; cursor: not-allowed; }

        /* Layout */
        .dash-body    { display: flex; flex: 1; max-width: 1200px; margin: 0 auto; width: 100%; padding: 28px 24px; gap: 24px; }
        .dash-sidebar { width: 200px; flex-shrink: 0; }
        .dash-content { flex: 1; min-width: 0; }

        /* Sidebar */
        .sidebar-nav  { display: flex; flex-direction: column; gap: 2px; }
        .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: none; background: none; cursor: pointer; font-size: 0.84rem; font-weight: 500; color: #6b7280; transition: background .12s, color .12s; width: 100%; text-align: left; position: relative; }
        .sidebar-item:hover { background: #f3f4f6; color: #111; }
        .sidebar-item.active { background: #fce7eb; color: #be123c; font-weight: 700; }
        .sidebar-badge { margin-left: auto; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; background: #f3f4f6; color: #9ca3af; border-radius: 999px; }
        .sidebar-item.active .sidebar-badge { background: #fff; color: #be123c; }

        /* Content card */
        .content-card { background: #fff; border-radius: 20px; border: 1px solid #f0f0f0; padding: 28px; }

        /* Overview */
        .overview-grid { display: flex; flex-direction: column; gap: 20px; }
        .welcome-card { display: flex; align-items: center; gap: 16px; padding: 24px; background: linear-gradient(135deg, #fff1f3, #fff); border: 1px solid #fecdd3; border-radius: 16px; }
        .welcome-avatar { width: 52px; height: 52px; background: #f43f5e; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.4rem; font-weight: 800; flex-shrink: 0; }
        .welcome-title { font-size: 1.15rem; font-weight: 700; color: #111; margin: 0 0 4px; }
        .welcome-sub   { font-size: 0.8rem; color: #9ca3af; margin: 0; display: flex; align-items: center; }
        .quick-actions-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 16px; padding: 20px; }
        .section-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #9ca3af; margin: 0 0 12px; }
        .quick-actions-list { display: flex; flex-direction: column; gap: 2px; }
        .qcard { }
        .qcard-inner { display: flex; align-items: center; gap: 14px; padding: 13px 12px; border-radius: 12px; transition: background .12s; cursor: pointer; }
        .qcard:not(:disabled) .qcard-inner:hover { background: #fce7eb; }
        .qcard:disabled .qcard-inner { opacity: .5; cursor: not-allowed; }
        .qcard-icon   { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 10px; }
        .qcard-text   { flex: 1; }
        .qcard-title  { font-size: 0.875rem; font-weight: 600; color: #111; margin: 0 0 2px; }
        .qcard-desc   { font-size: 0.77rem; color: #9ca3af; margin: 0; }
        .qcard-arrow  { color: #d1d5db; flex-shrink: 0; }

        /* Coming soon */
        .coming-soon      { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 24px; gap: 10px; text-align: center; }
        .coming-soon-icon { font-size: 2.5rem; }
        .coming-soon-title { font-size: 1rem; font-weight: 600; color: #111; margin: 4px 0 0; }
        .coming-soon-sub   { font-size: 0.82rem; color: #9ca3af; max-width: 280px; margin: 0; }

        /* Profile loading skeleton */
        .dash-profile-loading { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9fafb; }

        @media (max-width: 640px) {
          .dash-body    { flex-direction: column; padding: 16px; gap: 16px; }
          .dash-sidebar { width: 100%; }
          .sidebar-nav  { flex-direction: row; overflow-x: auto; gap: 4px; flex-wrap: nowrap; }
          .sidebar-item { white-space: nowrap; flex-shrink: 0; }
          .content-card { padding: 20px 16px; }
        }
      `}</style>

      {profileLoading ? (
        <div className="dash-profile-loading">
          <Loader2 size={32} className="text-rose-400 animate-spin" />
        </div>
      ) : (
        <div className="dash-root">
          {/* Top bar */}
          <header className="dash-topbar">
            <a href="/" className="dash-logo">
              <div className="dash-logo-dot"><span>B</span></div>
              <span className="dash-logo-name">busbnb</span>
            </a>
            <button
              id="operator-logout-btn"
              className="dash-logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </header>

          {/* Body */}
          <div className="dash-body">
            {/* Sidebar */}
            <nav className="dash-sidebar" aria-label="Dashboard navigation">
              <ul className="sidebar-nav" role="list">
                {TABS.map((tab) => (
                  <li key={tab.id}>
                    <button
                      id={`nav-${tab.id}`}
                      className={`sidebar-item${activeTab === tab.id ? ' active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.badge && <span className="sidebar-badge">{tab.badge}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Content */}
            <main className="dash-content">
              <div className="content-card">
                {activeTab === 'overview' && profile && (
                  <OverviewTab profile={profile} onNavigate={setActiveTab} />
                )}
                {activeTab === 'routes' && <RouteManager />}
                {activeTab === 'buses' && <ComingSoon label="Bus Fleet" />}
                {activeTab === 'trips' && <ComingSoon label="Trip Scheduling" />}
                {activeTab === 'bookings' && <ComingSoon label="Bookings" />}
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
