import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Edit2, Eraser, Highlighter, Square, Circle, Minus, Trash2, Download, Undo } from 'lucide-react';

const Whiteboard = ({ active }) => {
  const { id: meetingId } = useParams();
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  const { socket } = useSocket();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8b5cf6'); // Default violet
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState('pencil'); // 'pencil', 'eraser', 'highlighter', 'line', 'rect', 'circle'

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startImageDataRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = containerRef.current;
    canvas.width = container.clientWidth - 64; // account for left sidebar
    canvas.height = container.clientHeight - 64 || 500; // account for top header

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    const handleResize = () => {
      const tempImage = canvas.toDataURL();
      canvas.width = container.clientWidth - 64;
      canvas.height = container.clientHeight - 64 || 500;
      
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = tool === 'eraser' ? '#020617' : color;
      context.lineWidth = brushSize;

      const img = new Image();
      img.src = tempImage;
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#020617' : color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize, tool]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    if (!context) return;

    const maxHistory = 40;
    const currentData = context.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(currentData);
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }
  };

  const drawShape = (context, type, x0, y0, x1, y1, strokeColor, size) => {
    context.beginPath();
    context.strokeStyle = strokeColor;
    context.lineWidth = size;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalAlpha = type === 'highlighter' ? 0.45 : 1.0;

    if (type === 'rect') {
      context.rect(x0, y0, x1 - x0, y1 - y0);
      context.stroke();
    } else if (type === 'circle') {
      const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      context.arc(x0, y0, radius, 0, 2 * Math.PI);
      context.stroke();
    } else if (type === 'line') {
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    } else {
      // pencil, eraser, or highlighter
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    }
    context.closePath();
    context.globalAlpha = 1.0; // restore default
  };

  useEffect(() => {
    if (!socket) return;

    const onDraw = ({ type, x0, y0, x1, y1, strokeColor, size }) => {
      if (type === 'start-draw') {
        saveState();
        return;
      }

      const context = contextRef.current;
      if (!context) return;

      const currentStroke = context.strokeStyle;
      const currentWidth = context.lineWidth;
      const currentAlpha = context.globalAlpha;

      drawShape(context, type || 'pencil', x0, y0, x1, y1, strokeColor, size);

      context.strokeStyle = currentStroke;
      context.lineWidth = currentWidth;
      context.globalAlpha = currentAlpha;
    };

    const onClearBoard = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = contextRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      historyRef.current = [];
    };

    const onUndoBoard = () => {
      if (historyRef.current.length > 0) {
        const previousState = historyRef.current.pop();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = contextRef.current;
        if (!context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.putImageData(previousState, 0, 0);
      } else {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = contextRef.current;
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('draw', onDraw);
    socket.on('clear-board', onClearBoard);
    socket.on('undo-board', onUndoBoard);

    return () => {
      socket.off('draw', onDraw);
      socket.off('clear-board', onClearBoard);
      socket.off('undo-board', onUndoBoard);
    };
  }, [socket]);

  const startDrawing = ({ nativeEvent }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;

    setIsDrawing(true);
    startXRef.current = x;
    startYRef.current = y;
    
    // Save current canvas state to history before drawing
    saveState();

    // Broadcast start drawing so remote clients can save their history state
    if (socket) {
      socket.emit('draw', {
        type: 'start-draw'
      });
    }

    startImageDataRef.current = context.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'pencil' || tool === 'eraser' || tool === 'highlighter') {
      context.beginPath();
      context.moveTo(x, y);
    }
    
    canvas.lastX = x;
    canvas.lastY = y;
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;

    const activeColor = tool === 'eraser' ? '#020617' : color;

    if (tool === 'pencil' || tool === 'eraser' || tool === 'highlighter') {
      context.beginPath();
      context.moveTo(canvas.lastX, canvas.lastY);
      context.lineTo(x, y);
      
      context.strokeStyle = activeColor;
      context.lineWidth = brushSize;
      context.globalAlpha = tool === 'highlighter' ? 0.45 : 1.0;
      context.stroke();
      context.closePath();

      if (socket) {
        socket.emit('draw', {
          type: tool,
          x0: canvas.lastX,
          y0: canvas.lastY,
          x1: x,
          y1: y,
          strokeColor: activeColor,
          size: brushSize,
        });
      }
      
      canvas.lastX = x;
      canvas.lastY = y;
    } else {
      if (startImageDataRef.current) {
        context.putImageData(startImageDataRef.current, 0, 0);
      }
      drawShape(context, tool, startXRef.current, startYRef.current, x, y, activeColor, brushSize);
    }
  };

  const stopDrawing = ({ nativeEvent }) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    if (!context) return;

    if (tool !== 'pencil' && tool !== 'eraser' && tool !== 'highlighter') {
      const rect = canvas.getBoundingClientRect();
      const x = nativeEvent.clientX - rect.left;
      const y = nativeEvent.clientY - rect.top;

      const activeColor = color;
      
      if (startImageDataRef.current) {
        context.putImageData(startImageDataRef.current, 0, 0);
      }
      drawShape(context, tool, startXRef.current, startYRef.current, x, y, activeColor, brushSize);

      if (socket) {
        socket.emit('draw', {
          type: tool,
          x0: startXRef.current,
          y0: startYRef.current,
          x1: x,
          y1: y,
          strokeColor: activeColor,
          size: brushSize,
        });
      }
    }
    
    startImageDataRef.current = null;
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to clear the entire whiteboard?')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];

    if (socket) {
      socket.emit('clear-board');
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    
    const previousState = historyRef.current.pop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = contextRef.current;
    if (!context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.putImageData(previousState, 0, 0);

    if (socket) {
      socket.emit('undo-board');
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `whiteboard-${meetingId || 'canvas'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!active) return null;

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
      {/* Top Header Bar */}
      <div className="h-16 flex items-center justify-between px-4 bg-slate-950/80 backdrop-blur border-b border-slate-800 select-none z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">LinkMeet Interactive Canvas</span>
        </div>

        {/* Colors & Brush controls */}
        <div className="flex items-center gap-6">
          {tool !== 'eraser' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Colors</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                {['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      color === c 
                        ? 'scale-125 border-white ring-2 ring-primary-500 shadow-lg' 
                        : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stroke Slider */}
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Size</span>
            <input
              type="range"
              min="2"
              max="24"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-primary-500 bg-slate-700 rounded-lg cursor-pointer h-1.5"
            />
            <span className="text-xs text-slate-300 font-mono w-6 text-right font-bold">{brushSize}px</span>
          </div>
        </div>

        {/* Actions buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition text-xs font-semibold"
            title="Undo Last Action"
          >
            <Undo className="w-3.5 h-3.5" />
            Undo
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition text-xs font-semibold"
            title="Download Whiteboard as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900 hover:text-white rounded-xl transition text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Main Board Workarea */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Vertical Tools Bar */}
        <div className="w-16 bg-slate-950/40 border-r border-slate-800 flex flex-col items-center py-4 gap-3 select-none z-10 shrink-0">
          <button
            onClick={() => setTool('pencil')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              tool === 'pencil' 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Pencil / Draw"
          >
            <Edit2 className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setTool('highlighter')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              tool === 'highlighter' 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              tool === 'eraser' 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4.5 h-4.5" />
          </button>

          <div className="w-8 h-[1px] bg-slate-800 my-1"></div>

          {/* Shape Tools */}
          <button
            onClick={() => setTool('line')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              tool === 'line' 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Straight Line"
          >
            <Minus className="w-4.5 h-4.5 rotate-45" />
          </button>

          <button
            onClick={() => setTool('rect')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              tool === 'rect' 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Rectangle"
          >
            <Square className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setTool('circle')}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              tool === 'circle' 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' 
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Circle"
          >
            <Circle className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Drawing Workspace */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden cursor-crosshair">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
          
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="absolute inset-0 w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
