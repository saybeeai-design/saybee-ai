'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/globalStore';
/* eslint-disable */
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getPaymentPlan } from '@/lib/paymentPlans';
import { 
  Brain, FileText, Zap, Globe, ArrowRight, Play, CheckCircle2, 
  ChevronRight, Star, Quote, Mic, Video, Sparkles
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } }
};

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const starterPlan = getPaymentPlan('micro1');
  const proPlan = getPaymentPlan('pro');
  const premiumPlan = getPaymentPlan('premium');

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-mesh overflow-x-hidden selection:bg-purple-500/30">
      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image src="/logo.png" alt="SayBee AI Logo" width={40} height={40} className="object-contain drop-shadow-[0_0_15px_rgba(108,99,255,0.4)]" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SayBee AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Login</Link>
            <Link href="/signup" className="btn-primary py-2 px-6 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400 mb-6 glow-border">
              <Sparkles className="w-3 h-3" />
              <span>THE FUTURE OF INTERVIEWS IS HERE</span>
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6">
              Practice Real <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
                Interviews with AI
              </span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-xl">
              Elevate your career with our advanced AI avatar interviewer. Upload your resume, select your role, and get real-time feedback that helps you ace your next big opportunity.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className="btn-primary py-4 px-8 text-lg group">
                Start Free Interview
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="btn-secondary py-4 px-8 text-lg flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-white text-white" />
                </div>
                Watch Demo
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0a0f] bg-gray-800" />
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-yellow-500 mb-0.5">
                  <Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" />
                </div>
                <p className="text-gray-400"><span className="text-white font-bold">10k+</span> users acing interviews</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
            <div className="relative glass-card p-4 border-white/10 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10" />
              <div className="relative w-full h-[500px] rounded-xl overflow-hidden animate-float">
                <Image 
                  src="/ai_interviewer_preview_1772819191030.png" 
                  alt="AI Interviewer" 
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute bottom-8 left-8 z-20 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Interview</div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    AI Active
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">Advanced Persona Engine</h3>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="py-24 px-6 bg-[#0a0a0f]/40 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Built for Success</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
              Our comprehensive toolset provides everything you need to transform your interview performance from Good to Great.
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { icon: Brain, title: 'AI Interviewer', desc: 'Realistic AI personas tailored to your target company and role.', color: '#6c63ff' },
              { icon: FileText, title: 'Resume Analysis', desc: 'Instant insights into how your resume matches job descriptions.', color: '#4ecdc4' },
              { icon: Zap, title: 'Real-Time Feedback', desc: 'Get instant feedback on your confidence, pacing, and correctness.', color: '#fbbf24' },
              { icon: Globe, title: 'Multi-Language', desc: 'Practice in English, Hindi, Tamil, Bengali, and more.', color: '#22d3a0' },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={fadeInUp}
                className="glass-card p-8 hover:bg-white/5 transition-all duration-300 group cursor-default"
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg"
                  style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Simple 3-Step Process</h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12 relative">
            {/* Connector Lines (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-1/2 pointer-events-none" />

            {[
              { step: '01', title: 'Upload Resume', desc: 'Provide your PDF resume. Our AI analyzes your skills, experience, and projects.' },
              { step: '02', title: 'Live AI Interview', desc: 'Engage in a natural voice-based interview with our contextual AI interviewer.' },
              { step: '03', title: 'Get Feedback', desc: 'Receive a detailed report with scores, strengths, and targeted improvement tips.' },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true }}
                className="relative flex flex-col items-center text-center p-8 bg-black/20 rounded-3xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="text-5xl font-black text-white/5 mb-6 leading-none">{item.step}</div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI PREVIEW (GLASSMOPRHISM MOCK) ─── */}
      <section className="py-24 px-6 relative bg-indigo-900/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Experience the Live Flow</h2>
            <p className="text-gray-400">A look inside our state-of-the-art interview console.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card overflow-hidden shadow-2xl border-white/10 p-2 md:p-6"
          >
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                session_id: sb_829_ai
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 rounded-2xl bg-indigo-950/40 border border-white/5 min-h-[300px] flex flex-col items-center justify-center relative">
                 <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--accent-primary),transparent_70%)]" />
                 <div className="w-24 h-24 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center relative z-10">
                    <Brain className="w-12 h-12 text-indigo-400 animate-pulse" />
                 </div>
                 <p className="mt-6 text-indigo-300 font-medium z-10">AI is listening...</p>
                 <div className="mt-4 px-6 py-3 rounded-xl bg-white/5 border border-white/10 max-w-xs text-center z-10">
                    <p className="text-white text-xs leading-relaxed italic">&ldquo;How do you handle strict deadlines and high-pressure release cycles?&rdquo;</p>
                 </div>
              </div>
              <div className="w-full lg:w-72 flex flex-col gap-4">
                 <div className="aspect-video lg:aspect-square rounded-2xl bg-gray-900 border border-white/5 relative overflow-hidden flex items-center justify-center">
                    <Video className="w-10 h-10 text-gray-700" />
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md">
                       <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-white uppercase">You</span>
                    </div>
                 </div>
                 <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Transcript</span>
                       <Mic className="w-3 h-3 text-indigo-400" />
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                       In my previous project, I used Kanban boards and prioritized critical path tasks to ensure we...
                    </p>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Simple Pricing</h2>
            <p className="text-gray-400">
              Start free, then unlock one-time interview credit packs from {starterPlan.priceLabel}.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-10 flex flex-col"
            >
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-gray-500 text-sm">/ month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {['2 Interviews / Mo', 'Basic AI Personas', 'Score Summary'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-gray-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-secondary w-full py-3.5 justify-center">Get Started</Link>
            </motion.div>

            {/* Pro Plan */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-10 flex flex-col bg-indigo-500/5 border-indigo-500/30 relative"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 text-[10px] font-black text-white uppercase tracking-widest shadow-xl">
                Recommended
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{proPlan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{proPlan.priceLabel}</span>
                  <span className="text-gray-500 text-sm">/ one-time pack</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  proPlan.creditsLabel,
                  'Role-based interview practice',
                  'Deep AI evaluation',
                  'Detailed feedback reports',
                  'Use credits anytime after purchase',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary w-full py-4 justify-center">
                Unlock {proPlan.creditsLabel}
              </Link>
            </motion.div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Need more volume? The {premiumPlan.name} pack gives you {premiumPlan.creditsLabel.toLowerCase()} for {premiumPlan.priceLabel}.
          </p>
        </div>
      </section>

      {/* ─── TESTIMONIALS (BONUS) ─── */}
      <section className="py-24 bg-indigo-600/5 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { name: 'Siddharth M.', role: 'Software Engineer at Google', text: 'SayBee helped me refine my technical behavior responses. The AI feedback on my pacing was 100% accurate.' },
            { name: 'Priya R.', role: 'UI/UX Designer', text: 'The glass-morphism UI is stunning, but it\'s the realistic AI persona that really prepared me for my big tech interview.' },
            { name: 'Arjun S.', role: 'Data Analyst', text: 'I practiced in Hindi first to get comfortable, then switched to English. The multi-language support is a game changer.' },
          ].map((t, i) => (
            <div key={i} className="glass-card p-8">
              <Quote className="w-8 h-8 text-indigo-500/20 mb-6" />
              <p className="text-gray-300 italic mb-8 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800" />
                <div>
                   <h4 className="text-sm font-bold text-white">{t.name}</h4>
                   <p className="text-[10px] text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div {...fadeInUp}>
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-8">
              Ready to Ace Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Next Interview?</span>
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Join thousands of candidates who used SayBee AI to build confidence and secure their dream jobs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/signup" className="btn-primary py-4 px-10 text-xl font-bold">Start Free Now</Link>
              <Link href="/signup" className="btn-secondary py-4 px-10 text-xl font-bold">Create Account</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 flex items-center justify-center">
                  <Image src="/logo.png" alt="SayBee AI Logo" width={32} height={32} className="object-contain" />
               </div>
               <span className="text-lg font-bold text-white">SayBee AI</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
               The world&apos;s most advanced AI interview platform for high-growth tech and business roles.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-gray-500">
               <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
               <li><a href="#" className="hover:text-indigo-400 transition-colors">How it Works</a></li>
               <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-500">
               <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
               <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
               <li><a href="#" className="hover:text-indigo-400 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
           <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">© 2026 SayBee AI. All rights reserved.</p>
           <div className="flex items-center gap-6">
              {['Twitter', 'LinkedIn', 'YouTube'].map(s => (
                <a key={s} href="#" className="text-[10px] font-bold text-gray-600 hover:text-white uppercase tracking-widest transition-colors">{s}</a>
              ))}
           </div>
        </div>
      </footer>
    </div>
  );
}
