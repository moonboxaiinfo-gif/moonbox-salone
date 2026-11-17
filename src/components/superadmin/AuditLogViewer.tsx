import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { History, Search, ShieldCheck } from 'lucide-react';

interface AuditLogViewerProps {
  tenantId?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ tenantId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const logs = StorageService.getAuditLogs(tenantId);

  const filtered = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.details.toLowerCase().includes(term) ||
      l.actorEmail.toLowerCase().includes(term) ||
      l.entity.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-3xl border border-[#E8DFD6] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-[#1B0C2D] flex items-center gap-2">
            <History className="w-5 h-5 text-[#9B3E88]" />
            <span>Immutable Platform Audit Logs</span>
          </h3>
          <p className="text-xs text-slate-500">
            Cryptographically traced activity log of all sensitive billing, access, and configuration events.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, email, or entity..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#9B3E88]"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E8DFD6] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F5] border-b border-[#E8DFD6] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Operation Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleDateString('en-GB')}{' '}
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">{log.actorEmail}</td>
                <td className="py-3 px-4">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-sans">
                    {log.actorRole}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-[#9B3E88]">{log.action}</td>
                <td className="py-3 px-4 text-slate-600 font-sans">{log.entity}</td>
                <td className="py-3 px-4 text-slate-700 font-sans">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
