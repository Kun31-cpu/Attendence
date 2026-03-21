import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Users,
  Camera,
  X,
  Download,
  Scan,
  UserCheck,
  Upload,
  Radio,
  Globe,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, updateDoc, doc, getDocs, limit, deleteDoc } from 'firebase/firestore';

// Helper to calculate distance between two points in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function AttendancePage() {
  const { profile, user } = useAuth();
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attendanceMode, setAttendanceMode] = useState<'qr' | 'face'>('qr');
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [sessionAttendees, setSessionAttendees] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Faculty: Generate QR
  const generateQR = () => {
    const val = `ATT-${Date.now()}-${profile?.uid}`;
    setQrValue(val);
    setTimeLeft(300);
  };

  // Faculty: Host Session
  const handleHostSession = async () => {
    if (!qrValue) return;
    
    setIsHosting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await addDoc(collection(db, 'attendance_sessions'), {
          facultyId: profile?.uid,
          facultyName: profile?.displayName,
          qrValue: qrValue,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          active: true,
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 300000).toISOString() // 5 mins
        });
      } catch (err) {
        console.error(err);
        setIsHosting(false);
      }
    }, (err) => {
      setErrorMessage('GPS required to host session');
      setIsHosting(false);
    });
  };

  const handleEndSession = async () => {
    setIsHosting(false);
    setQrValue('');
    setSessionAttendees([]);
    // Deactivate session in DB
    const q = query(collection(db, 'attendance_sessions'), where('facultyId', '==', profile?.uid), where('active', '==', true));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
      await updateDoc(doc(db, 'attendance_sessions', d.id), { active: false });
    });
  };

  // Faculty: Listen for attendees of current session
  useEffect(() => {
    if (profile?.role === 'faculty' && isHosting && qrValue) {
      const q = query(
        collection(db, 'attendance'),
        where('qrData', '==', qrValue),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const attendees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessionAttendees(attendees);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      });
      return () => unsubscribe();
    }
  }, [profile, isHosting, qrValue]);

  useEffect(() => {
    if (qrValue && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isHosting) {
      handleEndSession();
    }
  }, [qrValue, timeLeft, isHosting]);

  // Listen for active sessions (Students)
  useEffect(() => {
    if (profile?.role === 'student') {
      const q = query(collection(db, 'attendance_sessions'), where('active', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveSessions(sessions);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance_sessions');
      });
      return () => unsubscribe();
    }
  }, [profile]);

  // Faculty: Listen for attendance
  useEffect(() => {
    if (profile?.role === 'faculty') {
      const q = query(
        collection(db, 'attendance'), 
        where('facultyId', '==', profile.uid),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setAttendanceLogs(logs.filter(l => {
          const today = new Date().toDateString();
          return l.timestamp?.toDate().toDateString() === today;
        }));
        setHistoryLogs(logs);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      });
      return () => unsubscribe();
    } else if (profile?.role === 'student') {
      const q = query(
        collection(db, 'attendance'), 
        where('studentId', '==', profile.uid),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setHistoryLogs(logs);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const startScanning = () => {
    setIsScanning(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleFileScan = async (file: File) => {
    setIsProcessingFile(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    const html5QrCode = new Html5Qrcode("reader-hidden");
    try {
      // Small delay for "cool" effect
      await new Promise(resolve => setTimeout(resolve, 800));
      const decodedText = await html5QrCode.scanFile(file, true);
      onScanSuccess(decodedText);
    } catch (err) {
      setErrorMessage('Could not find QR code in image');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (!decodedText.startsWith('ATT-')) {
      setErrorMessage('Invalid QR Code');
      return;
    }

    const parts = decodedText.split('-');
    const facultyId = parts[2];

    stopScanning();
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        // Validate distance if it's a hosted session
        const sessionQuery = query(
          collection(db, 'attendance_sessions'), 
          where('qrValue', '==', decodedText),
          where('active', '==', true),
          limit(1)
        );
        const sessionSnap = await getDocs(sessionQuery);
        
        if (!sessionSnap.empty) {
          const sessionData = sessionSnap.docs[0].data();
          const dist = getDistance(
            pos.coords.latitude, 
            pos.coords.longitude, 
            sessionData.latitude, 
            sessionData.longitude
          );
          
          if (dist > 100) { // 100 meters limit
            setErrorMessage(`Too far from classroom (${Math.round(dist)}m away)`);
            return;
          }
        }

        await addDoc(collection(db, 'attendance'), {
          studentId: profile?.uid,
          studentName: profile?.displayName,
          facultyId: facultyId,
          timestamp: serverTimestamp(),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          status: 'present',
          subjectId: 'CS101',
          qrData: decodedText,
          method: 'qr'
        });
        setSuccessMessage('Attendance marked successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } catch (err) {
        console.error(err);
        setErrorMessage('Failed to save attendance');
      }
    }, (err) => {
      setErrorMessage('GPS access denied. Please enable location.');
    });
  };

  const handleFaceRecognition = async () => {
    setIsFaceScanning(true);
    setErrorMessage('');
    
    setTimeout(async () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await addDoc(collection(db, 'attendance'), {
            studentId: profile?.uid,
            studentName: profile?.displayName,
            facultyId: 'SYSTEM',
            timestamp: serverTimestamp(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            status: 'present',
            subjectId: 'CS101',
            method: 'face'
          });
          setSuccessMessage('Face recognized! Attendance marked.');
          setTimeout(() => setSuccessMessage(''), 5000);
        } catch (err) {
          console.error(err);
          setErrorMessage('Face recognition failed');
        } finally {
          setIsFaceScanning(false);
        }
      }, (err) => {
        setErrorMessage('GPS access denied');
        setIsFaceScanning(false);
      });
    }, 3000);
  };

  const downloadQR = () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `EduTrack-QR-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const onScanFailure = (error: any) => {};

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err));
      }
    };
  }, []);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-12"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-[#5A5A40]/30" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-montserrat font-black text-[#5A5A40]/60">Presence Tracking</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-playfair font-black tracking-tighter leading-[0.9] text-stone-900">
            Attendance<span className="text-[#5A5A40]">.</span>
          </h1>
          <p className="text-lg text-stone-500 font-montserrat font-medium italic max-w-md leading-relaxed">
            {profile?.role === 'faculty' 
              ? 'Orchestrate classroom presence with precision and real-time insights.' 
              : 'Maintain your academic consistency and track your journey through knowledge.'}
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex bg-white/40 backdrop-blur-xl p-2 rounded-full border border-white/60 shadow-2xl">
          <button 
            onClick={() => setActiveTab('live')}
            className={cn(
              "px-10 py-4 rounded-full text-[10px] font-montserrat font-black uppercase tracking-[0.2em] transition-all duration-500 relative z-10",
              activeTab === 'live' ? "text-white" : "text-[#5A5A40]/60 hover:text-[#5A5A40]"
            )}
          >
            {activeTab === 'live' && (
              <motion.div 
                layoutId="active-tab-pill"
                className="absolute inset-0 bg-[#5A5A40] rounded-full -z-10 shadow-lg shadow-[#5A5A40]/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            Live Session
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-10 py-4 rounded-full text-[10px] font-montserrat font-black uppercase tracking-[0.2em] transition-all duration-500 relative z-10",
              activeTab === 'history' ? "text-white" : "text-[#5A5A40]/60 hover:text-[#5A5A40]"
            )}
          >
            {activeTab === 'history' && (
              <motion.div 
                layoutId="active-tab-pill"
                className="absolute inset-0 bg-[#5A5A40] rounded-full -z-10 shadow-lg shadow-[#5A5A40]/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            History
          </button>
        </motion.div>
      </header>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {profile?.role === 'faculty' ? (
            <motion.div 
              key="faculty-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              {/* Faculty Controls */}
              <div className="lg:col-span-7 space-y-8">
                <motion.div 
                  variants={itemVariants}
                  className="bg-white/40 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/50 shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#5A5A40]/5 rounded-full -mr-40 -mt-40 blur-[100px] transition-all group-hover:bg-[#5A5A40]/10" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    {qrValue ? (
                      <div className="w-full space-y-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-[#5A5A40] rounded-3xl flex items-center justify-center shadow-xl shadow-[#5A5A40]/20">
                              <QrCode className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="font-playfair font-black text-2xl text-stone-900">Session QR</h3>
                              <p className="text-[10px] text-[#5A5A40] uppercase tracking-[0.2em] font-montserrat font-black">Active Broadcast</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-[#5A5A40]/5 px-6 py-3 rounded-2xl border border-[#5A5A40]/10">
                            <Clock className="w-5 h-5 text-[#5A5A40]" />
                            <span className="font-montserrat font-black text-xl text-[#5A5A40]">
                              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>

                        <div ref={qrContainerRef} className="mx-auto p-12 bg-white rounded-[3rem] shadow-inner border border-stone-100 relative group/qr max-w-sm">
                          <QRCodeSVG value={qrValue} size={256} className="w-full h-auto" />
                          {isHosting && (
                            <motion.div 
                              animate={{ scale: [1, 1.02, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="absolute inset-0 border-[12px] border-[#5A5A40]/10 rounded-[3rem] pointer-events-none"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <button 
                            onClick={generateQR}
                            className="py-5 bg-white/50 border border-stone-200 text-stone-800 rounded-2xl font-montserrat font-bold text-sm hover:bg-white transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            Regenerate
                          </button>
                          <button 
                            onClick={downloadQR}
                            className="py-5 bg-white/50 border border-stone-200 text-stone-800 rounded-2xl font-montserrat font-bold text-sm hover:bg-white transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <Download className="w-5 h-5" /> Export PNG
                          </button>
                        </div>

                        {isHosting ? (
                          <button 
                            onClick={handleEndSession}
                            className="w-full py-6 bg-red-500 text-white rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-xs hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 active:scale-95"
                          >
                            <X className="w-6 h-6" /> Terminate Session
                          </button>
                        ) : (
                          <button 
                            onClick={handleHostSession}
                            className="w-full py-6 bg-[#5A5A40] text-white rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-xs hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20 flex items-center justify-center gap-3 active:scale-95"
                          >
                            <Radio className="w-6 h-6 animate-pulse" /> Initialize Broadcast
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={generateQR}
                        className="w-full aspect-square max-w-sm border-2 border-dashed border-[#5A5A40]/20 rounded-[3.5rem] flex flex-col items-center justify-center text-[#5A5A40]/40 hover:border-[#5A5A40] hover:text-[#5A5A40] transition-all group/init bg-white/20"
                      >
                        <div className="w-24 h-24 bg-[#5A5A40]/5 rounded-[2rem] flex items-center justify-center mb-8 group-hover/init:scale-110 transition-transform duration-500">
                          <QrCode className="w-12 h-12" />
                        </div>
                        <span className="font-playfair font-black text-2xl">Generate Session QR</span>
                        <p className="text-xs mt-3 font-montserrat font-black uppercase tracking-[0.2em] opacity-60">Click to start attendance</p>
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Activity Sidebar */}
              <div className="lg:col-span-5 space-y-8">
                <motion.div 
                  variants={itemVariants}
                  className="bg-white/40 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white/50 shadow-2xl flex flex-col h-full min-h-[600px]"
                >
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-playfair font-black text-3xl text-stone-900">Activity Log</h3>
                    <div className="flex items-center gap-3 text-[#5A5A40] bg-[#5A5A40]/5 px-5 py-2 rounded-full text-[10px] font-montserrat font-black uppercase tracking-widest border border-[#5A5A40]/10">
                      <Activity className="w-4 h-4" />
                      {activeTab === 'live' ? attendanceLogs.length : historyLogs.length} Records
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {activeTab === 'live' ? (
                        <motion.div 
                          key="live-tab"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-5"
                        >
                          {isHosting && sessionAttendees.map((log, i) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              key={`session-${log.id || i}`} 
                              className="flex items-center justify-between p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 group hover:bg-emerald-500/10 transition-all"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-500">
                                  <UserCheck className="w-7 h-7 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="font-montserrat font-black text-stone-900">{log.studentName}</p>
                                  <p className="text-[10px] text-emerald-600 font-montserrat font-black uppercase tracking-widest">Verified Presence</p>
                                </div>
                              </div>
                              <span className="font-montserrat text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </motion.div>
                          ))}
                          {attendanceLogs.length === 0 && sessionAttendees.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30 py-24">
                              <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center">
                                <Radio className="w-12 h-12 text-stone-400" />
                              </div>
                              <p className="font-playfair italic text-2xl text-stone-600">Waiting for participants...</p>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="history-tab"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-5"
                        >
                          <div className="flex gap-4 mb-8">
                            <input 
                              type="date" 
                              value={filterDate}
                              onChange={(e) => setFilterDate(e.target.value)}
                              className="flex-1 bg-white/50 px-8 py-4 rounded-2xl border border-stone-100 text-sm outline-none focus:ring-4 focus:ring-[#5A5A40]/10 font-montserrat font-bold text-stone-800 transition-all"
                            />
                          </div>
                          {historyLogs
                            .filter(l => !filterDate || l.timestamp?.toDate().toISOString().startsWith(filterDate))
                            .map((log, i) => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={`history-${log.id || i}`} 
                                className="flex items-center justify-between p-6 bg-white/20 rounded-[2rem] border border-white/50 hover:bg-white/40 transition-all group"
                              >
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-[#5A5A40] group-hover:text-white transition-all duration-500">
                                    <CheckCircle className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <p className="font-montserrat font-black text-stone-900">{log.studentName}</p>
                                    <p className="text-[10px] text-stone-400 font-montserrat font-bold uppercase tracking-widest">
                                      {log.timestamp?.toDate().toLocaleDateString()} • {log.timestamp?.toDate().toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[9px] px-4 py-1.5 bg-[#5A5A40]/5 rounded-full border border-[#5A5A40]/10 text-[#5A5A40] font-montserrat font-black uppercase tracking-widest">
                                  {log.method === 'face' ? 'Biometric' : 'QR Scan'}
                                </span>
                              </motion.div>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="student-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-5xl mx-auto space-y-12"
            >
              {/* Active Sessions Banner */}
              {activeSessions.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase tracking-[0.3em] font-montserrat font-black text-emerald-600">Live Broadcasts</span>
                    <div className="h-px flex-1 bg-emerald-600/20" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {activeSessions.map((session, i) => (
                      <motion.div 
                        key={session.id || i}
                        whileHover={{ y: -8 }}
                        className="bg-emerald-500/5 backdrop-blur-xl p-8 rounded-[3rem] border border-emerald-500/20 flex items-center justify-between group relative overflow-hidden shadow-xl"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform duration-700">
                          <Radio className="w-24 h-24 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                          <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 group-hover:rotate-6 transition-transform duration-500">
                            <Users className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="font-playfair font-black text-2xl text-emerald-900">{session.facultyName}</p>
                            <p className="text-[10px] text-emerald-600 font-montserrat font-black uppercase tracking-widest">Classroom Session</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onScanSuccess(session.qrValue)}
                          className="px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-montserrat font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 relative z-10 active:scale-95"
                        >
                          Join Now
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Attendance Controls */}
                <div className="space-y-8">
                  <motion.div 
                    variants={itemVariants}
                    className="bg-white/40 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/50 shadow-2xl space-y-10"
                  >
                    <div className="flex bg-stone-100/50 p-2 rounded-[2rem] border border-stone-200/50">
                      <button 
                        onClick={() => setAttendanceMode('qr')}
                        className={cn(
                          "flex-1 py-4 rounded-[1.5rem] text-[10px] font-montserrat font-black uppercase tracking-widest transition-all duration-500 flex items-center justify-center gap-3",
                          attendanceMode === 'qr' ? "bg-white text-[#5A5A40] shadow-xl" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
                        )}
                      >
                        <QrCode className="w-5 h-5" /> QR Scan
                      </button>
                      <button 
                        onClick={() => setAttendanceMode('face')}
                        className={cn(
                          "flex-1 py-4 rounded-[1.5rem] text-[10px] font-montserrat font-black uppercase tracking-widest transition-all duration-500 flex items-center justify-center gap-3",
                          attendanceMode === 'face' ? "bg-white text-[#5A5A40] shadow-xl" : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
                        )}
                      >
                        <UserCheck className="w-5 h-5" /> Biometric
                      </button>
                    </div>

                    <div className="text-center space-y-8">
                      <AnimatePresence mode="wait">
                        {attendanceMode === 'qr' ? (
                          <motion.div 
                            key="qr-mode"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-10"
                          >
                            <div className="space-y-3">
                              <h3 className="text-2xl md:text-3xl font-playfair font-black text-stone-900">Mark Presence</h3>
                              <p className="text-sm text-stone-500 font-montserrat font-medium italic">Scan the classroom QR to verify your attendance.</p>
                            </div>

                            {isScanning ? (
                              <div className="space-y-6">
                                <div id="reader" className="overflow-hidden rounded-[3rem] border-8 border-white shadow-2xl aspect-square bg-stone-100"></div>
                                <button
                                  onClick={stopScanning}
                                  className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-montserrat font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                  <X className="w-5 h-5" /> Abort Scanning
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <button
                                  onClick={startScanning}
                                  className="w-full py-6 bg-[#5A5A40] text-white rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-xs hover:bg-[#4A4A30] transition-all shadow-2xl shadow-[#5A5A40]/20 flex items-center justify-center gap-4 active:scale-95"
                                >
                                  <Camera className="w-7 h-7" />
                                  Launch Scanner
                                </button>

                                <div 
                                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                  onDragLeave={() => setIsDragging(false)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFileScan(file);
                                  }}
                                  className={cn(
                                    "relative group cursor-pointer border-2 border-dashed rounded-[3rem] p-12 transition-all overflow-hidden",
                                    isDragging ? "border-[#5A5A40] bg-[#5A5A40]/5" : "border-stone-200 hover:border-[#5A5A40]/30 hover:bg-stone-50/50"
                                  )}
                                  onClick={() => !isProcessingFile && fileInputRef.current?.click()}
                                >
                                  <AnimatePresence>
                                    {isProcessingFile && (
                                      <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-white/90 backdrop-blur-md z-20 flex flex-col items-center justify-center"
                                      >
                                        <div className="w-16 h-16 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin mb-6" />
                                        <p className="text-[10px] font-montserrat font-black uppercase tracking-widest text-[#5A5A40]">Analyzing Image...</p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileScan(file);
                                    }}
                                  />
                                  <div id="reader-hidden" className="hidden"></div>
                                  <div className="flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 bg-[#5A5A40]/5 rounded-[2rem] flex items-center justify-center text-[#5A5A40]/40 group-hover:text-[#5A5A40] transition-all duration-500">
                                      <Upload className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-lg font-montserrat font-bold text-stone-800">Upload QR Image</p>
                                      <p className="text-[10px] text-stone-400 uppercase font-montserrat font-black tracking-widest">Drag & Drop supported</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="face-mode"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-10"
                          >
                            <div className="space-y-3">
                              <h3 className="text-4xl font-playfair font-black text-stone-900">Biometric ID</h3>
                              <p className="text-sm text-stone-500 font-montserrat font-medium italic">Position your face within the frame for verification.</p>
                            </div>

                            {isFaceScanning ? (
                              <div className="space-y-8">
                                <div className="aspect-square bg-stone-900 rounded-[3.5rem] overflow-hidden relative border-[12px] border-white shadow-2xl">
                                  <div className="absolute inset-0 bg-gradient-to-b from-[#5A5A40]/20 to-transparent animate-pulse" />
                                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#5A5A40] shadow-[0_0_30px_rgba(90,90,64,1)] animate-[scan_2s_ease-in-out_infinite]" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Scan className="w-40 h-40 text-white/5" />
                                  </div>
                                </div>
                                <div className="flex items-center justify-center gap-4 text-[#5A5A40]">
                                  <div className="w-3 h-3 bg-[#5A5A40] rounded-full animate-ping" />
                                  <span className="text-[10px] font-montserrat font-black uppercase tracking-[0.2em]">Processing Biometrics...</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={handleFaceRecognition}
                                className="w-full py-6 bg-[#5A5A40] text-white rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-xs hover:bg-[#4A4A30] transition-all shadow-2xl shadow-[#5A5A40]/20 flex items-center justify-center gap-4 active:scale-95"
                              >
                                <Camera className="w-7 h-7" />
                                Initialize Face ID
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center justify-center gap-4 text-amber-600 bg-amber-500/5 p-6 rounded-[2rem] border border-amber-500/10">
                        <ShieldCheck className="w-6 h-6" />
                        <p className="text-[10px] font-montserrat font-black uppercase tracking-widest text-left leading-tight">
                          Geofencing active.<br />Stay within classroom bounds.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Student History */}
                <div className="space-y-8">
                  <motion.div 
                    variants={itemVariants}
                    className="bg-white/40 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/50 shadow-2xl min-h-[500px] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-12">
                      <h3 className="font-playfair font-black text-3xl text-stone-900">Consistency</h3>
                      <div className="w-16 h-16 bg-[#5A5A40]/5 rounded-[1.5rem] flex items-center justify-center text-[#5A5A40] shadow-inner">
                        <Clock className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                      {historyLogs.map((log, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={`student-history-${log.id || i}`} 
                          className="flex items-center justify-between p-6 bg-white/30 rounded-[2rem] border border-white/60 group hover:bg-white transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-300 group-hover:bg-[#5A5A40] group-hover:text-white transition-all duration-500">
                              <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-montserrat font-black text-stone-900">{log.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-[10px] text-stone-400 font-montserrat font-bold uppercase tracking-widest">{log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-montserrat font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/10">
                              Present
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      {historyLogs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30 py-24">
                          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center">
                            <Clock className="w-10 h-10 text-stone-400" />
                          </div>
                          <p className="font-playfair italic text-2xl text-stone-600">No records found yet.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {(successMessage || errorMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-6"
          >
            <div className={cn(
              "p-6 rounded-[2rem] shadow-2xl backdrop-blur-3xl border flex items-center gap-5",
              successMessage ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"
            )}>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                {successMessage ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              </div>
              <div className="flex-1">
                <p className="font-montserrat font-black text-sm uppercase tracking-widest mb-1">{successMessage ? 'Success' : 'Attention'}</p>
                <p className="font-montserrat font-medium text-xs leading-relaxed opacity-90">{successMessage || errorMessage}</p>
              </div>
              <button 
                onClick={() => { setSuccessMessage(''); setErrorMessage(''); }}
                className="w-10 h-10 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 20%; }
          50% { top: 80%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(90, 90, 64, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(90, 90, 64, 0.2);
        }
      `}} />
    </motion.div>
  );
}
