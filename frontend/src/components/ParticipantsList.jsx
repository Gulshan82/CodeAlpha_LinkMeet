import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mic, MicOff, Video, VideoOff, ShieldAlert, Award, Star } from 'lucide-react';

const ParticipantsList = ({ participants, isHost, hostId, onMuteParticipant, onRemoveParticipant, active }) => {
  const { user } = useAuth();

  if (!active) return null;

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col justify-between text-white transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-sm font-semibold tracking-wider text-slate-200">
          Participants ({participants.length})
        </h3>
        <p className="text-xs text-slate-500">Manage meeting members and states</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.map((p) => {
          const isParticipantMe = p.user._id === user?._id;
          const isParticipantHost = p.user._id === hostId;

          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={p.user.profileImage}
                    alt={p.user.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-md"
                  />
                  {p.isRaised && (
                    <span className="absolute -top-1.5 -right-1 text-base animate-bounce-slow">
                      ✋
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    {p.user.fullName}
                    {isParticipantMe && <span className="text-[9px] bg-primary-600/30 text-primary-300 px-1.5 py-0.5 rounded-full">(You)</span>}
                    {isParticipantHost && <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />}
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    {isParticipantHost ? 'Meeting Host' : 'Attendee'}
                  </span>
                </div>
              </div>

              {/* Status Icons & Admin Controls */}
              <div className="flex items-center gap-2">
                {/* Audio/Video Indicators */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg text-slate-400">
                  {p.audioMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-green-500" />
                  )}
                  {p.videoMuted ? (
                    <VideoOff className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>

                {/* Host Controls */}
                {isHost && !isParticipantMe && (
                  <div className="flex items-center gap-1">
                    {/* Remote Mute button */}
                    <button
                      onClick={() => onMuteParticipant(p.socketId, 'audio', !p.audioMuted)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                      title={p.audioMuted ? "Unmute Peer" : "Mute Peer"}
                    >
                      {p.audioMuted ? <Mic className="w-3.5 h-3.5 text-green-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    </button>
                    {/* Kick user button */}
                    <button
                      onClick={() => onRemoveParticipant(p.socketId)}
                      className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900 hover:border-red-600 text-red-400 hover:text-white rounded-lg transition"
                      title="Kick Participant"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantsList;
