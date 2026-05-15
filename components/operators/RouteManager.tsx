'use client';

/**
 * components/operators/RouteManager.tsx
 * Full route management panel for the operator dashboard.
 * Handles listing, creating, and (future) editing routes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOperatorRoutes, createOperatorRoute, ApiRoute } from '@/lib/api';
import { Plus, MapPin, ArrowRight, Loader2, X, AlertCircle, CheckCircle2, Search, Route } from 'lucide-react';

// ─── Kenya city suggestions for autocomplete ─────────────────────────────────
const KE_CITIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi',
  'Kitale', 'Garissa', 'Kakamega', 'Nyeri', 'Meru', 'Lamu', 'Nanyuki',
  'Kisii', 'Kericho', 'Migori', 'Embu', 'Machakos', 'Isiolo', 'Voi',
  'Bungoma', 'Busia', 'Homa Bay', 'Marsabit', 'Lodwar', 'Mandera',
  'Wajir', 'Moyale', 'Narok', 'Kajiado', 'Muranga', 'Nyahururu',
  'Ol Kalou', 'Kerugoya', 'Kilifi', 'Malindi', 'Ukunda', 'Diani',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CityInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function CityInput({ id, label, value, onChange, placeholder, disabled }: CityInputProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = KE_CITIES.filter(
    (c) => c.toLowerCase().includes(value.toLowerCase()) && value.length > 0 && c.toLowerCase() !== value.toLowerCase(),
  ).slice(0, 6);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="route-input-group" ref={ref}>
      <label htmlFor={id} className="route-label">{label}</label>
      <div className="route-input-wrapper">
        <MapPin className="route-input-icon" size={16} />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="route-input"
        />
        {value && !disabled && (
          <button type="button" className="route-input-clear" onClick={() => { onChange(''); setOpen(false); }}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="route-autocomplete">
          {suggestions.map((city) => (
            <li key={city}>
              <button
                type="button"
                className="route-autocomplete-item"
                onMouseDown={(e) => { e.preventDefault(); onChange(city); setOpen(false); }}
              >
                <MapPin size={13} className="text-rose-400 flex-shrink-0 mt-0.5" />
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Add Route Modal ─────────────────────────────────────────────────────────

interface AddRouteModalProps {
  onClose: () => void;
  onCreated: (route: ApiRoute) => void;
}

function AddRouteModal({ onClose, onCreated }: AddRouteModalProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    if (origin.toLowerCase() === destination.toLowerCase()) {
      setError('Origin and destination cannot be the same.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const route = await createOperatorRoute(origin.trim(), destination.trim());
      onCreated(route);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create route. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="rm-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Add Route">
      <div className="rm-modal">
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">Add new route</h2>
          <button className="rm-close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="rm-modal-body">
          <CityInput
            id="route-origin"
            label="Origin city"
            value={origin}
            onChange={setOrigin}
            placeholder="e.g. Nairobi"
            disabled={loading}
          />

          <div className="rm-arrow-divider">
            <ArrowRight size={18} className="text-rose-400" />
          </div>

          <CityInput
            id="route-destination"
            label="Destination city"
            value={destination}
            onChange={setDestination}
            placeholder="e.g. Mombasa"
            disabled={loading}
          />

          {error && (
            <div className="rm-error" role="alert">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rm-modal-actions">
            <button type="button" className="rm-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              id="add-route-submit"
              className="rm-btn-primary"
              disabled={loading || !origin.trim() || !destination.trim()}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {loading ? 'Creating…' : 'Create route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Route Row Skeleton ───────────────────────────────────────────────────────

function RouteSkeleton() {
  return (
    <div className="rm-row rm-skeleton-row">
      <div className="rm-skeleton" style={{ width: '35%', height: 18 }} />
      <div className="rm-skeleton" style={{ width: '35%', height: 18 }} />
      <div className="rm-skeleton" style={{ width: 60, height: 22, borderRadius: 999 }} />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rm-empty">
      <div className="rm-empty-icon">
        <Route size={32} className="text-rose-400" />
      </div>
      <p className="rm-empty-title">No routes yet</p>
      <p className="rm-empty-sub">Add your first origin → destination pair to start scheduling trips.</p>
      <button id="empty-add-route-btn" className="rm-btn-primary" onClick={onAdd}>
        <Plus size={16} /> Add your first route
      </button>
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="rm-toast" role="status">
      <CheckCircle2 size={16} className="text-emerald-500" />
      {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RouteManager() {
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getOperatorRoutes();
      setRoutes(data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load routes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated(route: ApiRoute) {
    setRoutes((prev) => [route, ...prev]);
    setShowModal(false);
    setToast(`Route ${route.origin} → ${route.destination} created!`);
  }

  const filtered = routes.filter(
    (r) =>
      r.origin.toLowerCase().includes(search.toLowerCase()) ||
      r.destination.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <style>{`
        /* ── Route Manager Scoped Styles ── */
        .rm-container { display: flex; flex-direction: column; gap: 0; }
        .rm-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        .rm-header-left h2 { font-size: 1.25rem; font-weight: 600; color: #111; margin: 0; }
        .rm-header-left p  { font-size: 0.8rem; color: #9ca3af; margin: 2px 0 0; }
        .rm-header-right   { display: flex; gap: 10px; align-items: center; }

        /* Search bar */
        .rm-search { position: relative; }
        .rm-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
        .rm-search input { height: 38px; padding: 0 14px 0 34px; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 0.82rem; color: #111; background: #f9fafb; outline: none; transition: border-color .15s, box-shadow .15s; width: 200px; }
        .rm-search input:focus { border-color: #f43f5e; box-shadow: 0 0 0 3px rgba(244,63,94,0.12); background: #fff; }

        /* Buttons */
        .rm-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #f43f5e; color: #fff; border: none; border-radius: 10px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background .15s, transform .1s; }
        .rm-btn-primary:hover:not(:disabled) { background: #e11d48; transform: translateY(-1px); }
        .rm-btn-primary:disabled { opacity: .55; cursor: not-allowed; }
        .rm-btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: background .15s; }
        .rm-btn-secondary:hover:not(:disabled) { background: #e5e7eb; }

        /* Table */
        .rm-table-wrap { border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; }
        .rm-table-head { display: grid; grid-template-columns: 1fr 1fr 80px; padding: 12px 20px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
        .rm-table-head span { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; }
        .rm-row { display: grid; grid-template-columns: 1fr 1fr 80px; padding: 15px 20px; align-items: center; border-bottom: 1px solid #f5f5f5; transition: background .12s; }
        .rm-row:last-child { border-bottom: none; }
        .rm-row:hover { background: #fdf2f4; }
        .rm-city { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; font-weight: 500; color: #111; }
        .rm-city-icon { color: #f43f5e; flex-shrink: 0; }
        .rm-trips-badge { display: inline-flex; align-items: center; padding: 3px 10px; background: #fce7eb; color: #be123c; border-radius: 999px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; }

        /* Skeleton */
        .rm-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
        .rm-skeleton-row { pointer-events: none; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        /* Empty state */
        .rm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 24px; gap: 12px; text-align: center; }
        .rm-empty-icon { width: 64px; height: 64px; background: #fce7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .rm-empty-title { font-size: 1rem; font-weight: 600; color: #111; margin: 4px 0 0; }
        .rm-empty-sub   { font-size: 0.82rem; color: #9ca3af; max-width: 320px; margin: 0; }

        /* Error alert */
        .rm-fetch-error { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; color: #dc2626; font-size: 0.82rem; margin-bottom: 16px; }

        /* Modal */
        .rm-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(3px); animation: fadeIn .15s ease; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .rm-modal { background: #fff; border-radius: 20px; width: 100%; max-width: 440px; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.18); animation: slideUp .2s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .rm-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 0; }
        .rm-modal-title  { font-size: 1.1rem; font-weight: 700; color: #111; margin: 0; }
        .rm-close-btn    { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #f3f4f6; border: none; border-radius: 50%; cursor: pointer; color: #6b7280; transition: background .15s; }
        .rm-close-btn:hover { background: #e5e7eb; }
        .rm-modal-body   { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .rm-arrow-divider { display: flex; align-items: center; justify-content: center; padding: 2px 0; }
        .rm-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        .rm-error { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #dc2626; font-size: 0.8rem; }

        /* City input */
        .route-input-group { display: flex; flex-direction: column; gap: 6px; position: relative; }
        .route-label       { font-size: 0.78rem; font-weight: 600; color: #374151; }
        .route-input-wrapper { position: relative; display: flex; align-items: center; }
        .route-input-icon  { position: absolute; left: 12px; color: #9ca3af; pointer-events: none; }
        .route-input       { width: 100%; height: 46px; padding: 0 36px 0 36px; border: 1.5px solid #e5e7eb; border-radius: 12px; font-size: 0.9rem; color: #111; background: #f9fafb; outline: none; transition: border-color .15s, box-shadow .15s; }
        .route-input:focus { border-color: #f43f5e; box-shadow: 0 0 0 3px rgba(244,63,94,0.12); background: #fff; }
        .route-input:disabled { opacity: .6; cursor: not-allowed; }
        .route-input-clear { position: absolute; right: 12px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: #9ca3af; padding: 2px; }
        .route-input-clear:hover { color: #6b7280; }
        .route-autocomplete { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); z-index: 50; overflow: hidden; list-style: none; margin: 0; padding: 4px; }
        .route-autocomplete-item { display: flex; align-items: flex-start; gap: 8px; width: 100%; padding: 9px 12px; background: none; border: none; cursor: pointer; font-size: 0.84rem; color: #374151; border-radius: 8px; transition: background .1s; text-align: left; }
        .route-autocomplete-item:hover { background: #fce7eb; color: #be123c; }

        /* Toast */
        .rm-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 13px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); font-size: 0.84rem; font-weight: 500; color: #111; z-index: 200; animation: slideUp .2s ease; white-space: nowrap; }
      `}</style>

      <div className="rm-container">
        {/* Header */}
        <div className="rm-header">
          <div className="rm-header-left">
            <h2>Routes</h2>
            <p>{routes.length} route{routes.length !== 1 ? 's' : ''} configured</p>
          </div>
          <div className="rm-header-right">
            {routes.length > 0 && (
              <div className="rm-search">
                <Search className="rm-search-icon" size={15} />
                <input
                  type="text"
                  placeholder="Search routes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search routes"
                />
              </div>
            )}
            <button id="open-add-route-btn" className="rm-btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add route
            </button>
          </div>
        </div>

        {/* Fetch error */}
        {fetchError && (
          <div className="rm-fetch-error" role="alert">
            <AlertCircle size={15} className="flex-shrink-0" />
            {fetchError}
            <button style={{ marginLeft: 'auto', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit' }} onClick={load}>
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {(loading || routes.length > 0) && (
          <div className="rm-table-wrap">
            <div className="rm-table-head">
              <span>Origin</span>
              <span>Destination</span>
              <span>Trips</span>
            </div>

            {loading
              ? Array.from({ length: 5 }).map((_, i) => <RouteSkeleton key={i} />)
              : filtered.length === 0
              ? (
                <div className="rm-row" style={{ justifyContent: 'center', color: '#9ca3af', fontSize: '0.84rem' }}>
                  No routes match your search.
                </div>
              )
              : filtered.map((r) => (
                <div key={r.id} className="rm-row">
                  <div className="rm-city">
                    <MapPin size={14} className="rm-city-icon" />
                    {r.origin}
                  </div>
                  <div className="rm-city">
                    <ArrowRight size={14} className="rm-city-icon" />
                    {r.destination}
                  </div>
                  <div>
                    <span className="rm-trips-badge">
                      {r._count?.trips ?? 0} {r._count?.trips === 1 ? 'trip' : 'trips'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchError && routes.length === 0 && (
          <EmptyState onAdd={() => setShowModal(true)} />
        )}
      </div>

      {/* Add Route Modal */}
      {showModal && <AddRouteModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {/* Success toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
