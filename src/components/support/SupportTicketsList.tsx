import React, { useRef, useState } from 'react';
import { SupportTicket } from '../../types';
import { StorageService } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';
import { 
  HelpCircle, 
  Plus, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  X, 
  Search, 
  AlertTriangle, 
  Filter, 
  Building2, 
  ShieldCheck, 
  User, 
  Sparkles,
  Info
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface SupportTicketsListProps {
  tenantId: string;
}

export const SupportTicketsList: React.FC<SupportTicketsListProps> = ({ tenantId }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // New ticket state (for salon owners)
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('technical');
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [affectedModule, setAffectedModule] = useState('Appointments & Calendar');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [message, setMessage] = useState('');

  // Super Admin status update in drawer
  const [updatingStatus, setUpdatingStatus] = useState<SupportTicket['status'] | ''>('');
  const createSubmittingRef = useRef(false);
  const replySubmittingRef = useRef(false);
  const statusSubmittingRef = useRef(false);

  // Strict tenant isolation: Super Admin sees all (undefined), Salon owner strictly sees only tenantId
  const effectiveTenantId = isSuperAdmin ? undefined : tenantId;
  const allTickets = StorageService.getSupportTickets(effectiveTenantId);

  const filteredTickets = allTickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchSalon = t.salonName?.toLowerCase().includes(q);
      const matchEmail = t.userEmail?.toLowerCase().includes(q);
      if (!matchSubject && !matchSalon && !matchEmail) return false;
    }
    return true;
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || createSubmittingRef.current) return;
    createSubmittingRef.current = true;

    const safeDiagnostic = includeDiagnostics 
      ? `Tenant: ${tenantId} | Viewport: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'} | Timestamp: ${new Date().toISOString()}`
      : undefined;

    const newTicket: SupportTicket = {
      id: `tkt_${Date.now()}`,
      tenantId,
      salonName: currentUser?.name ? `${currentUser.name}'s Salon` : 'Moonbox Salon Workspace',
      userEmail: currentUser?.email || 'owner@moonboxsalon.lk',
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      module: affectedModule,
      diagnosticRef: safeDiagnostic,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderEmail: currentUser?.email || 'owner@moonboxsalon.lk',
          senderRole: 'tenant',
          senderName: currentUser?.name || 'Salon User',
          content: message.trim(),
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await StorageService.createSupportTicketConfirmed(newTicket);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not create support ticket. Please try again.');
      createSubmittingRef.current = false;
      return;
    }
    createSubmittingRef.current = false;
    setIsNewModalOpen(false);
    setSubject('');
    setMessage('');
    setRefreshKey(k => k + 1);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim() || replySubmittingRef.current) return;
    replySubmittingRef.current = true;

    try {
      await StorageService.replySupportTicketConfirmed(activeTicket.id, currentUser?.name || (isSuperAdmin ? 'Platform Administrator' : 'Salon User'), isSuperAdmin ? 'support' : 'tenant', replyText.trim(), activeTicket.tenantId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not send reply. Please try again.');
      replySubmittingRef.current = false;
      return;
    }

    replySubmittingRef.current = false;
    setReplyText('');
    const updated = StorageService.getSupportTickets(effectiveTenantId).find(t => t.id === activeTicket.id);
    if (updated) setActiveTicket(updated);
    setRefreshKey(k => k + 1);
  };

  const handleStatusChange = async (newStatus: SupportTicket['status']) => {
    if (!activeTicket || statusSubmittingRef.current) return;
    statusSubmittingRef.current = true;
    try {
      await StorageService.updateTicketStatusConfirmed(activeTicket.id, newStatus, activeTicket.tenantId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update ticket status. Please try again.');
      statusSubmittingRef.current = false;
      return;
    }
    statusSubmittingRef.current = false;
    const updated = StorageService.getSupportTickets(effectiveTenantId).find(t => t.id === activeTicket.id);
    if (updated) setActiveTicket(updated);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-[#1C1B31] p-5 sm:p-6 rounded-3xl border border-[#343047] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-[#F6F3FB]">
              {isSuperAdmin ? 'Platform Support Tickets & Engineering Helpdesk' : 'Help & Support Desk'}
            </h3>
            {isSuperAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#8B5CF6]/20 text-[#B8A5FF] border border-[#8B5CF6]/30">
                Super Admin Inbox
              </span>
            )}
          </div>
          <p className="text-xs text-[#AAA6BD] mt-0.5">
            {isSuperAdmin
              ? 'Review tenant issues across Sri Lankan salons, reply directly, and manage ticket status.'
              : 'Direct communication line to Moonbox Digital platform engineers. All tickets are answered within 2 hours.'}
          </p>
        </div>

        {!isSuperAdmin && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white hover:opacity-95 shadow-md shadow-[#8B5CF6]/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Support Request</span>
          </button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#1C1B31] p-4 rounded-2xl border border-[#343047] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#858198] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isSuperAdmin ? "Search subject, salon, or email..." : "Search your tickets..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] placeholder:text-[#858198] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'open', 'in_progress', 'waiting_for_customer', 'resolved'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#25223D] text-[#AAA6BD] hover:text-[#F6F3FB] border border-[#343047]'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={searchQuery ? "No matching support tickets" : "No support tickets open"}
          description={
            isSuperAdmin
              ? "All salon support queues are currently clear."
              : "Have questions regarding your custom domain, POS hardware, or billing? Open a ticket anytime."
          }
          actionText={!isSuperAdmin ? "Create Support Request" : undefined}
          onAction={() => setIsNewModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map(t => {
            const isResolved = t.status === 'resolved' || t.status === 'closed';
            const isUrgent = t.priority === 'urgent';

            return (
              <div
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className="bg-[#1C1B31] p-5 rounded-2xl border border-[#343047] hover:border-[#8B5CF6]/60 cursor-pointer transition-all flex flex-col justify-between shadow-lg group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isUrgent 
                        ? 'bg-[#EA7180]/15 text-[#EA7180] border border-[#EA7180]/30' 
                        : t.priority === 'high'
                          ? 'bg-[#E7B363]/15 text-[#E7B363] border border-[#E7B363]/30'
                          : 'bg-[#25223D] text-[#AAA6BD] border border-[#343047]'
                    }`}>
                      {t.priority} · {t.category}
                    </span>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                      isResolved
                        ? 'bg-[#4BBF98]/15 text-[#4BBF98] border border-[#4BBF98]/30'
                        : t.status === 'waiting_for_customer'
                          ? 'bg-[#82B8F0]/15 text-[#82B8F0] border border-[#82B8F0]/30'
                          : 'bg-[#E7B363]/15 text-[#E7B363] border border-[#E7B363]/30'
                    }`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#F6F3FB] mt-2.5 group-hover:text-[#B8A5FF] transition-colors">
                    {t.subject}
                  </h4>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2 text-[11px] text-[#B8A5FF] mt-1 font-medium">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{t.salonName} ({t.userEmail})</span>
                    </div>
                  )}

                  <p className="text-xs text-[#AAA6BD] mt-1.5 line-clamp-2 leading-relaxed">
                    {t.messages[t.messages.length - 1]?.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#343047] flex items-center justify-between text-[11px] text-[#858198]">
                  <span>{t.messages.length} message(s)</span>
                  {t.module && <span className="text-[#B8A5FF] font-medium">{t.module}</span>}
                  <span>{new Date(t.updatedAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conversation Thread Drawer / Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#1C1B31] rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#343047] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="pb-3 border-b border-[#343047] flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D5BD88]">
                    {activeTicket.category} · {activeTicket.priority} priority
                  </span>
                  {activeTicket.module && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#25223D] text-[#B8A5FF]">
                      Module: {activeTicket.module}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-base text-[#F6F3FB] mt-1">{activeTicket.subject}</h3>
                <p className="text-[11px] text-[#AAA6BD] mt-0.5">
                  From: <strong className="text-[#F6F3FB]">{activeTicket.salonName}</strong> ({activeTicket.userEmail})
                </p>
              </div>

              <button 
                onClick={() => setActiveTicket(null)} 
                className="p-1 rounded-lg text-[#858198] hover:text-[#F6F3FB] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagnostic reference banner if present */}
            {activeTicket.diagnosticRef && (
              <div className="my-2 p-2.5 rounded-xl bg-[#151529] border border-[#343047] text-[10px] text-[#858198] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#B8A5FF] shrink-0" />
                <span className="font-mono truncate">{activeTicket.diagnosticRef}</span>
              </div>
            )}

            {/* Super Admin Status Management Controls */}
            {isSuperAdmin && (
              <div className="py-2.5 px-3 rounded-xl bg-[#25223D] border border-[#343047] my-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#AAA6BD]">Ticket Status:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={activeTicket.status}
                    onChange={e => handleStatusChange(e.target.value as any)}
                    className="p-1.5 rounded-lg bg-[#151529] border border-[#343047] text-[#F6F3FB] text-xs font-bold focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_customer">Waiting for Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[220px]">
              {activeTicket.messages.map(msg => {
                const isSupport = msg.senderRole === 'support';
                const isMe = msg.senderEmail === currentUser?.email;

                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs space-y-1 ${
                      isMe
                        ? 'ml-auto bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white'
                        : isSupport
                          ? 'mr-auto bg-[#25223D] border border-[#343047] text-[#F6F3FB]'
                          : 'mr-auto bg-[#151529] border border-[#343047] text-[#F6F3FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 pb-0.5 border-b border-white/10">
                      <span className="font-bold flex items-center gap-1">
                        {isSupport && <ShieldCheck className="w-3 h-3 text-[#D5BD88]" />}
                        <span>{msg.senderName}</span>
                        {isSupport && <span className="text-[#D5BD88]">(Platform Staff)</span>}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-[#343047] flex gap-2">
              <input
                type="text"
                required
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={isSuperAdmin ? "Add administrator response..." : "Type your reply..."}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs placeholder:text-[#858198] focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#8B5CF6]/25 hover:opacity-95 transition-all"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Ticket Modal (Salon Owners) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#1C1B31] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#343047] space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-[#343047]">
              <div>
                <h4 className="font-extrabold text-base text-[#F6F3FB]">Create Support Request</h4>
                <p className="text-[11px] text-[#AAA6BD]">Direct ticket sent to Moonbox Digital engineering team</p>
              </div>
              <button 
                onClick={() => setIsNewModalOpen(false)} 
                className="text-[#858198] hover:text-[#F6F3FB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block font-bold text-[#F6F3FB] mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Question about thermal receipt printer or POS checkout"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs placeholder:text-[#858198] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#F6F3FB] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="technical">Technical</option>
                    <option value="billing">Billing & Plans</option>
                    <option value="general">General</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F6F3FB] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F6F3FB] mb-1">Affected Module</label>
                  <select
                    value={affectedModule}
                    onChange={e => setAffectedModule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="Appointments & Calendar">Appointments</option>
                    <option value="Point of Sale (POS)">POS Checkout</option>
                    <option value="Inventory & Stock">Inventory</option>
                    <option value="Commissions">Commissions</option>
                    <option value="Online Booking">Online Booking</option>
                    <option value="Website & Portfolio">Website</option>
                    <option value="Invoices & Reports">Invoices/Reports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F6F3FB] mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Explain what happened, steps to reproduce, or what you need assistance with..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#25223D] border border-[#343047] text-[#F6F3FB] text-xs placeholder:text-[#858198] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="includeDiagnostics"
                  checked={includeDiagnostics}
                  onChange={e => setIncludeDiagnostics(e.target.checked)}
                  className="rounded text-[#8B5CF6] focus:ring-[#8B5CF6]"
                />
                <label htmlFor="includeDiagnostics" className="text-[11px] text-[#AAA6BD] cursor-pointer">
                  Attach safe technical context (browser viewport & workspace ID) to speed up diagnosis
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#343047]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#AAA6BD] hover:text-[#F6F3FB] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/25 hover:opacity-95"
                >
                  Submit Ticket to Super Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
