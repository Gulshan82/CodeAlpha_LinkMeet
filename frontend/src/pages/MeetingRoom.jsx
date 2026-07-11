import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import ParticipantsList from '../components/ParticipantsList';
import ChatPanel from '../components/ChatPanel';
import Whiteboard from '../components/Whiteboard';
import PollSystem from '../components/PollSystem';
import WaitingRoom from '../components/WaitingRoom';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, X, Share2, Clipboard, 
  MessageSquare, Users, BarChart2, Smile, ArrowLeft, ShieldAlert,
  Download, Upload, Play, Pause, Sparkles, SmilePlus, HelpCircle,
  Copy, Check, UserPlus, Disc
} from 'lucide-react';

const MeetingRoom = () => {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  // Meeting states
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  
  // Invite & Copy states
  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleCopyLink = () => {
    const inviteUrl = window.location.origin + `/meeting/${meetingId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Media tracks states
  const [localStream, setLocalStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [blurBackground, setBlurBackground] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Panels visibility
  const [activePanel, setActivePanel] = useState('chat'); // 'chat', 'participants', 'polls', 'none'
  const [whiteboardActive, setWhiteboardActive] = useState(false);

  // WebRTC mesh state: peers list
  // Structure: { socketId, user, stream, isRaised, audioMuted, videoMuted, activeEmoji }
  const [peers, setPeers] = useState([]);
  const peerConnections = useRef({}); // maps socketId -> RTCPeerConnection
  const localVideoRef = useRef(null);
  const localScreenStreamRef = useRef(null);
  const localStreamRef = useRef(null);

  // Waiting Room state
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]); // List of users requesting to join (host view)

  // Hand raise and emoji triggers
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // File sharing states
  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Advanced features: AI Notes & Captions
  const [aiNotes, setAiNotes] = useState('');
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [liveCaptions, setLiveCaptions] = useState([]);
  const [captionsActive, setCaptionsActive] = useState(false);

  // Meeting Timer
  const [timer, setTimer] = useState(0);

  // ICE STUN Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19002' },
      { urls: 'stun:stun1.l.google.com:19002' },
    ],
  };

  // Fetch meeting profile from DB
  useEffect(() => {
    const fetchMeetingDetails = async () => {
      try {
        const res = await axios.get(`/api/meetings/${meetingId}`);
        if (res.data.success) {
          setMeeting(res.data.meeting);
          
          // Decide if user needs to wait in Waiting Room
          // Rule: If host joins, enter immediately. If attendee joins, go to Waiting Room.
          const isUserHost = res.data.meeting.host._id === user?._id;
          if (!isUserHost) {
            setInWaitingRoom(true);
          } else {
            // Host joins, initialize WebRTC & Socket
            initMeetingRoom();

            // Auto open invite modal if it was created as an instant meeting
            const queryParams = new URLSearchParams(window.location.search);
            if (queryParams.get('instant') === 'true') {
              setShowInviteModal(true);
            }
          }
        }
      } catch (err) {
        setErrorText('Failed to verify meeting credentials.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingDetails();

    return () => {
      // Cleanups
      closeAllConnections();
    };
  }, [meetingId]);

  // Handle meeting timer
  useEffect(() => {
    if (inWaitingRoom || loading) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [inWaitingRoom, loading]);

  // Sync files list for this meeting
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`/api/files/${meetingId}`);
      if (res.data.success) {
        setFiles(res.data.files);
      }
    } catch (err) {
      console.error('Failed to load shared files list', err);
    }
  };

  useEffect(() => {
    if (!inWaitingRoom && meeting) {
      fetchFiles();
    }
  }, [inWaitingRoom, meeting]);

  // Initialize Media Devices (Audio/Video)
  const initMeetingRoom = async () => {
    if (localStreamRef.current && localStreamRef.current.getTracks().some(t => t.readyState === 'live')) {
      console.log('Meeting room already initialized with active tracks.');
      return;
    }

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Connect to Socket room
      if (socket) {
        socket.emit('join-room', { meetingId, user });
      }
    } catch (err) {
      console.warn('Unable to grab webcam/microphone feeds. Initializing stream-less participation.', err);
      // Fallback for devices without webcam/microphone
      if (socket) {
        socket.emit('join-room', { meetingId, user });
      }
    }
  };

  // Re-attach local stream to localVideoRef when layout changes, stream updates, or camera status toggles
  useEffect(() => {
    if (localVideoRef.current && (localStream || localScreenStreamRef.current)) {
      localVideoRef.current.srcObject = screenSharing ? localScreenStreamRef.current : localStream;
    }
  }, [whiteboardActive, localStream, screenSharing, cameraOff]);

  // Close all streams and RTC Connections
  const closeAllConnections = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
      localScreenStreamRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    Object.keys(peerConnections.current).forEach((id) => {
      peerConnections.current[id].close();
    });
    peerConnections.current = {};
    setPeers([]);
  };

  // Socket.io WebRTC signal listeners
  useEffect(() => {
    if (!socket || inWaitingRoom) return;

    // Handle other users lists (mesh initiator)
    socket.on('room-users', async (usersList) => {
      console.log('Existing users in room:', usersList);
      setPeers((prev) => {
        let updated = [...prev];
        usersList.forEach(u => {
          if (!updated.some(p => p.socketId === u.socketId)) {
            updated.push({
              socketId: u.socketId,
              user: u.user,
              stream: null,
              isRaised: u.isRaised || false,
              audioMuted: u.audioMuted || false,
              videoMuted: u.videoMuted || false
            });
          }
        });
        return updated;
      });
      for (const u of usersList) {
        await createPeerConnection(u.socketId, u.user, true);
      }
    });

    // Handle newly joined peer
    socket.on('user-joined', ({ socketId, user: joinedUser, audioMuted, videoMuted, isRaised }) => {
      console.log('New peer joined:', joinedUser.fullName);
      setPeers((prev) => {
        if (prev.some(p => p.socketId === socketId)) return prev;
        return [...prev, { 
          socketId, 
          user: joinedUser, 
          stream: null, 
          isRaised: isRaised || false, 
          audioMuted: audioMuted || false, 
          videoMuted: videoMuted || false 
        }];
      });
    });

    // Handle RTC Offer
    socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
      const pc = await createPeerConnection(senderSocketId, null, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
    });

    // Handle RTC Answer
    socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      const pc = peerConnections.current[senderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle Ice Candidates
    socket.on('webrtc-candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnections.current[senderSocketId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Handle Peer Departure
    socket.on('user-left', ({ socketId }) => {
      console.log('Peer disconnected:', socketId);
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Sync Hand raises
    socket.on('hand-raised-status', ({ socketId, isRaised }) => {
      setPeers((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isRaised } : p))
      );
    });

    // Sync mute status
    socket.on('mute-status-changed', ({ socketId, trackType, isMuted }) => {
      setPeers((prev) =>
        prev.map((p) => {
          if (p.socketId === socketId) {
            if (trackType === 'audio') {
              return { ...p, audioMuted: isMuted };
            } else if (trackType === 'video') {
              return { ...p, videoMuted: isMuted };
            }
          }
          return p;
        })
      );
    });

    // Emoji floats
    socket.on('emoji-received', ({ socketId, emoji }) => {
      const id = Date.now() + Math.random();
      setFloatingEmojis((prev) => [...prev, { id, emoji, socketId }]);
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 3000);
    });

    // File received notices
    socket.on('file-received', (file) => {
      setFiles((prev) => [file, ...prev]);
    });

    // Waiting room alerts (Host view)
    socket.on('waiting-user-join-request', ({ socketId, user: applicant }) => {
      setJoinRequests((prev) => [...prev, { socketId, user: applicant }]);
    });

    // Waiting room approval callback (Guest view)
    socket.on('admittance-approved', () => {
      setInWaitingRoom(false);
      initMeetingRoom();
    });

    socket.on('admittance-rejected', () => {
      alert('The meeting host declined your request to join.');
      navigate('/dashboard');
    });

    // Moderator Commands
    socket.on('mute-command', ({ trackType, muteState }) => {
      if (trackType === 'audio') {
        toggleMic(muteState);
      }
    });

    socket.on('kick-command', () => {
      alert('You have been removed from this meeting by the host.');
      navigate('/dashboard');
    });

    return () => {
      socket.off('room-users');
      socket.off('user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-candidate');
      socket.off('user-left');
      socket.off('hand-raised-status');
      socket.off('mute-status-changed');
      socket.off('emoji-received');
      socket.off('file-received');
      socket.off('waiting-user-join-request');
      socket.off('admittance-approved');
      socket.off('admittance-rejected');
      socket.off('mute-command');
      socket.off('kick-command');
    };
  }, [socket, inWaitingRoom, localStream]);

  // Create WebRTC connection
  const createPeerConnection = async (peerSocketId, peerUserInfo, isInitiator) => {
    if (peerConnections.current[peerSocketId]) {
      return peerConnections.current[peerSocketId];
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerSocketId] = pc;

    // Push local tracks into connection
    if (screenSharing && localScreenStreamRef.current) {
      const screenTrack = localScreenStreamRef.current.getVideoTracks()[0];
      if (screenTrack) {
        pc.addTrack(screenTrack, localScreenStreamRef.current);
      } else {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
    } else {
      const videoTrack = localStream ? localStream.getVideoTracks()[0] : null;
      if (videoTrack) {
        pc.addTrack(videoTrack, localStream);
      } else {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
    }

    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, localStream);
      } else {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      }
    } else {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-candidate', {
          targetSocketId: peerSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Track received from peer:', peerSocketId);
      const remoteStream = event.streams[0];
      
      setPeers((prev) => {
        const index = prev.findIndex((p) => p.socketId === peerSocketId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], stream: remoteStream };
          return updated;
        } else {
          return [
            ...prev,
            {
              socketId: peerSocketId,
              user: peerUserInfo || { fullName: 'External Peer', profileImage: '' },
              stream: remoteStream,
              isRaised: false,
              audioMuted: false,
              videoMuted: false,
            },
          ];
        }
      });
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { targetSocketId: peerSocketId, offer });
    }

    return pc;
  };

  // Mic Toggle Action
  const toggleMic = (forcedState = null) => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newState = forcedState !== null ? forcedState : !audioTrack.enabled;
      audioTrack.enabled = newState;
      const isMuted = !newState;
      setMicMuted(isMuted);
      if (socket) {
        socket.emit('toggle-mute', { trackType: 'audio', isMuted });
      }
    }
  };

  // Camera Toggle Action
  const toggleCamera = async () => {
    if (!localStream) return;

    if (cameraOff) {
      // Turn camera ON
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];

        // Remove existing video tracks from localStream and stop them
        localStream.getVideoTracks().forEach((track) => {
          track.stop();
          localStream.removeTrack(track);
        });

        // Add the new track to localStream
        localStream.addTrack(newTrack);

        // If not screen sharing, replace track on peer connections and update local video ref
        if (!screenSharing) {
          replaceVideoTrack(newTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }

        setCameraOff(false);
        if (socket) {
          socket.emit('toggle-mute', { trackType: 'video', isMuted: false });
        }
      } catch (err) {
        console.error('Failed to start camera:', err);
      }
    } else {
      // Turn camera OFF
      localStream.getVideoTracks().forEach((track) => {
        track.stop(); // Stops the camera hardware, turning off the green light!
        localStream.removeTrack(track);
      });

      // If not screen sharing, send black frames / replace track with null
      if (!screenSharing) {
        replaceVideoTrack(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }

      setCameraOff(true);
      if (socket) {
        socket.emit('toggle-mute', { trackType: 'video', isMuted: true });
      }
    }
  };

  // Screen Sharing toggle
  const toggleScreenSharing = async () => {
    if (screenSharing) {
      // Stop sharing
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      setScreenSharing(false);
      restoreCameraStream();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localScreenStreamRef.current = stream;

        // Listen to screen share stop button inside browser banner
        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          restoreCameraStream();
        };

        // Replace local video track on all peer connections
        replaceVideoTrack(stream.getVideoTracks()[0]);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing canceled/failed:', err);
      }
    }
  };

  const replaceVideoTrack = (newTrack) => {
    Object.values(peerConnections.current).forEach((pc) => {
      const transceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video');
      if (transceiver && transceiver.sender) {
        transceiver.sender.replaceTrack(newTrack);
      }
    });
  };

  const restoreCameraStream = async () => {
    if (!localStream) return;
    const originalTrack = localStream.getVideoTracks()[0];
    if (originalTrack && !cameraOff) {
      replaceVideoTrack(originalTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      replaceVideoTrack(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  };

  // Recording Actions
  const startRecording = async () => {
    const proceed = window.confirm(
      "To record the meeting:\n1. Choose 'Chrome Tab' or 'This Tab' in the next browser prompt.\n2. Select this meeting tab.\n3. Make sure to check/tick 'Share tab audio' at the bottom left so everyone's voices are recorded.\n\nClick OK to start recording."
    );
    if (!proceed) return;

    try {
      // Capture tab or screen audio/video
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const dest = audioContext.createMediaStreamDestination();

      let hasAudio = false;

      // 1. Add screen audio source if present
      if (displayStream.getAudioTracks().length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(displayStream);
        screenAudioSource.connect(dest);
        hasAudio = true;
      }

      // 2. Add local microphone audio source if present and not muted
      if (localStream && localStream.getAudioTracks().length > 0 && !micMuted) {
        const micAudioSource = audioContext.createMediaStreamSource(localStream);
        micAudioSource.connect(dest);
        hasAudio = true;
      }

      // Mix display video track + audio tracks
      const tracks = [displayStream.getVideoTracks()[0]];
      if (hasAudio) {
        tracks.push(dest.stream.getAudioTracks()[0]);
      } else {
        if (displayStream.getAudioTracks().length > 0) {
          tracks.push(displayStream.getAudioTracks()[0]);
        } else if (localStream && localStream.getAudioTracks().length > 0 && !micMuted) {
          tracks.push(localStream.getAudioTracks()[0]);
        }
      }

      const combinedStream = new MediaStream(tracks);
      recordingStreamRef.current = displayStream;

      // Setup MediaRecorder
      recordingChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream, options);
      } catch (e) {
        try {
          recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
        } catch (e2) {
          recorder = new MediaRecorder(combinedStream);
        }
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = `LinkMeet_Meeting_${meetingId}_${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        displayStream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        
        setIsRecording(false);
        setRecordingDuration(0);
      };

      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  // Hand Raise emit
  const handleRaiseHandClick = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    if (socket) {
      socket.emit('toggle-hand-raise', newState);
    }
  };

  // Emoji Click trigger
  const handleSendEmoji = (emoji) => {
    if (socket) {
      socket.emit('send-emoji', emoji);
    }
  };

  // Host Action: Mute attendee
  const handleHostMute = (targetSocketId, trackType, muteState) => {
    if (socket) {
      socket.emit('mute-participant', { targetSocketId, trackType, muteState });
    }
  };

  // Host Action: Kick attendee
  const handleHostKick = (targetSocketId) => {
    if (socket) {
      socket.emit('remove-participant', { targetSocketId });
    }
  };

  // Host Action: Approve wait room attendee
  const handleApproveAdmittance = (guestSocketId) => {
    if (socket) {
      socket.emit('approve-user', { guestSocketId });
      setJoinRequests((prev) => prev.filter((item) => item.socketId !== guestSocketId));
    }
  };

  const handleRejectAdmittance = (guestSocketId) => {
    if (socket) {
      socket.emit('reject-user', { guestSocketId });
      setJoinRequests((prev) => prev.filter((item) => item.socketId !== guestSocketId));
    }
  };

  // Waiting Room request emitter (Guest side)
  useEffect(() => {
    if (inWaitingRoom && socket && meeting) {
      const hostSocketId = 'host'; // placeholder, backend routes based on connection logic
      socket.emit('request-admittance', {
        meetingId,
        user,
        hostSocketId,
      });
    }
  }, [inWaitingRoom, socket, meeting]);

  // File Upload flow
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('meetingId', meetingId);

    try {
      const res = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const fileRecord = res.data.file;
        setFiles((prev) => [fileRecord, ...prev]);

        // Broadcast file notice via Socket
        if (socket) {
          socket.emit('file-uploaded', fileRecord);
        }
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Error uploading document file.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Advanced features: AI Meeting Notes generator (Mock API fallback)
  const generateAINotes = () => {
    setGeneratingNotes(true);
    setTimeout(() => {
      setAiNotes(`
=== LINKMEET AI TRANSCRIPT SUMMARY ===
Meeting ID: ${meetingId}
Time: ${new Date().toLocaleDateString()}

Key Discussion Nodes:
1. Architecture Setup: Established standard mesh signaling routing.
2. WebRTC Peer streams: Synced 1-to-many audio/video streams.
3. Whiteboard Sync: Verified canvas paths transmission.

Action Items:
- Alex Carter to verify local uploads directories.
- Sarah Jenkins to configure Tailwind color schemas.
      `);
      setGeneratingNotes(false);
      setActivePanel('chat'); // switch panel to show notes
    }, 2000);
  };

  // Speech Recognition Captions toggle
  const toggleCaptions = () => {
    setCaptionsActive(!captionsActive);
    if (!captionsActive) {
      // Mock captions addition every few seconds
      const sampleCaptions = [
        "Welcome to LinkMeet collaboration platform.",
        "Please feel free to share your whiteboard sketches.",
        "Let's review the sprint board next."
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (!captionsActive) {
          const userStr = peers[0]?.user?.fullName || 'Colleague';
          setLiveCaptions((prev) => [...prev, `${userStr}: "${sampleCaptions[i % sampleCaptions.length]}"`].slice(-2));
          i++;
        }
      }, 5000);
      localStream.captionInterval = interval;
    } else {
      clearInterval(localStream.captionInterval);
      setLiveCaptions([]);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-t-primary-500 border-r-transparent border-b-primary-500 border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-400">Loading meeting room parameters...</p>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
        <div className="p-3 bg-red-950/40 border border-red-900 text-red-400 rounded-full">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold">Access Terminated</h2>
        <p className="text-xs text-slate-500 max-w-sm">{errorText}</p>
        <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-primary-600 rounded-xl text-xs font-semibold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Waiting Room holds page
  if (inWaitingRoom) {
    return (
      <WaitingRoom
        active={inWaitingRoom}
        meetingId={meetingId}
        hostName={meeting?.host?.fullName}
      />
    );
  }

  const isCurrentUserHost = meeting?.host?._id === user?._id;

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden selection:bg-primary-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                closeAllConnections();
                navigate('/dashboard');
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Leave Meeting"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-200 select-all">{meetingId}</span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  title="Copy Join Link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">LinkMeet Conference</span>
            </div>
          </div>

          {/* Meeting Timer */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span>{formatTimer(timer)}</span>
          </div>
        </div>

        {/* Advanced quick triggers & Record Button */}
        <div className="flex items-center gap-2">
          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition text-[11px] font-semibold ${
              isRecording 
                ? 'bg-red-650 text-white border-red-500 animate-pulse shadow-md shadow-red-950/20' 
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
            title={isRecording ? "Stop Recording" : "Record Meeting"}
          >
            <Disc className={`w-3.5 h-3.5 ${isRecording ? 'text-white' : 'text-red-500 animate-spin'}`} />
            {isRecording ? `REC ${formatTimer(recordingDuration)}` : 'Record'}
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition text-[11px] font-semibold shadow-md shadow-primary-950/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite
          </button>

          <button
            onClick={toggleCaptions}
            className={`px-3 py-1.5 rounded-lg border transition ${
              captionsActive 
                ? 'bg-primary-600 text-white border-primary-500' 
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            CC
          </button>

          <button
            onClick={generateAINotes}
            disabled={generatingNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/40 border border-indigo-900 text-indigo-400 rounded-lg hover:bg-indigo-900 hover:text-white transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generatingNotes ? 'Thinking...' : 'AI Notes'}
          </button>
        </div>
      </header>

      {/* Floating waiting notifications for Host */}
      {isCurrentUserHost && joinRequests.length > 0 && (
        <div className="fixed top-16 right-4 max-w-sm w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl z-40 animate-bounce-slow">
          <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-primary-400" />
            Waiting Room Admittance
          </h4>
          {joinRequests.map((req) => (
            <div key={req.socketId} className="flex items-center justify-between gap-4 py-2 border-t border-slate-800">
              <span className="text-xs text-slate-300">{req.user.fullName}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleApproveAdmittance(req.socketId)}
                  className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-[10px] font-semibold rounded"
                >
                  Admit
                </button>
                <button
                  onClick={() => handleRejectAdmittance(req.socketId)}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-[10px] font-semibold rounded"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Center Layout: Main stream feeds + Sidebar Panels */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <div className="flex-1 p-4 bg-slate-950 flex flex-col items-center justify-center min-h-0 relative">
          
          {/* Main Display: Whiteboard overlay or Video grids */}
          {whiteboardActive ? (
            <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-2 overflow-hidden min-h-0">
              {/* Left Side: Whiteboard Canvas */}
              <div className="flex-1 min-w-0 h-full relative">
                <Whiteboard active={whiteboardActive} />
              </div>
              
              {/* Right Side: Participant Videos Sidebar */}
              <div className="w-full lg:w-72 shrink-0 flex flex-row lg:flex-col gap-3 overflow-auto max-h-[22vh] lg:max-h-full pr-1 pb-2 scrollbar-thin">
                {/* Local Video Frame */}
                <div key="sidebar-local-frame" className={`peer-video-container aspect-video rounded-xl bg-slate-900 border overflow-hidden relative shadow-lg shrink-0 ${
                  isHandRaised ? 'active-speaker' : 'border-slate-850'
                }`}>
                  {!cameraOff || screenSharing ? (
                    <video
                      key="sidebar-local-video"
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform scale-x-[-1] transition ${
                        blurBackground ? 'blur-md scale-105' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-2 text-center space-y-1">
                      <img
                        src={user?.profileImage}
                        alt={user?.fullName}
                        className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                      />
                      <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">{user?.fullName}</span>
                    </div>
                  )}
                  
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-850 text-[9px] font-semibold">
                    {user?.fullName} (You)
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {micMuted && <MicOff className="w-3 h-3 text-red-500 p-0.5 bg-slate-950/80 rounded-full" />}
                    {cameraOff && <VideoOff className="w-3 h-3 text-red-500 p-0.5 bg-slate-950/80 rounded-full" />}
                    {isHandRaised && <span className="text-xs p-0.5 bg-slate-950/80 rounded-full">✋</span>}
                  </div>

                  {floatingEmojis.filter(e => e.socketId === 'local').map((e) => (
                    <span key={e.id} className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce-slow">
                      {e.emoji}
                    </span>
                  ))}
                </div>

                {/* Remote Participant Frames */}
                {peers.map((peer) => (
                  <div
                    key={`sidebar-${peer.socketId}`}
                    className={`peer-video-container aspect-video rounded-xl bg-slate-900 border overflow-hidden relative shadow-lg shrink-0 ${
                      peer.isRaised ? 'active-speaker' : 'border-slate-850'
                    }`}
                  >
                    {peer.stream && !peer.videoMuted ? (
                      <video
                        key={`sidebar-video-${peer.socketId}`}
                        ref={(el) => {
                          if (el && el.srcObject !== peer.stream) {
                            el.srcObject = peer.stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-2 text-center space-y-1">
                        <img
                          src={peer.user.profileImage}
                          alt={peer.user.fullName}
                          className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                        />
                        <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">{peer.user.fullName}</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-850 text-[9px] font-semibold">
                      {peer.user.fullName}
                    </div>

                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {peer.isRaised && <span className="text-xs p-0.5 bg-slate-950/80 rounded-full">✋</span>}
                    </div>

                    {floatingEmojis.filter(e => e.socketId === peer.socketId).map((e) => (
                      <div key={e.id} className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                        {e.emoji}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center justify-center overflow-y-auto">
              
              {/* Local Participant Frame */}
              <div key="grid-local-frame" className={`peer-video-container aspect-video rounded-2xl bg-slate-900 border overflow-hidden relative shadow-lg ${
                isHandRaised ? 'active-speaker' : 'border-slate-850'
              }`}>
                {!cameraOff || screenSharing ? (
                  <video
                    key="grid-local-video"
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform scale-x-[-1] transition ${
                      blurBackground ? 'blur-md scale-105' : ''
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 space-y-2 text-center">
                    <img
                      src={user?.profileImage}
                      alt={user?.fullName}
                      className="w-12 h-12 rounded-full border border-slate-800 object-cover"
                    />
                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[80%]">{user?.fullName}</span>
                  </div>
                )}
                
                {/* Visual states details */}
                <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-850 text-[10px] font-semibold">
                  {user?.fullName} (You)
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {micMuted && <MicOff className="w-4 h-4 text-red-500 p-1 bg-slate-950/80 rounded-full" />}
                  {cameraOff && <VideoOff className="w-4 h-4 text-red-500 p-1 bg-slate-950/80 rounded-full" />}
                  {isHandRaised && <span className="text-base p-0.5 bg-slate-950/80 rounded-full">✋</span>}
                </div>

                {/* Local floating reactions */}
                {floatingEmojis.filter(e => e.socketId === 'local').map((e) => (
                  <span key={e.id} className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce-slow">
                    {e.emoji}
                  </span>
                ))}
              </div>

              {/* Remote Participants List */}
              {peers.map((peer) => {
                return (
                  <div
                    key={`grid-${peer.socketId}`}
                    className={`peer-video-container aspect-video rounded-2xl bg-slate-900 border overflow-hidden relative shadow-lg ${
                      peer.isRaised ? 'active-speaker' : 'border-slate-850'
                    }`}
                  >
                    {peer.stream && !peer.videoMuted ? (
                      <video
                        key={`grid-video-${peer.socketId}`}
                        ref={(el) => {
                          if (el && el.srcObject !== peer.stream) {
                            el.srcObject = peer.stream;
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 space-y-2 text-center">
                        <img
                          src={peer.user.profileImage}
                          alt={peer.user.fullName}
                          className="w-12 h-12 rounded-full border border-slate-800 object-cover"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[80%]">{peer.user.fullName}</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-850 text-[10px] font-semibold">
                      {peer.user.fullName}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {peer.isRaised && <span className="text-base p-0.5 bg-slate-950/80 rounded-full">✋</span>}
                    </div>

                    {/* Floating emoji overlay */}
                    {floatingEmojis.filter(e => e.socketId === peer.socketId).map((e) => (
                      <div key={e.id} className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
                        {e.emoji}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Subtitles/Captions Overlay */}
          {captionsActive && liveCaptions.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-full bg-slate-950/90 border border-slate-800 p-3 rounded-2xl flex flex-col gap-1 text-center backdrop-blur-md shadow-2xl">
              {liveCaptions.map((cap, idx) => (
                <p key={idx} className="caption-bubble text-xs text-slate-200 italic leading-relaxed">
                  {cap}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        {activePanel !== 'none' && (
          <div className={`${
            whiteboardActive 
              ? 'absolute right-0 top-0 bottom-0 z-30 shadow-2xl h-full bg-slate-900 border-l border-slate-800 animate-slide-in' 
              : 'relative shrink-0'
          }`}>
            {activePanel === 'chat' && <ChatPanel meetingId={meetingId} active={activePanel === 'chat'} />}
            
            {activePanel === 'participants' && (
              <ParticipantsList
                participants={[{ socketId: 'local', user, isRaised: isHandRaised, audioMuted: micMuted, videoMuted: cameraOff }, ...peers]}
                isHost={isCurrentUserHost}
                hostId={meeting?.host?._id}
                onMuteParticipant={handleHostMute}
                onRemoveParticipant={handleHostKick}
                active={activePanel === 'participants'}
              />
            )}

            {activePanel === 'polls' && <PollSystem active={activePanel === 'polls'} isHost={isCurrentUserHost} />}
            
            {activePanel === 'files' && (
              <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col justify-between text-white transition-all duration-300">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <h3 className="text-sm font-semibold tracking-wider text-slate-200">Shared Files</h3>
                  <p className="text-xs text-slate-500">Upload documents and slides</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {files.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                      <p>No documents uploaded.</p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div key={file._id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition">
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs text-slate-200 truncate font-medium">{file.fileName}</span>
                          <span className="text-[9px] text-slate-500 mt-1 font-mono">
                            By {file.uploadedBy?.fullName || 'Attendee'}
                          </span>
                        </div>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-primary-400 hover:text-white rounded-lg transition"
                          download
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-slate-900 border-t border-slate-800">
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-500 text-xs font-semibold rounded-xl cursor-pointer transition shadow-md shadow-primary-900/10">
                    <Upload className="w-4 h-4" />
                    {uploadingFile ? 'Uploading...' : 'Share File'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Notes Drawer panel overlay */}
      {aiNotes && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative flex flex-col max-h-[80vh] overflow-hidden">
            <button
              onClick={() => setAiNotes('')}
              className="absolute top-4 right-4 p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-sm font-semibold tracking-wider text-slate-200 uppercase mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
              AI Summary Notes
            </h3>
            <pre className="flex-1 overflow-y-auto p-4 bg-slate-950 rounded-2xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap select-text">
              {aiNotes}
            </pre>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <footer className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 z-10 shrink-0 select-none">
        
        {/* Left Side: Layout status */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-850 p-1 rounded-xl">
          <button
            onClick={() => setActivePanel(activePanel === 'chat' ? 'none' : 'chat')}
            className={`p-2 rounded-lg transition ${activePanel === 'chat' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
            title="Chat Panel"
          >
            <MessageSquare className="w-4.5 h-4.5" />
          </button>
          
          <button
            onClick={() => setActivePanel(activePanel === 'participants' ? 'none' : 'participants')}
            className={`p-2 rounded-lg transition ${activePanel === 'participants' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
            title="Participants List"
          >
            <Users className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'polls' ? 'none' : 'polls')}
            className={`p-2 rounded-lg transition ${activePanel === 'polls' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
            title="Polls Panel"
          >
            <BarChart2 className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'files' ? 'none' : 'files')}
            className={`p-2 rounded-lg transition ${activePanel === 'files' ? 'bg-slate-850 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
            title="Shared Files"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Center: Audio/Video/Screen/Board Toggles */}
        <div className="flex items-center gap-3">
          {/* Mute Mic */}
          <button
            onClick={() => toggleMic()}
            className={`p-3.5 rounded-2xl border transition shadow-lg ${
              micMuted 
                ? 'bg-red-650 border-red-500 text-white shadow-red-950/20' 
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200'
            }`}
            title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Turn Camera Off */}
          <button
            onClick={toggleCamera}
            className={`p-3.5 rounded-2xl border transition shadow-lg ${
              cameraOff 
                ? 'bg-red-650 border-red-500 text-white shadow-red-950/20' 
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200'
            }`}
            title={cameraOff ? "Enable Camera" : "Disable Camera"}
          >
            {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Share screen */}
          <button
            onClick={toggleScreenSharing}
            className={`p-3.5 rounded-2xl border transition shadow-lg ${
              screenSharing 
                ? 'bg-primary-600 border-primary-500 text-white shadow-primary-950/20' 
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200'
            }`}
            title="Share Screen"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Shared Whiteboard */}
          <button
            onClick={() => {
              const nextState = !whiteboardActive;
              setWhiteboardActive(nextState);
              if (nextState) {
                setActivePanel('none');
              }
            }}
            className={`p-3.5 rounded-2xl border transition shadow-lg ${
              whiteboardActive 
                ? 'bg-primary-600 border-primary-500 text-white shadow-primary-950/20' 
                : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200'
            }`}
            title="Interactive Whiteboard"
          >
            <Clipboard className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Raise hand, reactions picker & leave */}
        <div className="flex items-center gap-3">
          {/* Advanced: Background Blur */}
          <button
            onClick={() => setBlurBackground(!blurBackground)}
            className={`p-2 px-3 text-xs font-semibold rounded-xl border transition ${
              blurBackground 
                ? 'bg-primary-600/30 text-primary-300 border-primary-800' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Blur BG
          </button>

          {/* Raise hand */}
          <button
            onClick={handleRaiseHandClick}
            className={`p-2.5 rounded-xl border transition ${
              isHandRaised 
                ? 'bg-yellow-600/30 border-yellow-800 text-yellow-500 font-bold' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Raise Hand"
          >
            ✋
          </button>

          {/* Emoji reactions selector */}
          <div className="relative group p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
            <SmilePlus className="w-5 h-5" />
            
            {/* Popover dropdown on hover */}
            <div className="absolute bottom-12 right-0 bg-slate-900 border border-slate-850 p-2 rounded-2xl shadow-2xl gap-1.5 hidden group-hover:flex items-center animate-fade-in z-25">
              {['❤️', '🎉', '👏', '😂', '🔥', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  className="p-1.5 hover:scale-125 transition text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* End Call / Leave room */}
          <button
            onClick={() => {
              closeAllConnections();
              navigate('/dashboard');
            }}
            className="px-4 py-3 bg-red-600 hover:bg-red-500 text-xs font-semibold rounded-2xl transition flex items-center gap-2 shadow-lg shadow-red-950/20"
          >
            <VideoOff className="w-4 h-4" />
            End Call
          </button>
        </div>
      </footer>

      {/* Invite Modal overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in text-slate-800 dark:text-white">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 relative flex flex-col shadow-2xl">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary-500" />
              Invite Participants
            </h3>
            
            <div className="space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">Share the credentials below to invite peers to this LinkMeet conference.</p>
              
              {/* Meeting Code Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meeting ID</span>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100 select-all">{meetingId}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(meetingId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                    title="Copy Meeting ID"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Direct URL Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct Join URL</span>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-mono text-slate-650 dark:text-slate-350 truncate select-all">{window.location.origin + `/meeting/${meetingId}`}</span>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                    title="Copy Join URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-left">Quick Share</span>
                <div className="grid grid-cols-3 gap-2">
                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my LinkMeet video call:\n${window.location.origin}/meeting/${meetingId}\nMeeting ID: ${meetingId}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-center font-semibold text-emerald-600 dark:text-emerald-450 transition flex items-center justify-center gap-1.5"
                  >
                    WhatsApp
                  </a>
                  
                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + `/meeting/${meetingId}`)}&text=${encodeURIComponent(`Join my LinkMeet video call!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-900 rounded-xl text-center font-semibold text-sky-600 dark:text-sky-450 transition flex items-center justify-center gap-1.5"
                  >
                    Telegram
                  </a>

                  {/* System Share */}
                  <button
                    onClick={() => {
                      const inviteUrl = window.location.origin + `/meeting/${meetingId}`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'LinkMeet Conference',
                          text: `Join my LinkMeet video call:\nDirect Link: ${inviteUrl}\nMeeting ID: ${meetingId}`,
                          url: inviteUrl
                        }).catch(err => console.log('Error sharing:', err));
                      } else {
                        const text = `Join my LinkMeet video call:\nDirect Link: ${inviteUrl}\nMeeting ID: ${meetingId}`;
                        navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="py-2.5 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-semibold text-slate-650 dark:text-slate-350 transition flex items-center justify-center gap-1.5"
                  >
                    {navigator.share ? 'System Share' : (copied ? 'Copied' : 'Invite Text')}
                  </button>
                </div>
              </div>

              {/* Copy Invitation Button */}
              <button
                onClick={() => {
                  const text = `Join my LinkMeet video call:\nDirect Link: ${window.location.origin}/meeting/${meetingId}\nMeeting ID: ${meetingId}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-primary-950/20"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Invitation Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Full Invitation Info
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;
