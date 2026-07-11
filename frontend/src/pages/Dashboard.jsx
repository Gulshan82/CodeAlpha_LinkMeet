import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Video, Plus, Keyboard, History, Bell, LogOut, Sun, Moon, 
  VideoOff, Calendar, Award, AlertCircle, ArrowUpRight,
  Copy, Check, Share2, X, Link2, ExternalLink
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const [meetings, setMeetings] = useState([]);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch past meeting logs
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await axios.get('/api/meetings');
        if (res.data.success) {
          setMeetings(res.data.meetings);
        }
      } catch (err) {
        console.error('Failed to load meeting history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const handleCreateMeeting = async (isInstant = true) => {
    setLoadingAction(true);
    setErrorMessage('');
    try {
      const res = await axios.post('/api/meetings/create');
      if (res.data.success) {
        const meetingId = res.data.meeting.meetingId;
        const inviteUrl = window.location.origin + `/meeting/${meetingId}`;
        
        if (isInstant) {
          navigate(`/meeting/${meetingId}?instant=true`);
        } else {
          setCreatedMeeting({ meetingId, inviteUrl });
          setShowShareModal(true);
          
          // Refresh list
          try {
            const histRes = await axios.get('/api/meetings');
            if (histRes.data.success) {
              setMeetings(histRes.data.meetings);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    } catch (err) {
      setErrorMessage('Failed to create meeting room. Try again.');
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinMeetingSubmit = (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;

    // Sanitize input
    const cleanId = joinId.trim().toLowerCase();
    navigate(`/meeting/${cleanId}`);
  };

  // Metrics computation
  const totalMeetingsCount = meetings.length;
  const hostedMeetingsCount = meetings.filter(m => m.host?._id === user?._id).length;
  const joinedMeetingsCount = totalMeetingsCount - hostedMeetingsCount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white flex flex-col selection:bg-primary-500 selection:text-white transition-colors duration-300">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 sticky top-0 backdrop-blur-md z-30 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/35">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent transition-colors">
            LinkMeet
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications bell */}
          <Link
            to="/notifications"
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition relative"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full animate-ping"></span>
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* User profile dropdown button */}
          <Link
            to="/profile"
            className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <img
              src={user?.profileImage}
              alt="User"
              className="w-7 h-7 rounded-lg object-cover border border-slate-250 dark:border-slate-800"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 pr-1.5 hidden sm:inline">
              {user?.fullName.split(' ')[0]}
            </span>
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-white hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
            title="Log Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Create / Join actions + Metrics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Create & Join Card */}
          <div className="glass-premium p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6 shadow-xl bg-white/40 dark:bg-slate-900/20">
            <h2 className="text-base font-bold tracking-wide text-slate-800 dark:text-white">Start Collaboration</h2>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* New Meeting Button with Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  disabled={loadingAction}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-semibold transition text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary-900/10 dark:shadow-primary-950/50"
                >
                  <Plus className="w-4.5 h-4.5" />
                  {loadingAction ? 'Initializing Room...' : 'New Meeting'}
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    
                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 py-2 animate-fade-in text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          handleCreateMeeting(true);
                        }}
                        className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 transition"
                      >
                        <Video className="w-4 h-4 text-primary-500" />
                        Start an instant meeting
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          handleCreateMeeting(false);
                        }}
                        className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 transition border-t border-slate-100 dark:border-slate-850"
                      >
                        <Link2 className="w-4 h-4 text-emerald-500" />
                        Create a meeting for later
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 py-1 text-slate-400 dark:text-slate-700">
                <span className="h-px bg-slate-200 dark:bg-slate-900 flex-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Or</span>
                <span className="h-px bg-slate-200 dark:bg-slate-900 flex-1" />
              </div>

              {/* Join with code */}
              <form onSubmit={handleJoinMeetingSubmit} className="space-y-2">
                <div className="relative">
                  <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    placeholder="Enter Meeting ID (abc-defg-hij)"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white rounded-xl focus:outline-none focus:border-primary-500 transition placeholder-slate-400 dark:placeholder-slate-600 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl transition text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                >
                  Join Meeting
                </button>
              </form>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { count: totalMeetingsCount, label: 'Meetings', color: 'text-primary-500 dark:text-primary-400', icon: <History className="w-4 h-4" /> },
              { count: hostedMeetingsCount, label: 'Hosted', color: 'text-emerald-500 dark:text-emerald-400', icon: <Award className="w-4 h-4" /> },
              { count: joinedMeetingsCount, label: 'Joined', color: 'text-indigo-500 dark:text-indigo-400', icon: <Calendar className="w-4 h-4" /> },
            ].map((m, idx) => (
              <div key={idx} className="glass p-4 rounded-2xl border border-slate-200 dark:border-slate-900 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-slate-900/20">
                <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 mb-2 ${m.color}`}>
                  {m.icon}
                </div>
                <span className="text-base font-bold tracking-tight text-slate-800 dark:text-white">{m.count}</span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase mt-0.5">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Meeting logs history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-premium p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 min-h-[400px] flex flex-col justify-between shadow-xl bg-white/40 dark:bg-slate-900/20">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900">
                <h3 className="text-sm font-semibold tracking-wider text-slate-700 dark:text-slate-200 uppercase">Meeting History</h3>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Syncing live</span>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <div className="w-8 h-8 border-4 border-t-primary-500 border-r-transparent border-b-primary-500 border-l-transparent rounded-full animate-spin"></div>
                  <p className="mt-4">Syncing workspace logs...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-slate-400 dark:text-slate-650">
                    <VideoOff className="w-8 h-8" />
                  </div>
                  <p className="text-xs">No previous meetings recorded.</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 max-w-xs">Start a new call or enter a colleague's room ID to build logs history.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-900 mt-2">
                  {meetings.map((m) => {
                    const isHost = m.host?._id === user?._id;
                    const dateStr = new Date(m.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeStr = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={m._id} className="py-3.5 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-900/20 px-2 rounded-xl transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isHost 
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-250 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-primary-50 dark:bg-primary-950/50 border border-primary-250 dark:border-primary-800 text-primary-600 dark:text-primary-400'
                          }`}>
                            <Video className="w-4 h-4" />
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                              {m.meetingId}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {isHost ? `Hosted by you` : `Hosted by ${m.host?.fullName || 'Anonymous'}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{dateStr}</span>
                            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">{timeStr}</span>
                          </div>
                          <button
                            onClick={() => navigate(`/meeting/${m.meetingId}`)}
                            className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white transition"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-slate-400 dark:text-slate-600 pt-4 border-t border-slate-100 dark:border-slate-900 text-center">
              Meetings are limited to 40 minutes for standard mesh peers topology configurations.
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal for "Create meeting for later" */}
      {showShareModal && createdMeeting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in text-slate-800 dark:text-white">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 relative flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary-500" />
              Meeting Created
            </h3>
            
            <div className="space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                Here's the link to your meeting. Copy it and send it to the people you want to join.
              </p>
              
              {/* Meeting Link Display Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meeting Link</span>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-mono text-slate-650 dark:text-slate-350 truncate select-all">{createdMeeting.inviteUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdMeeting.inviteUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                    title="Copy Meeting Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Share</span>
                <div className="grid grid-cols-3 gap-2">
                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my LinkMeet video call:\n${createdMeeting.inviteUrl}\nMeeting ID: ${createdMeeting.meetingId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-center font-semibold text-emerald-600 dark:text-emerald-450 transition flex items-center justify-center gap-1.5"
                  >
                    WhatsApp
                  </a>
                  
                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(createdMeeting.inviteUrl)}&text=${encodeURIComponent(`Join my LinkMeet video call!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-900 rounded-xl text-center font-semibold text-sky-600 dark:text-sky-450 transition flex items-center justify-center gap-1.5"
                  >
                    Telegram
                  </a>

                  {/* System Share */}
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'LinkMeet Conference',
                          text: `Join my LinkMeet video call:\nDirect Link: ${createdMeeting.inviteUrl}\nMeeting ID: ${createdMeeting.meetingId}`,
                          url: createdMeeting.inviteUrl
                        }).catch(err => console.log('Error sharing:', err));
                      } else {
                        const text = `Join my LinkMeet video call:\nDirect Link: ${createdMeeting.inviteUrl}\nMeeting ID: ${createdMeeting.meetingId}`;
                        navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="py-2.5 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-semibold text-slate-650 dark:text-slate-350 transition flex items-center justify-center gap-1.5"
                  >
                    {navigator.share ? 'System Share' : (copied ? 'Copied Invite' : 'Copy Invite')}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    navigate(`/meeting/${createdMeeting.meetingId}`);
                  }}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-primary-950/20"
                >
                  Join Meeting
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
