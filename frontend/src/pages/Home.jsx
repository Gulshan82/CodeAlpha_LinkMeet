import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, Shield, MessageSquare, Clipboard, Users, Share2, Compass, Layout } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-primary-500 selection:text-white">
      {/* Header / Nav */}
      <header className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/35">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            LinkMeet
          </span>
        </div>
        
        <nav className="flex items-center gap-4">
          {token ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-semibold rounded-xl transition shadow-lg shadow-primary-950/50 flex items-center gap-1.5"
            >
              <Layout className="w-4 h-4" />
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition">
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-semibold rounded-xl transition shadow-lg shadow-primary-950/50"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-900/30 border border-primary-500/20 text-primary-300 rounded-full text-xs font-semibold">
            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
            Next-Gen Real-Time Conferencing
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Connect, Collaborate & Create in{' '}
            <span className="bg-gradient-to-r from-primary-400 to-indigo-300 bg-clip-text text-transparent">
              Real-Time
            </span>
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg">
            LinkMeet provides crystal clear video conferencing, collaborative whiteboarding, file sharing, and live voting in one secured platform.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            {token ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3.5 bg-primary-600 hover:bg-primary-500 text-sm font-semibold rounded-xl transition shadow-lg shadow-primary-900/30 flex items-center gap-2"
              >
                Launch Workspace
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-3.5 bg-primary-600 hover:bg-primary-500 text-sm font-semibold rounded-xl transition shadow-lg shadow-primary-900/30"
                >
                  Start Free Meeting
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-sm font-semibold rounded-xl transition hover:text-white"
                >
                  Join with Code
                </button>
              </>
            )}
          </div>
        </div>

        {/* Visual Mockup Grid */}
        <div className="relative flex justify-center items-center lg:mt-0 mt-12">
          {/* Animated blurred backgrounds */}
          <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-3xl filter -z-10 animate-pulse-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl filter -z-10 animate-float-reverse"></div>
          
          <div className="w-full max-w-md p-6 glass-premium rounded-3xl border border-slate-800/80 shadow-2xl relative transition hover:border-slate-700/80 duration-500">
            
            {/* Floating Chat Alert (Animated) */}
            <div className="absolute -top-6 -left-8 p-2.5 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center gap-3 animate-float max-w-[210px] z-20">
              <div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden shrink-0 border border-slate-850">
                <img 
                  src="/gulshan.jpg" 
                  alt="Gulshan" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-slate-200">Gulshan</div>
                <div className="text-[9px] text-slate-400 truncate">Whiteboard design synced! 🚀</div>
              </div>
            </div>

            {/* Floating Live Poll Success (Animated) */}
            <div className="absolute -bottom-6 -right-6 p-2.5 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center gap-2.5 animate-float-reverse max-w-[190px] z-20">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <span className="text-[10px]">📊</span>
              </div>
              <div className="text-left">
                <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Live Poll</div>
                <div className="text-[10px] font-bold text-slate-200">98% Audio Quality</div>
              </div>
            </div>

            {/* Mock Video feed */}
            <div className="aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner group">
              <img
                src="https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&auto=format&fit=crop&q=80"
                alt="Presenter"
                className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
              />
              
              {/* Picture-in-Picture overlap participant */}
              <div className="absolute top-3 right-3 w-28 aspect-video bg-slate-950/90 rounded-lg overflow-hidden border border-slate-800 shadow-lg transition hover:scale-105 duration-300">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                  alt="Co-Host"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1.5 bg-slate-900/80 px-1 rounded text-[7px] font-semibold text-slate-300">
                  Emily R. (Co-Host)
                </div>
              </div>

              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-850 text-[10px] font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                Sarah J. (Host)
              </div>

              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <span className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center text-[10px] hover:bg-primary-500 cursor-pointer transition">🎙️</span>
                <span className="w-6 h-6 bg-slate-950/80 rounded-md flex items-center justify-center text-[10px] hover:bg-slate-900 cursor-pointer transition">🖥️</span>
              </div>
            </div>

            {/* Small active floating panel */}
            <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-slate-950/50 backdrop-blur-sm rounded-xl border border-slate-850 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-slate-300 text-[11px] font-medium">Shared Canvas is active</span>
              </div>
              <span 
                onClick={() => navigate('/dashboard')}
                className="text-primary-400 font-bold hover:text-primary-300 text-[11px] transition cursor-pointer"
              >
                Join whiteboard
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Features Overview */}
      <section className="bg-slate-950/40 border-t border-slate-900 py-20">
        <div className="max-w-7xl mx-auto w-full px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Everything You Need to Connect</h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              LinkMeet delivers production-grade collaborative features built for secure, enterprise-level sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Video className="w-5 h-5 text-primary-400" />,
                title: 'HD Multi-User calling',
                desc: 'WebRTC mesh integrations allow high quality, low-latency audio/video feeds.',
              },
              {
                icon: <Clipboard className="w-5 h-5 text-purple-400" />,
                title: 'Shared Whiteboards',
                desc: 'Draw, sketch, and clear notes simultaneously with direct socket sync.',
              },
              {
                icon: <MessageSquare className="w-5 h-5 text-indigo-400" />,
                title: 'Persistent Chat & Files',
                desc: 'Trade text chats and upload project documents inside meeting histories.',
              },
              {
                icon: <Shield className="w-5 h-5 text-emerald-400" />,
                title: 'Auth Protections',
                desc: 'JWT and bcrypt ensure meeting rooms require credentials or waiting room approval.',
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 transition duration-300"
              >
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center mb-4 border border-slate-800">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950/80 text-center text-xs text-slate-600">
        <p>&copy; {new Date().getFullYear()} LinkMeet. All rights reserved. Designed for Gulshan. Made with Love ❤️</p>
      </footer>
    </div>
  );
};

export default Home;
