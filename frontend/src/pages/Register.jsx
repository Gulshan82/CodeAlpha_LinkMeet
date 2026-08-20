import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, User, Mail, Lock, Camera, ShieldAlert, ArrowRight } from 'lucide-react';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleCallback = async (response) => {
    setErrorMsg('');
    setLoadingForm(true);
    const result = await loginWithGoogle(response.credential);
    setLoadingForm(false);

    if (result && result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result?.message || 'Google Sign-in failed. Please try again.');
    }
  };

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1047120610363-placeholder.apps.googleusercontent.com',
          callback: handleGoogleCallback,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('googleSignUpBtn'),
          { theme: 'dark', size: 'large', width: '100%', shape: 'pill' }
        );
      }
    };

    initializeGoogle();

    const interval = setInterval(() => {
      if (window.google) {
        initializeGoogle();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoadingForm(true);

    // Build FormData payload for file uploads fallback
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('password', password);
    if (profileImage) {
      formData.append('profileImage', profileImage);
    }

    const result = await register(formData);
    setLoadingForm(false);

    if (result && result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col lg:flex-row selection:bg-primary-500 selection:text-white overflow-hidden transition-colors duration-300">
      {/* Left Panel - Branding & Visuals (Visible on lg screens only) */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-slate-900 via-slate-950 to-primary-950 p-12 flex-col justify-between border-r border-slate-200 dark:border-slate-900 relative overflow-hidden shrink-0">
        {/* Decorative background gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        
        {/* Top Header */}
        <div className="flex items-center gap-2.5 z-10">
          <Link to="/" className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/35">
            <Video className="w-5 h-5 text-white" />
          </Link>
          <span className="text-lg font-bold tracking-tight text-white">LinkMeet</span>
        </div>

        {/* Center visual copy */}
        <div className="space-y-6 z-10 max-w-sm my-auto">
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
            Connect, Collaborate, and Create in Real-Time.
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            Experience high-fidelity audio/video meetings with shared whiteboards, real-time chats, group polls, and AI-powered transcripts.
          </p>
          
          {/* Small feature badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { title: "HD Video Calls", desc: "Low-latency WebRTC mesh" },
              { title: "Interactive Board", desc: "Collaborative vector sync" },
              { title: "Instant Chat & Polls", desc: "Real-time active engagement" },
              { title: "AI Notes Summaries", desc: "Automated transcripts" }
            ].map((feat, idx) => (
              <div key={idx} className="p-3 bg-white/5 dark:bg-slate-900/30 border border-slate-800/50 rounded-xl">
                <span className="font-bold text-[11px] text-slate-200 block">{feat.title}</span>
                <span className="text-[9px] text-slate-500 mt-0.5 block">{feat.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-[10px] text-slate-600 z-10">
          &copy; {new Date().getFullYear()} LinkMeet. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form (Centered container) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-300">
        {/* Mobile Header (Hidden on lg screens) */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
          <Link to="/" className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </Link>
          <span className="text-sm font-bold text-slate-900 dark:text-white">LinkMeet</span>
        </div>

        {/* Container Card */}
        <div className="max-w-md w-full glass-premium p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-2xl relative animate-fade-in my-8 bg-white/60 dark:bg-slate-900/40">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <Link to="/" className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-900/30">
              <Video className="w-6 h-6 text-white" />
            </Link>
            <h2 className="text-xl font-bold tracking-wide mt-2 text-slate-900 dark:text-white">Create Account</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Join LinkMeet workspace and collaborate</p>
          </div>

          {/* Errors display */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar selector */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative group">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full cursor-pointer hover:bg-primary-500 hover:scale-110 transition shadow-md shadow-primary-950/50">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Upload profile image (optional)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 tracking-wider uppercase">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Carter"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-primary-500 transition placeholder-slate-400 dark:placeholder-slate-600 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 tracking-wider uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-primary-500 transition placeholder-slate-400 dark:placeholder-slate-600 shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 tracking-wider uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-primary-500 transition placeholder-slate-400 dark:placeholder-slate-600 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 tracking-wider uppercase">Confirm Pass</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-xl focus:outline-none focus:border-primary-500 transition placeholder-slate-400 dark:placeholder-slate-600 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingForm}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-xs font-semibold rounded-xl transition shadow-lg shadow-primary-900/25 disabled:opacity-50 flex items-center justify-center gap-1.5 text-white"
            >
              {loadingForm ? (
                <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
            <span className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase absolute">Or continue with</span>
          </div>

          {/* Google Button */}
          <div id="googleSignUpBtn" className="w-full flex justify-center"></div>

          {/* Login redirect */}
          <div className="text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-900 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
