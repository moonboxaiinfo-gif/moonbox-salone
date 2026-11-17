import React, { useCallback, useEffect, useState } from 'react';
import { Star, Check, X, Trash2, ShieldCheck, BadgeCheck, MessageSquareWarning, Inbox } from 'lucide-react';
import { SalonTenant } from '../../types';
import { WebsiteReview, WebsiteReviewStatus } from '../../types/website';
import { WebsiteService, MutationContext } from '../../services/websiteService';
import { PublicWebsiteApi } from '../../services/publicWebsiteApi';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { ConfirmDialog } from './WebsiteWorkspace';

/**
 * Reviews dashboard: moderation (approve / reject), featuring and deletion.
 * Only approved reviews are ever shown on the public website.
 */
export const ReviewsTab: React.FC<{
  tenant: SalonTenant;
  ctx: MutationContext;
  onToast: (kind: 'success' | 'error', msg: string) => void;
}> = ({ tenant, ctx, onToast }) => {
  const remote = isSupabaseConfigured && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenant.id);
  const [reviews, setReviews] = useState<WebsiteReview[]>(() => WebsiteService.getReviews(tenant.id));
  const [loading, setLoading] = useState(remote);
  const [filter, setFilter] = useState<'all' | WebsiteReviewStatus>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refreshReviews = useCallback(async () => {
    if (!remote) {
      setReviews(WebsiteService.getReviews(tenant.id));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await PublicWebsiteApi.getManagedReviews(tenant.slug);
      setReviews(result.reviews);
    } catch (error) {
      onToast('error', error instanceof Error ? error.message : 'Could not load salon reviews.');
    } finally {
      setLoading(false);
    }
  }, [remote, tenant.id, tenant.slug, onToast]);

  useEffect(() => { void refreshReviews(); }, [refreshReviews]);
  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);
  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  };

  const moderate = async (reviewId: string, status: WebsiteReviewStatus, isFeatured?: boolean) => {
    if (remote) {
      try {
        await PublicWebsiteApi.moderateReview(tenant.slug, reviewId, status, isFeatured);
        await refreshReviews();
        onToast('success', status === 'approved' ? 'Review approved and now visible on your website.' : status === 'rejected' ? 'Review rejected.' : 'Review updated.');
      } catch (error) {
        onToast('error', error instanceof Error ? error.message : 'Could not update review.');
      }
      return;
    }
    const res = WebsiteService.moderateReview({ tenantId: tenant.id, reviewId, status, isFeatured, moderatedBy: ctx.actorEmail });
    if (res.success) {
      await refreshReviews();
      onToast('success', status === 'approved' ? 'Review approved and now visible on your website.' : status === 'rejected' ? 'Review rejected.' : 'Review updated.');
    } else {
      onToast('error', res.error || 'Could not update review.');
    }
  };

  const remove = async (reviewId: string) => {
    if (remote) {
      try {
        await PublicWebsiteApi.deleteReview(tenant.slug, reviewId);
        await refreshReviews();
        onToast('success', 'Review deleted.');
      } catch (error) {
        onToast('error', error instanceof Error ? error.message : 'Could not delete review.');
      }
      setDeleteId(null);
      return;
    }
    const res = WebsiteService.deleteReview(tenant.id, reviewId);
    if (res.success) { await refreshReviews(); onToast('success', 'Review deleted.'); }
    else onToast('error', res.error || 'Could not delete review.');
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1A0A2A] p-6 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-[#1B0C2D] dark:text-[#F3C9AB]">Client Reviews</h3>
          <p className="text-xs text-slate-500 dark:text-[#AAA6BD] mt-1 max-w-xl">
            Visitors can submit reviews from your public website. Nothing appears publicly until you approve it.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#210D33] rounded-xl p-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize ${filter === f ? 'bg-white dark:bg-[#2A113C] shadow-sm text-[#7C3AED]' : 'text-slate-500'}`}>
              {f} {counts[f] > 0 && f !== 'all' && `(${counts[f]})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#1A0A2A] p-12 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] text-center text-xs text-slate-400">Loading reviews…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1A0A2A] p-12 rounded-3xl border border-[#E8DFD6] dark:border-[#2D1344] text-center">
          <Inbox className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-bold text-[#1B0C2D] dark:text-[#F3C9AB]">
            {filter === 'all' ? 'No reviews yet' : `No ${filter} reviews`}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Reviews submitted from your public website will appear here for moderation. Your website shows a friendly empty state until then.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white dark:bg-[#1A0A2A] p-5 rounded-2xl border border-[#E8DFD6] dark:border-[#2D1344]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#1B0C2D] dark:text-[#F3C9AB]">{r.customerName}</span>
                    {r.verifiedBooking && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified booking
                      </span>
                    )}
                    <StatusBadge status={r.status} />
                    {r.isFeatured && <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 inline-flex items-center gap-1"><Star className="w-3 h-3" fill="currentColor" /> Featured</span>}
                  </div>
                  <div className="mt-1.5"><Stars rating={r.rating} /></div>
                  <p className="text-xs text-slate-600 dark:text-[#AAA6BD] mt-2 leading-relaxed">{r.text}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {r.serviceRef ? `${r.serviceRef} · ` : ''}{new Date(r.createdAt).toLocaleDateString()}
                    {r.customerPhone ? ` · ${r.customerPhone}` : ''}
                  </p>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {r.status !== 'approved' && (
                    <button onClick={() => moderate(r.id, 'approved')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => moderate(r.id, 'rejected')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#35174F] text-slate-500 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-[#210D33]">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => moderate(r.id, r.status, !r.isFeatured)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border ${r.isFeatured ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 dark:border-[#35174F] text-slate-500 hover:bg-slate-50 dark:hover:bg-[#210D33]'}`}
                  >
                    <Star className="w-3.5 h-3.5" fill={r.isFeatured ? 'currentColor' : 'none'} /> {r.isFeatured ? 'Featured' : 'Feature'}
                  </button>
                  <button onClick={() => setDeleteId(r.id)} aria-label="Delete review" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-[#F5F0FF] dark:bg-[#210D33] border border-[#E4D7FA] dark:border-[#35174F] flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-[#5B21B6] dark:text-[#C4B5FD]">
          The “Verified booking” badge appears only when the reviewer's phone matches a real customer record with visit history at your salon — it can never be self-declared. Public submissions are rate-limited to protect against spam.
        </p>
      </div>

      {deleteId && (
        <ConfirmDialog
          title="Delete this review?"
          body="The review will be permanently removed. This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => remove(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {void MessageSquareWarning}
    </div>
  );
};

const StatusBadge: React.FC<{ status: WebsiteReviewStatus }> = ({ status }) => {
  const map = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-slate-100 text-slate-500 border-slate-200',
  }[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${map}`}>{status}</span>;
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400' : 'text-slate-300'}`} fill={i <= rating ? 'currentColor' : 'none'} />
    ))}
  </span>
);
