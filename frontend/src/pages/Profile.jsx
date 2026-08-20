import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Mail, Calendar, Settings, ShieldCheck, 
  BarChart2, Edit3, Camera, Save, X, User, Lock 
} from 'lucide-react';

const Profile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit form states
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await axios.get('/api/meetings');
        if (res.data.success) {
          setMeetings(res.data.meetings);
        }
      } catch (err) {
        console.error('Failed to load meetings list for statistics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const totalMeetings = meetings.length;
  const hostedMeetings = meetings.filter(m => m.host?._id === user?._id).length;
  const joinedMeetings = totalMeetings - hostedMeetings;

  const joinDateStr = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) 
    : 'June 20, 2026';

  const handleStartEdit = () => {
    setFullName(user?.fullName || '');
    setEmail(user?.email || '');
    setPassword('');
    setSelectedFile(null);
    setPreviewUrl(user?.profileImage || '');
    setSubmitError('');
    setSubmitSuccess('');
    setIsEditing(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSubmitError('');
    setSubmitSuccess('');

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    if (password) {
      formData.append('password', password);
    }
    if (selectedFile) {
      formData.append('profileImage', selectedFile);
    }

    try {
      const res = await axios.put('/api/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setUser(res.data.user);
        setSubmitSuccess('Profile updated successfully!');
        setIsEditing(false);
        // Clear success notification after 3 seconds
        setTimeout(() => setSubmitSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white flex flex-col selection:bg-primary-500 selection:text-white transition-colors duration-300">
      {/* Header Bar */}
      <header className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-900 bg-white/85 dark:bg-slate-950/85 sticky top-0 backdrop-blur z-30 transition-colors duration-300">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-800 dark:hover:text-white transition flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          Back to Dashboard
        </button>
        <span className="text-sm font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex-shrink-0">My Account</span>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-6">
        
        {/* Status Alerts */}
        {submitSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold animate-fade-in">
            {submitSuccess}
          </div>
        )}

        {submitError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-2xl text-xs font-semibold animate-fade-in">
            {submitError}
          </div>
        )}

        {/* Profile Details/Edit Card */}
        <div className="glass-premium p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative animate-fade-in bg-white/40 dark:bg-slate-900/40 transition-colors">
          
          {/* Edit/Cancel actions toggle */}
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="hidden md:flex absolute top-6 right-6 items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-355 dark:hover:border-slate-700 text-slate-655 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="hidden md:flex absolute top-6 right-6 items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-355 dark:hover:border-slate-700 text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-semibold transition"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}

          {!isEditing ? (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar display */}
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-lg relative shrink-0">
                <img
                  src={user?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                  alt={user?.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details display */}
              <div className="flex-1 space-y-4 text-center md:text-left w-full">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white">{user?.fullName}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-900 text-primary-600 dark:text-primary-400 text-[10px] font-semibold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    {user?.role === 'admin' ? 'Administrator' : 'Standard Account'}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-200 dark:border-slate-850">
                  <div className="flex items-center justify-center md:justify-start gap-2.5 text-slate-650 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-slate-450 dark:text-slate-500 shrink-0" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2.5 text-slate-650 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-450 dark:text-slate-500 shrink-0" />
                    <span>Joined {joinDateStr}</span>
                  </div>
                </div>

                {/* Edit Profile button (Mobile only) */}
                <div className="pt-4 flex md:hidden w-full">
                  <button
                    onClick={handleStartEdit}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <h3 className="text-sm font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary-400" />
                Edit Profile Details
              </h3>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Image Edit & Upload */}
                <div className="relative group w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 shadow-lg shrink-0">
                  <img
                    src={previewUrl || 'https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff&size=200'}
                    alt="Preview"
                    className="w-full h-full object-cover transition group-hover:scale-105 duration-200"
                  />
                  <label className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-1 cursor-pointer opacity-0 group-hover:opacity-100 transition duration-200">
                    <Camera className="w-5 h-5 text-slate-300" />
                    <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Change</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Fields Edit */}
                <div className="flex-1 w-full space-y-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-xs outline-none transition text-slate-800 dark:text-white"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-xs outline-none transition text-slate-800 dark:text-white"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password (Optional)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-xs outline-none transition text-slate-800 dark:text-white"
                        placeholder="Leave blank to keep current password"
                        minLength="6"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold rounded-xl transition border-slate-250 hover:border-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-primary-900/10 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Statistics block */}
        <div className="glass-premium p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-2xl bg-white/40 dark:bg-slate-900/40 transition-colors">
          <h3 className="text-sm font-semibold tracking-wider text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2">
            <BarChart2 className="w-4.5 h-4.5 text-primary-400" />
            Meeting Statistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { count: totalMeetings, label: 'Total Calls Logged', desc: 'All conference events', color: 'border-primary-200 dark:border-primary-900 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20' },
              { count: hostedMeetings, label: 'Meetings Hosted', desc: 'Rooms created by you', color: 'border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' },
              { count: joinedMeetings, label: 'Meetings Joined', desc: 'Rooms joined by code', color: 'border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' },
            ].map((stat, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border ${stat.color} text-center space-y-1`}>
                <span className="text-2xl font-bold tracking-tight">{stat.count}</span>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">{stat.label}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
