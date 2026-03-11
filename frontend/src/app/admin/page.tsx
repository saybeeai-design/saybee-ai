'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users, Video, Brain, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/admin/metrics');
        setMetrics(res.data);
      } catch (err: any) {
        toast.error('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading metrics...</div>;
  if (!metrics) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">System Overview</h1>
      
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-16 h-16 text-rose-400" /></div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Users</h3>
          <p className="text-4xl font-bold text-white">{metrics.users}</p>
        </div>
        <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Video className="w-16 h-16 text-indigo-400" /></div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Interviews</h3>
          <p className="text-4xl font-bold text-white">{metrics.interviews}</p>
        </div>
        <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Brain className="w-16 h-16 text-emerald-400" /></div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">AI Questions Generated</h3>
          <p className="text-4xl font-bold text-white">{metrics.aiUsage.generatedQuestions}</p>
        </div>
        <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-16 h-16 text-yellow-400" /></div>
          <h3 className="text-gray-400 text-sm font-medium mb-2">Resumes Processed</h3>
          <p className="text-4xl font-bold text-white">{metrics.resumes}</p>
        </div>
      </div>

      <div className="glass-card p-8 text-center border-white/5">
        <p className="text-gray-400 text-sm">More detailed charts and analytics will display here.</p>
      </div>
    </div>
  );
}
