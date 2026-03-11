'use client';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { resumeAPI } from '@/lib/api';
import { Upload, FileText, Trash2, RefreshCw } from 'lucide-react';

interface Resume { id: string; fileName: string; fileUrl: string; createdAt: string; }

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchResumes = async () => {
    try {
      const res = await resumeAPI.list();
      setResumes(res.data.resumes);
    } catch { toast.error('Failed to load resumes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are supported'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be less than 5MB'); return; }

    const fd = new FormData();
    fd.append('resume', file);
    setUploading(true);
    try {
      await resumeAPI.upload(fd);
      toast.success('Resume uploaded successfully!');
      fetchResumes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume?')) return;
    try {
      await resumeAPI.delete(id);
      toast.success('Resume deleted');
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch { toast.error('Failed to delete resume'); }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Resume Manager</h1>
        <p className="mt-1 text-sm" style={{ color: '#8888aa' }}>Upload your PDF resume to enable AI-powered interviews.</p>
      </div>

      {/* Upload area */}
      <div
        className="glass-card p-10 mb-6 text-center border-2 border-dashed cursor-pointer transition-all duration-200 hover:border-purple-500/50"
        style={{ borderColor: 'rgba(108,99,255,0.3)' }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".pdf" hidden onChange={handleUpload} />
        <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: '#6c63ff' }} />
        <p className="font-semibold text-white mb-1">{uploading ? 'Uploading...' : 'Click to upload PDF'}</p>
        <p className="text-sm" style={{ color: '#8888aa' }}>PDF only · Max 5MB</p>
      </div>

      {/* Resume list */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Resumes</h2>
          <button onClick={fetchResumes} className="btn-secondary text-sm py-2 px-3">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-center py-10" style={{ color: '#8888aa' }}>Loading...</p>
        ) : resumes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#8888aa' }} />
            <p className="font-medium text-white">No resumes uploaded</p>
            <p className="text-sm mt-1" style={{ color: '#8888aa' }}>Upload your first PDF resume above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)' }}>
                  <FileText className="w-5 h-5" style={{ color: '#6c63ff' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{r.fileName}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8888aa' }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="btn-danger">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
