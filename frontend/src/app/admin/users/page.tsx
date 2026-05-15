'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { User, Shield, Briefcase, FileText } from 'lucide-react';
import { isAxiosError } from 'axios';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  credits: number;
  isPaid: boolean;
  createdAt: string;
  _count?: { interviews?: number; resumes?: number };
}

type AdminAction = 'delete' | 'ban' | 'mark-paid' | 'add-credits';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/admin/users');
        setUsers(res.data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, action: AdminAction, amount?: number) => {
    try {
      if (action === 'delete' && !confirm('Are you sure you want to delete this user?')) return;
      
      let url = `/admin/users/${userId}`;
      let method = 'post';
      let data: Record<string, number> = {};

      if (action === 'delete') {
        method = 'delete';
      } else if (action === 'ban') {
        url += '/ban';
      } else if (action === 'mark-paid') {
        url += '/mark-paid';
      } else if (action === 'add-credits') {
        url += '/add-credits';
        data = { amount: amount || 10 }; // Default 10 credits if none specified
      }

      await api({ method, url, data });
      toast.success(`Action ${action} successful`);
      
      // Refresh list
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err: unknown) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || `Failed to perform ${action}`
        : `Failed to perform ${action}`;
      toast.error(message);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading user list...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">User Management</h1>
      
      <div className="glass-card rounded-2xl overflow-hidden border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">User</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Role</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Credits</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Paid</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Activity</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Joined</th>
              <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-500/30">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{u.name || 'Anonymous User'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                    u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20' : 'bg-white/5 text-gray-400 ring-1 ring-white/10'
                  }`}>
                    {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {u.role}
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-emerald-400">{u.credits}</td>
                <td className="p-4 text-center">
                  {u.isPaid ? (
                    <span className="px-2 py-1 text-xs font-semibold text-green-400 bg-green-500/10 rounded-full border border-green-500/20">Paid</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium text-gray-400 bg-white/5 rounded-full border border-white/10">Free</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400" title="Interviews">
                      <Briefcase className="w-3 h-3" /> {u._count?.interviews || 0}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400" title="Resumes">
                      <FileText className="w-3 h-3" /> {u._count?.resumes || 0}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right text-xs text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {!u.isPaid && (
                      <button onClick={() => handleAction(u.id, 'mark-paid')} className="px-2 py-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-colors" title="Mark Paid">
                        Mark Paid
                      </button>
                    )}
                    <button onClick={() => handleAction(u.id, 'add-credits', 10)} className="px-2 py-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition-colors" title="Add 10 Credits">
                      +10 Credits
                    </button>
                    {u.role !== 'BANNED' && (
                      <button onClick={() => handleAction(u.id, 'ban')} className="px-2 py-1 text-[10px] font-semibold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded transition-colors" title="Ban User">
                        Ban
                      </button>
                    )}
                    <button onClick={() => handleAction(u.id, 'delete')} className="px-2 py-1 text-[10px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors" title="Delete User">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-8 text-center text-gray-500">No users found.</div>}
      </div>
    </div>
  );
}
