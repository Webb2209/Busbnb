'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RouteManager } from '@/components/operators/RouteManager';
import { getOperatorMe, operatorLogout, OperatorProfile } from '@/lib/api';
import styles from './dashboard.module.css';
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
      className={styles.qcard}
      onClick={onClick}
      disabled={disabled}
    >
      <div className={styles.qcardInner}>
        <div className={styles.qcardIcon}>{icon}</div>
        <div className={styles.qcardText}>
          <p className={styles.qcardTitle}>{title}</p>
          <p className={styles.qcardDesc}>{desc}</p>
        </div>
        <ChevronRight size={16} className={styles.qcardArrow} />
      </div>
    </button>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profile, onNavigate }: { profile: OperatorProfile; onNavigate: (t: Tab) => void }) {
  return (
    <div className={styles.overviewGrid}>
      {/* Welcome card */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeAvatar}>
          {profile.companyName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className={styles.welcomeTitle}>Welcome back, {profile.name.split(' ')[0]}!</h2>
          <p className={styles.welcomeSub}>
            <Building2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {profile.companyName}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.quickActionsCard}>
        <h3 className={styles.sectionLabel}>Quick actions</h3>
        <div className={styles.quickActionsList}>
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
    <div className={styles.comingSoon}>
      <div className={styles.comingSoonIcon}>🚧</div>
      <p className={styles.comingSoonTitle}>{label}</p>
      <p className={styles.comingSoonSub}>This section is under construction. Check back soon!</p>
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
      {profileLoading ? (
        <div className={styles.dashProfileLoading}>
          <Loader2 size={32} className="text-rose-400 animate-spin" />
        </div>
      ) : (
        <div className={styles.dashRoot}>
          {/* Top bar */}
          <header className={styles.dashTopbar}>
            <a href="/" className={styles.dashLogo}>
              <div className={styles.dashLogoDot}><span>B</span></div>
              <span className={styles.dashLogoName}>busbnb</span>
            </a>
            <button
              id="operator-logout-btn"
              className={styles.dashLogout}
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </header>

          {/* Body */}
          <div className={styles.dashBody}>
            {/* Sidebar */}
            <nav className={styles.dashSidebar} aria-label="Dashboard navigation">
              <ul className={styles.sidebarNav} role="list">
                {TABS.map((tab) => (
                  <li key={tab.id}>
                    <button
                      id={`nav-${tab.id}`}
                      className={`${styles.sidebarItem}${activeTab === tab.id ? ` ${styles.active}` : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.badge && <span className={styles.sidebarBadge}>{tab.badge}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Content */}
            <main className={styles.dashContent}>
              <div className={styles.contentCard}>
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
