import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Send, Smile, Paperclip } from 'lucide-react';

const ChatPanel = ({ meetingId, active }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const { socket } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Fetch past messages
  useEffect(() => {
    if (!meetingId) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`/api/messages/${meetingId}`);
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Error fetching chat history:', err);
      }
    };

    fetchMessages();
  }, [meetingId]);

  // Listen to new real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('message-received', handleNewMessage);

    return () => {
      socket.off('message-received', handleNewMessage);
    };
  }, [socket]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, active]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messagePayload = {
      meetingId,
      message: inputText.trim(),
    };

    try {
      const res = await axios.post('/api/messages', messagePayload);
      if (res.data.success) {
        const savedMsg = res.data.message;
        setMessages((prev) => [...prev, savedMsg]);
        setInputText('');

        // Emit message to room via socket
        if (socket) {
          socket.emit('send-message', savedMsg);
        }
      }
    } catch (err) {
      console.error('Failed to post message:', err);
    }
  };

  const handleEmojiClick = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  if (!active) return null;

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col justify-between text-white transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-sm font-semibold tracking-wider text-slate-200">Meeting Chat</h3>
        <p className="text-xs text-slate-500">Messages are encrypted and synced</p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <p>No messages yet.</p>
            <p className="mt-1">Type below to start chatting!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender._id === user?._id;
            return (
              <div key={msg._id || index} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <img
                  src={msg.sender.profileImage}
                  alt={msg.sender.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-md"
                />
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-slate-400">
                      {isMe ? 'You' : msg.sender.fullName}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-xs ${
                    isMe 
                      ? 'bg-primary-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker helper bar */}
      <div className="px-3 py-1 bg-slate-950 flex items-center justify-around gap-1.5 border-t border-slate-800">
        {['👍', '🔥', '👏', '😂', '🎉', '❤️', '🙌'].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="hover:scale-125 transition text-xs p-1"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input section */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message peers..."
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:outline-none focus:border-primary-500 placeholder-slate-600 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl transition shadow-md shadow-primary-900/10"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
