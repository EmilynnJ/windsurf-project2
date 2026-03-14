import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReaders } from '../../hooks/useReaders';
import {
  Card, Avatar, Badge, StatusBadge, SearchInput,
  Select, SkeletonCard, EmptyState, Pagination,
} from '../../components/ui';
import type { ReaderPublic } from '../../types';

const ITEMS_PER_PAGE = 12;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'chat', label: '💬 Chat' },
  { value: 'voice', label: '🎤 Voice' },
  { value: 'video', label: '📹 Video' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'online', label: '🟢 Online' },
  { value: 'offline', label: '⚫ Offline' },
];

function centsToPrice(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

/* ─── Reader Card (compact) ──────────────────────────────────── */

function ReaderGridCard({ reader }: { reader: ReaderPublic }) {
  const specialties = reader.specialties
    ? reader.specialties.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const lowestPrice = Math.min(
    ...[reader.pricingChat, reader.pricingVoice, reader.pricingVideo].filter((p) => p > 0)
  );

  return (
    <Link to={`/readers/${reader.id}`} style={{ textDecoration: 'none' }}>
      <Card className="flex flex-col gap-3" style={{ height: '100%' }}>
        <div className="flex items-center gap-3">
          <Avatar
            src={reader.profileImage}
            name={reader.fullName || reader.username}
            size="lg"
            online={reader.isOnline}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
              {reader.fullName || reader.username || 'Reader'}
            </h4>
            <StatusBadge online={reader.isOnline} />
          </div>
        </div>

        {reader.bio && (
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {reader.bio}
          </p>
        )}

        {specialties.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {specialties.slice(0, 4).map((s) => (
              <Badge key={s} variant="gold" size="sm">{s}</Badge>
            ))}
            {specialties.length > 4 && (
              <Badge variant="gold" size="sm">+{specialties.length - 4}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between" style={{ marginTop: 'auto' }}>
          <div className="flex gap-2">
            {reader.pricingChat > 0 && <Badge variant="pink">💬</Badge>}
            {reader.pricingVoice > 0 && <Badge variant="pink">🎤</Badge>}
            {reader.pricingVideo > 0 && <Badge variant="pink">📹</Badge>}
          </div>
          {lowestPrice < Infinity && (
            <span className="price price--sm">
              From {centsToPrice(lowestPrice)}/min
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

/* ─── Readers Page ───────────────────────────────────────────── */

export function ReadersPage() {
  const { readers, isLoading, error } = useReaders({ onlineOnly: false, pollInterval: 30000 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Filter and sort readers (online first)
  const filtered = useMemo(() => {
    let list = [...readers];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.fullName ?? '').toLowerCase().includes(q) ||
          (r.username ?? '').toLowerCase().includes(q) ||
          (r.specialties ?? '').toLowerCase().includes(q) ||
          (r.bio ?? '').toLowerCase().includes(q)
      );
    }

    if (typeFilter) {
      list = list.filter((r) => {
        if (typeFilter === 'chat') return r.pricingChat > 0;
        if (typeFilter === 'voice') return r.pricingVoice > 0;
        if (typeFilter === 'video') return r.pricingVideo > 0;
        return true;
      });
    }

    if (statusFilter) {
      list = list.filter((r) =>
        statusFilter === 'online' ? r.isOnline : !r.isOnline
      );
    }

    // Online first
    list.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));

    return list;
  }, [readers, search, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="page-wrapper page-enter">
      <section className="section">
        <div className="container">
          <h1 className="text-center" style={{ marginBottom: 'var(--space-2)' }}>
            Our Readers
          </h1>
          <p className="text-center" style={{ marginBottom: 'var(--space-8)', color: 'var(--text-muted)' }}>
            Find your perfect spiritual guide
          </p>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap items-center" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search readers..."
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Select
                options={TYPE_OPTIONS}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                aria-label="Filter by reading type"
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                aria-label="Filter by status"
              />
            </div>
          </div>

          {/* Results count */}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            {filtered.length} reader{filtered.length !== 1 ? 's' : ''} found
            {filtered.filter((r) => r.isOnline).length > 0 && (
              <> · <span style={{ color: '#86EFAC' }}>{filtered.filter((r) => r.isOnline).length} online</span></>
            )}
          </p>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid--readers">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <EmptyState icon="⚡" title="Error Loading Readers" description={error} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🔮"
              title="No Readers Found"
              description={search || typeFilter || statusFilter
                ? 'Try adjusting your filters.'
                : 'Check back soon — new readers are joining.'}
              action={
                (search || typeFilter || statusFilter)
                  ? { label: 'Clear Filters', onClick: () => { setSearch(''); setTypeFilter(''); setStatusFilter(''); } }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid--readers">
                {pageItems.map((reader) => (
                  <ReaderGridCard key={reader.id} reader={reader} />
                ))}
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
