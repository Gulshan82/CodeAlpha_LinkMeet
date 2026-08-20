import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import InstallPwaBanner from '../components/InstallPwaBanner';
import { 
  Video, Plus, Keyboard, History, Bell, LogOut, Sun, Moon, 
  VideoOff, Calendar, Award, AlertCircle, ArrowUpRight,
  Copy, Check, Share2, X, Link2, ExternalLink, Clock
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
  const [time, setTime] = useState(new Date());

  // Clock tick effect
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };
  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 sticky top-0 backdrop-blur-md z-30 transition-colors duration-300">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/35 flex-shrink-0">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent transition-colors flex-shrink-0">
            LinkMeet
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Notifications bell */}
          <Link
            to="/notifications"
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition relative flex-shrink-0"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full animate-ping"></span>
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition flex-shrink-0"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4.5 h-4.5 flex-shrink-0" /> : <Moon className="w-4.5 h-4.5 flex-shrink-0" />}
          </button>

          {/* User profile dropdown button */}
          <Link
            to="/profile"
            className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-full hover:border-slate-300 dark:hover:border-slate-700 transition flex-shrink-0"
          >
            <img
              src={user?.profileImage}
              alt="User"
              className="w-7 h-7 rounded-full object-cover border border-slate-250 dark:border-slate-800 flex-shrink-0"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 pr-1.5 hidden sm:inline flex-shrink-0">
              {user?.fullName.split(' ')[0]}
            </span>
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-white hover:bg-red-55 dark:hover:bg-red-950/40 rounded-lg transition flex-shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side (lg:col-span-2): Welcome Banner, Start Meeting Dashboard, Stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Welcome Banner & Live Clock */}
          <div className="glass-premium p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl bg-white/40 dark:bg-slate-900/20">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-950 to-slate-700 dark:from-white dark:to-slate-350 bg-clip-text text-transparent">
                {getGreeting()}, {user?.fullName || 'User'}!
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ready to connect? Host or join a secure conference room in seconds.
              </p>
            </div>
            
            {/* Live Clock / Calendar Badge */}
            <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/20 dark:border-slate-800/20 px-4.5 py-2.5 rounded-2xl shadow-sm">
              <Clock className="w-4.5 h-4.5 text-primary-550 dark:text-primary-400 animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-mono font-bold tracking-tight text-slate-800 dark:text-white">
                  {formatTime(time)}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {formatDate(time)}
                </span>
              </div>
            </div>
          </div>

          {/* Start Meeting Console */}
          <div className="glass-premium p-8 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-8 shadow-xl bg-white/40 dark:bg-slate-900/20">
            <div className="pb-2">
              <h2 className="text-base font-bold tracking-tight text-slate-850 dark:text-white">Start Meeting</h2>
              <p className="text-xs text-slate-450 dark:text-slate-500">Create a new meeting room or join an existing session instantly.</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/60 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
              {/* Card Part 1: Host a Meeting */}
              <div className="flex flex-col justify-between space-y-6 md:pr-10 md:border-r md:border-slate-200/40 md:dark:border-slate-800/30">
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Host a Meeting</h3>
                    <p className="text-[11px] text-slate-450 dark:text-slate-450 leading-relaxed">
                      Instantly host a new web-conference call, or generate a link that you can share with colleagues to join later.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateMeeting(true)}
                    disabled={loadingAction}
                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-550 hover:to-indigo-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200 text-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4" />
                    {loadingAction ? 'Initializing...' : 'Start Instant Meeting'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateMeeting(false)}
                    disabled={loadingAction}
                    className="w-full py-3 bg-slate-100/60 hover:bg-slate-200/60 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white rounded-xl font-semibold transition text-xs flex items-center justify-center gap-1.5 border border-slate-200/40 dark:border-slate-800/40"
                  >
                    <Link2 className="w-4 h-4 text-emerald-500" />
                    Create Link for Later
                  </button>
                </div>
              </div>

              {/* Card Part 2: Join Meeting */}
              <div className="flex flex-col justify-between space-y-6 md:pl-2">
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Join via Code</h3>
                    <p className="text-[11px] text-slate-450 dark:text-slate-450 leading-relaxed">
                      Enter the meeting ID or direct room link provided by the coordinator to instantly jump into the session room.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleJoinMeetingSubmit} className="space-y-2.5 pt-2">
                  <div className="relative">
                    <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450 dark:text-slate-550" />
                    <input
                      type="text"
                      required
                      value={joinId}
                      onChange={(e) => setJoinId(e.target.value)}
                      placeholder="Enter ID (abc-defg-hij)"
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-850 text-xs text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition placeholder-slate-400 dark:placeholder-slate-650 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-650 to-primary-600 hover:from-indigo-600 hover:to-primary-550 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200 text-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  >
                    Join Room
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { count: totalMeetingsCount, label: 'Meetings', color: 'text-primary-500 dark:text-primary-400', icon: <History className="w-4 h-4" /> },
              { count: hostedMeetingsCount, label: 'Hosted', color: 'text-emerald-500 dark:text-emerald-400', icon: <Award className="w-4 h-4" /> },
              { count: joinedMeetingsCount, label: 'Joined', color: 'text-indigo-500 dark:text-indigo-400', icon: <Calendar className="w-4 h-4" /> },
            ].map((m, idx) => (
              <div key={idx} className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-900/80 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-slate-800 transition duration-300">
                <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 mb-2 ${m.color} border border-slate-200/20 dark:border-slate-800/40 shadow-inner`}>
                  {m.icon}
                </div>
                <span className="text-lg md:text-xl font-bold tracking-tight text-slate-800 dark:text-white">{m.count}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side (lg:col-span-1): Meeting History (now Sidebar) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-premium p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 min-h-[500px] flex flex-col justify-between shadow-xl bg-white/40 dark:bg-slate-900/20">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-900">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase">Meeting History</h3>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 italic font-medium">Syncing live</span>
              </div>

              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-550 dark:text-slate-450 text-xs gap-3">
                  <div className="w-7 h-7 border-3 border-t-primary-500 border-r-transparent border-b-primary-500 border-l-transparent rounded-full animate-spin"></div>
                  <p className="font-medium animate-pulse">Syncing logs...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center space-y-4 px-2">
                  <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-650">
                    <VideoOff className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350">No meetings recorded</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 max-w-[200px] mx-auto leading-relaxed">
                      Start or join a video call above to record activity log.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-150 dark:divide-slate-900 mt-2 max-h-[460px] overflow-y-auto pr-1">
                  {meetings.map((m) => {
                    const isHost = m.host?._id === user?._id;
                    const dateStr = new Date(m.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    const timeStr = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isEnded = Date.now() - new Date(m.startTime || m.createdAt).getTime() > 24 * 60 * 60 * 1000;

                    return (
                      <div key={m._id} className="py-3 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-900/20 px-2 rounded-xl transition duration-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isEnded
                              ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-400'
                              : isHost 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-primary-50 dark:bg-primary-950/40 border border-primary-250 dark:border-primary-800 text-primary-600 dark:text-primary-400'
                          }`}>
                            <Video className="w-3.5 h-3.5" />
                          </div>
                          
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                {m.meetingId}
                              </span>
                              {isEnded ? (
                                <span className="px-1 py-0.2 text-[8px] font-semibold bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded">
                                  Ended
                                </span>
                              ) : (
                                <span className="px-1 py-0.2 text-[8px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 rounded">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                              {isHost ? `Hosted by you` : `By ${m.host?.fullName || 'Guest'}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-650 dark:text-slate-350 font-bold">{dateStr}</span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono">{timeStr}</span>
                          </div>
                          {isEnded ? (
                            <button
                              disabled
                              title="This meeting has ended"
                              className="p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/meeting/${m.meetingId}`)}
                              title="Rejoin meeting"
                              className="p-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 dark:text-slate-450 hover:text-slate-850 dark:hover:text-white transition duration-200 shadow-sm"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="text-[9px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-150 dark:border-slate-900 text-center leading-relaxed font-medium">
              Free mesh peers topology is capped at 40 min / call.
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
      <InstallPwaBanner />
    </div>
  );
};

export default Dashboard;
