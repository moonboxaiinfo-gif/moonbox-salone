import React, { useState } from 'react';
import { Announcement } from '../../types';
import { StorageService } from '../../services/storageService';
import { Megaphone, Plus, Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

export const AnnouncementsManager: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(StorageService.getAnnouncements());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Announcement['type']>('info');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const newAnn: Announcement = {
      id: `ann_${Date.now()}`,
      title,
      content,
      type,
      targetAudience,
      isActive: true,
      publishedAt: new Date().toISOString()
    };

    StorageService.createAnnouncement(newAnn);
    setAnnouncements(StorageService.getAnnouncements());
    setIsModalOpen(false);
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-3xl border border-[#E8DFD6] flex justify-between items-center">
        <div>
          <h3 className="font-bold text-base text-[#1B0C2D]">Platform Broadcast Announcements</h3>
          <p className="text-xs text-slate-500">
            Publish notifications and system alerts to all salon owners across Sri Lanka.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#1B0C2D] to-[#421C64] text-[#F3C9AB] hover:from-[#2A113C] hover:to-[#552380] shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white p-5 rounded-2xl border border-[#E8DFD6] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                ann.type === 'critical' ? 'bg-rose-100 text-rose-800' :
                ann.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                ann.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-[#9B3E88]'
              }`}>
                {ann.type} · Target: {ann.targetAudience}
              </span>
              <span className="text-[11px] text-slate-400">
                {new Date(ann.publishedAt).toLocaleDateString('en-GB')}
              </span>
            </div>

            <h4 className="font-bold text-sm text-[#1B0C2D]">{ann.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-[#1B0C2D]">Create Platform Announcement</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. ⚡ System Maintenance Window"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Announcement Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="all">All Salons</option>
                    <option value="trial">Trial Users Only</option>
                    <option value="active">Paid Active Only</option>
                    <option value="growth_premium">Growth & Premium Tiers</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Broadcast Content *</label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Announcement body text..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1B0C2D] text-[#F3C9AB] font-bold"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
