import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WaitingRoom = ({ active, meetingId, hostName }) => {
  const navigate = useNavigate();

  if (!active) return null;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-50 p-6">
      <div className="max-w-md w-full glass-premium p-8 rounded-3xl border border-slate-800 text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 bg-primary-600/10 border border-primary-500 rounded-full flex items-center justify-center animate-pulse-slow">
          <ShieldCheck className="w-8 h-8 text-primary-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-wide">Waiting for Host</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            You've requested to join meeting ID <span className="font-mono text-white bg-slate-900 px-2 py-1 rounded border border-slate-800">{meetingId}</span>.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            The organizer <span className="font-semibold text-slate-300">{hostName || 'Host'}</span> has been notified and will let you in shortly.
          </p>
        </div>

        {/* Fancy loading circle */}
        <div className="flex justify-center py-2">
          <div className="w-8 h-8 border-4 border-t-primary-500 border-r-transparent border-b-primary-500 border-l-transparent rounded-full animate-spin"></div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-950/40 hover:bg-red-900 border border-red-900 hover:border-red-600 text-red-400 hover:text-white rounded-xl text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" />
          Leave Queue
        </button>
      </div>
    </div>
  );
};

export default WaitingRoom;
