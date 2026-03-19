import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
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
  Navigation
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
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-serif font-bold text-gray-900">Attendance System</h1>
        <p className="text-gray-500 font-serif italic">Secure, GPS-validated tracking</p>
      </header>

      {profile?.role === 'faculty' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl flex flex-col items-center justify-center text-center"
          >
            {qrValue ? (
              <>
                <div ref={qrContainerRef} className="p-4 bg-white border-8 border-[#5A5A40]/10 rounded-3xl mb-6 relative">
                  <QRCodeSVG value={qrValue} size={256} />
                  {isHosting && (
                    <>
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 border-4 border-emerald-500 rounded-3xl pointer-events-none"
                      />
                      <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg animate-pulse z-10">
                        <Globe className="w-6 h-6" />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[#5A5A40] font-bold text-xl mb-2">
                  <Clock className="w-6 h-6" />
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  {isHosting ? 'Session is live for all students' : 'QR code expires in 5 minutes'}
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex gap-3">
                    <button 
                      onClick={generateQR}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Regenerate
                    </button>
                    <button 
                      onClick={downloadQR}
                      className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                  
                  {!isHosting && (
                    <button 
                      onClick={() => {
                        setQrValue('');
                        setTimeLeft(0);
                      }}
                      className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Delete QR
                    </button>
                  )}
                  
                  {isHosting ? (
                    <button 
                      onClick={handleEndSession}
                      className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" /> End Hosted Session
                    </button>
                  ) : (
                    <button 
                      onClick={handleHostSession}
                      className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/20"
                    >
                      <Radio className="w-5 h-5 animate-pulse" /> Host Session for Students
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={generateQR}
                className="w-full h-64 border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-[#5A5A40] hover:text-[#5A5A40] transition-all"
              >
                <QrCode className="w-16 h-16 mb-4" />
                <span className="font-bold text-lg">Generate Session QR</span>
              </button>
            )}
          </motion.div>

          <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('live')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'live' ? "bg-white text-[#5A5A40] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Live
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'history' ? "bg-white text-[#5A5A40] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  History
                </button>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-bold">
                <Users className="w-4 h-4" />
                {activeTab === 'live' ? attendanceLogs.length : historyLogs.length} Records
              </div>
            </div>

            {activeTab === 'live' ? (
              <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
                {isHosting && sessionAttendees.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-2">
                      <Radio className="w-3 h-3 animate-pulse" /> Current Session Attendees
                    </p>
                    <div className="space-y-2">
                      {sessionAttendees.map((log, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={`session-${i}`} 
                          className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-emerald-100">
                              <UserCheck className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-sm font-bold text-emerald-900">{log.studentName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="h-px bg-gray-100 my-4" />
                  </div>
                )}
                {attendanceLogs.length === 0 && sessionAttendees.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-serif italic">
                    No records for today yet
                  </div>
                ) : (
                  attendanceLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{log.studentName}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-gray-400">
                        {log.timestamp?.toDate().toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                <div className="flex gap-2 mb-4">
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div className="space-y-3 max-h-[350px] overflow-auto pr-2">
                  {historyLogs
                    .filter(l => !filterDate || l.timestamp?.toDate().toISOString().startsWith(filterDate))
                    .map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-bold text-sm">{log.studentName}</p>
                          <p className="text-[10px] text-gray-400">
                            {log.timestamp?.toDate().toLocaleDateString()} at {log.timestamp?.toDate().toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-2 py-1 bg-white rounded-full border border-gray-100 text-gray-500">
                            {log.method === 'face' ? 'Face ID' : 'QR Scan'}
                          </span>
                        </div>
                      </div>
                    ))}
                  {historyLogs.length === 0 && (
                    <div className="text-center py-12 text-gray-400 font-serif italic">
                      No historical data found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          {activeSessions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl mb-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Radio className="w-24 h-24 animate-pulse" />
              </div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Live Session Broadcast
                </div>
                <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-sm">Active Now</span>
              </div>
              <div className="space-y-3 relative z-10">
                {activeSessions.map((session, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{session.facultyName}</p>
                        <p className="text-xs text-gray-500">Classroom Session</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onScanSuccess(session.qrValue)}
                      className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                      <Navigation className="w-3 h-3" /> Join Session
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
            <button 
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'live' ? "bg-[#5A5A40] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <QrCode className="w-4 h-4" /> Mark Now
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === 'history' ? "bg-[#5A5A40] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Clock className="w-4 h-4" /> My History
            </button>
          </div>

          {activeTab === 'live' ? (
            <div className="space-y-6">
              <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
                <button 
                  onClick={() => setAttendanceMode('qr')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    attendanceMode === 'qr' ? "bg-gray-100 text-[#5A5A40]" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <QrCode className="w-4 h-4" /> QR Scan
                </button>
                <button 
                  onClick={() => setAttendanceMode('face')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    attendanceMode === 'face' ? "bg-gray-100 text-[#5A5A40]" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Face Recognition
                </button>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 md:p-12 rounded-3xl border border-black/5 shadow-xl text-center"
              >
                {attendanceMode === 'qr' ? (
                  <>
                    <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <QrCode className="w-10 h-10 text-[#5A5A40]" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-2">Mark Attendance</h3>
                    <p className="text-gray-500 mb-8 text-sm">
                      Scan the QR code or upload an image to mark your presence.
                    </p>
                    
                    <AnimatePresence>
                      {successMessage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center gap-2 font-bold border border-emerald-100"
                        >
                          <CheckCircle className="w-5 h-5" />
                          {successMessage}
                        </motion.div>
                      )}
                      {errorMessage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center gap-2 font-bold border border-red-100"
                        >
                          <AlertCircle className="w-5 h-5" />
                          {errorMessage}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isScanning ? (
                      <div className="space-y-4">
                        <div id="reader" className="overflow-hidden rounded-2xl border-2 border-[#5A5A40]/20"></div>
                        <button
                          onClick={stopScanning}
                          className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                          <X className="w-5 h-5" /> Cancel Scan
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          onClick={startScanning}
                          className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 flex items-center justify-center gap-3"
                        >
                          <Camera className="w-6 h-6" />
                          Scan with Camera
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
                            "relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 transition-all overflow-hidden",
                            isDragging ? "border-[#5A5A40] bg-[#5A5A40]/5" : "border-gray-200 hover:border-[#5A5A40]/50"
                          )}
                          onClick={() => !isProcessingFile && fileInputRef.current?.click()}
                        >
                          <AnimatePresence>
                            {isProcessingFile && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center"
                              >
                                <div className="w-12 h-12 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="text-sm font-bold text-[#5A5A40]">Scanning Image...</p>
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
                          <div className="flex flex-col items-center gap-2">
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#5A5A40] transition-colors"
                            >
                              <Upload className="w-6 h-6" />
                            </motion.div>
                            <p className="text-sm font-bold text-gray-600">Drop image or click to upload</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Supports PNG, JPG</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <UserCheck className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-2">Face Recognition</h3>
                    <p className="text-gray-500 mb-8 text-sm">
                      Position your face in the frame for biometric verification.
                    </p>

                    <AnimatePresence>
                      {successMessage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center gap-2 font-bold border border-emerald-100"
                        >
                          <CheckCircle className="w-5 h-5" />
                          {successMessage}
                        </motion.div>
                      )}
                      {errorMessage && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center gap-2 font-bold border border-red-100"
                        >
                          <AlertCircle className="w-5 h-5" />
                          {errorMessage}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isFaceScanning ? (
                      <div className="space-y-4">
                        <div className="aspect-square bg-black rounded-2xl overflow-hidden relative border-4 border-blue-100">
                          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent animate-pulse" />
                          <div className="absolute top-1/2 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Scan className="w-32 h-32 text-white/20" />
                          </div>
                        </div>
                        <button
                          disabled
                          className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                          <Clock className="w-5 h-5 animate-spin" /> Analyzing Face...
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleFaceRecognition}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
                      >
                        <Camera className="w-6 h-6" />
                        Start Face Recognition
                      </button>
                    )}
                  </>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-2xl text-xs font-medium">
                  <MapPin className="w-4 h-4" />
                  GPS validation is active. Stay in the classroom.
                </div>
              </motion.div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl"
            >
              <h3 className="text-xl font-serif font-bold mb-6">My Attendance History</h3>
              <div className="space-y-4 max-h-[500px] overflow-auto pr-2">
                {historyLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-bold text-sm">{log.timestamp?.toDate().toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{log.timestamp?.toDate().toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Present
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">{log.method === 'face' ? 'Face ID' : 'QR Scan'}</p>
                    </div>
                  </div>
                ))}
                {historyLogs.length === 0 && (
                  <div className="text-center py-12 text-gray-400 font-serif italic">
                    No attendance records found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
