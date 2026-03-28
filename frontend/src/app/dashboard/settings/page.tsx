'use client';
import { useAuthStore } from '@/store/globalStore';
import { 
  User, 
  Lock, 
  Shield, 
  Settings as SettingsIcon, 
  Languages, 
  BarChart, 
  CreditCard, 
  Trash2,
  Save
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingField {
  label: string;
  value: string | number;
  type: string;
  disabled?: boolean;
  options?: string[];
}

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  fields: SettingField[];
  action?: { label: string; color: string };
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  const sections: SettingSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information and public profile.',
      icon: User,
      fields: [
        { label: 'Full Name', value: user?.name || 'User', type: 'text' },
        { label: 'Email Address', value: user?.email || 'user@example.com', type: 'email', disabled: true },
      ]
    },
    {
      id: 'account',
      title: 'Account & Security',
      description: 'Update your password and secure your account.',
      icon: Lock,
      action: { label: 'Change Password', color: 'bg-blue-600' },
      fields: [
        { label: 'Current Password', value: '••••••••', type: 'password' },
        { label: 'New Password', value: '', type: 'password' },
      ]
    },
    {
      id: 'preferences',
      title: 'Interview Preferences',
      description: 'Customize your AI interview experience.',
      icon: Languages,
      fields: [
        { label: 'Preferred Language', value: 'English', type: 'select', options: ['English', 'Spanish', 'French', 'German'] },
        { label: 'Difficulty level', value: 'Intermediate', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
      ]
    },
    {
      id: 'usage',
      title: 'Usage & Plan',
      description: 'View your current subscription and credits.',
      icon: CreditCard,
      fields: [
        { label: 'Credits remaining', value: user?.credits ?? '0', type: 'text', disabled: true },
        { label: 'Plan type', value: user?.role === 'ADMIN' ? 'Enterprise' : 'Free Tier', type: 'text', disabled: true },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
            Settings
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Manage your account settings and preferences.</p>
        </div>
        <button className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-2.5 min-h-[48px] bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative bg-[#1e293b] border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <section.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{section.title}</h2>
                  <p className="text-xs text-slate-400 leading-tight mt-1">{section.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer">
                        {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input 
                        type={field.type}
                        defaultValue={field.value}
                        disabled={field.disabled}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>
                ))}
              </div>

              {section.action && (
                <button className={`mt-6 w-full py-2.5 min-h-[48px] rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-[0.98] ${section.action.color} hover:brightness-110 flex items-center justify-center`}>
                  {section.action.label}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Danger Zone</h2>
            <p className="text-sm text-slate-500">Irreversible actions for your account.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-white">Delete Account</p>
            <p className="text-xs text-slate-500 mt-1">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button className="px-6 py-2 min-h-[48px] w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap flex items-center justify-center shadow-lg shadow-rose-500/20 active:scale-95">
            Delete Account
          </button>
        </div>
      </motion.div>

      {/* Version Info */}
      <div className="text-center pb-8">
        <p className="text-xs text-slate-600 font-medium">SayBee AI v1.0.0 • Connected to Secure Cloud Architecture</p>
      </div>
    </div>
  );
}
