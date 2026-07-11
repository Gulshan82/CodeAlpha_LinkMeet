import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash, CheckCircle2, BarChart2 } from 'lucide-react';

const PollSystem = ({ active, isHost }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [polls, setPolls] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  // Handle socket sync
  useEffect(() => {
    if (!socket) return;

    // Listen to new poll creations
    socket.on('poll-created', (newPoll) => {
      setPolls((prev) => [newPoll, ...prev]);
    });

    // Listen to poll updates (votes count change)
    socket.on('poll-updated', (updatedPoll) => {
      setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
    });

    // Sync previous polls when joining
    socket.on('sync-polls', (syncedPolls) => {
      setPolls(syncedPolls);
    });

    return () => {
      socket.off('poll-created');
      socket.off('poll-updated');
      socket.off('sync-polls');
    };
  }, [socket]);

  const handleAddOption = () => {
    setOptions((prev) => [...prev, '']);
  };

  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreatePollSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    const filteredOptions = options.filter(opt => opt.trim() !== '');
    if (filteredOptions.length < 2) return;

    if (socket) {
      socket.emit('create-poll', {
        question: question.trim(),
        options: filteredOptions,
      });
    }

    setQuestion('');
    setOptions(['', '']);
    setShowCreate(false);
  };

  const handleVote = (pollId, optionIndex) => {
    if (socket) {
      socket.emit('cast-vote', {
        pollId,
        optionIndex,
        userId: user?._id,
      });
    }
  };

  if (!active) return null;

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col justify-between text-white transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-slate-200">Interactive Polls</h3>
          <p className="text-xs text-slate-500">Collect real-time feedback</p>
        </div>
        {isHost && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Creator panel overlay */}
        {showCreate ? (
          <form onSubmit={handleCreatePollSubmit} className="space-y-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-300">Draft New Poll</h4>
            <div>
              <label className="text-[10px] text-slate-500">Poll Question</label>
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is your feedback on...?"
                className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500">Choices</label>
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg focus:outline-none focus:border-primary-500"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-red-400 hover:bg-red-950/30 rounded-lg transition"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 mt-1"
              >
                <Plus className="w-3 h-3" /> Add choice
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-xs font-semibold transition"
              >
                Launch Poll
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setQuestion('');
                  setOptions(['', '']);
                }}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {/* List of active/completed polls */}
        {polls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <BarChart2 className="w-8 h-8 text-slate-700 mb-2" />
            <p>No active polls.</p>
            <p className="mt-1">Create one to engage members.</p>
          </div>
        ) : (
          polls.map((poll) => {
            // Count total votes
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

            return (
              <div key={poll.id} className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">{poll.question}</h4>

                <div className="space-y-2">
                  {poll.options.map((opt, idx) => {
                    const hasVoted = opt.votes.includes(user?._id);
                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);

                    return (
                      <div key={idx} className="relative flex flex-col gap-1">
                        <button
                          onClick={() => handleVote(poll.id, idx)}
                          className={`w-full flex items-center justify-between text-left p-2.5 rounded-lg border text-xs relative overflow-hidden transition ${
                            hasVoted 
                              ? 'bg-primary-950/20 border-primary-500 text-primary-300 font-medium' 
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {/* Progress bar background fill */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-primary-600/10 transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                          <span className="relative z-10 flex items-center gap-2">
                            {hasVoted && <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" />}
                            {opt.text}
                          </span>
                          <span className="relative z-10 font-mono text-[10px] text-slate-400">
                            {opt.votes.length} ({percentage}%)
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>Total votes cast: {totalVotes}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PollSystem;
