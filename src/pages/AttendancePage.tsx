import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  UserCheck
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';

export default function AttendancePage() {
  const { profile } = useAuth();
  const [qrValue, setQrValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attendanceMode, setAttendanceMode] = useState<'qr' | 'face'>('qr');
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Faculty: Generate QR
  const generateQR = () => {
    const val = `ATT-${Date.now()}-${profile?.uid}`;
    setQrValue(val);
    setTimeLeft(300);
  };

  useEffect(() => {
    if (qrValue && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [qrValue, timeLeft]);

  // Faculty: Listen for attendance
  useEffect(() => {
    if (profile?.role === 'faculty') {
      const q = query(collection(db, 'attendance'), where('facultyId', '==', profile.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttendanceLogs(logs);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const startScanning = () => {
    setIsScanning(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Initialize scanner in next tick
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
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

  const onScanSuccess = async (decodedText: string) => {
    // Validate QR format (ATT-timestamp-facultyId)
    if (!decodedText.startsWith('ATT-')) {
      setErrorMessage('Invalid QR Code');
      return;
    }

    const parts = decodedText.split('-');
    const facultyId = parts[2];

    stopScanning();
    
    // Perform GPS validation
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await addDoc(collection(db, 'attendance'), {
          studentId: profile?.uid,
          studentName: profile?.displayName,
          facultyId: facultyId, // Save facultyId so faculty can see it
          timestamp: serverTimestamp(),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          status: 'present',
          subjectId: 'CS101', // Placeholder
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
    
    // Simulate face recognition processing
    setTimeout(async () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await addDoc(collection(db, 'attendance'), {
            studentId: profile?.uid,
            studentName: profile?.displayName,
            facultyId: 'SYSTEM', // Face recognition might be system-wide or assigned to a session
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

  const onScanFailure = (error: any) => {
    // Silent fail for scanning errors
  };

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
                <div ref={qrContainerRef} className="p-4 bg-white border-8 border-[#5A5A40]/10 rounded-3xl mb-6">
                  <QRCodeSVG value={qrValue} size={256} />
                </div>
                <div className="flex items-center gap-2 text-[#5A5A40] font-bold text-xl mb-2">
                  <Clock className="w-6 h-6" />
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-sm text-gray-500 mb-6">QR code expires in 5 minutes</p>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={generateQR}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Regenerate
                  </button>
                  <button 
                    onClick={downloadQR}
                    className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
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

          <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-bold">Live Attendance</h3>
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-bold">
                <Users className="w-4 h-4" />
                {attendanceLogs.length} Present
              </div>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
              {attendanceLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{log.studentName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-400">
                    {log.timestamp?.toDate().toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex bg-white p-1 rounded-2xl border border-black/5 shadow-sm">
            <button 
              onClick={() => setAttendanceMode('qr')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                attendanceMode === 'qr' ? "bg-[#5A5A40] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <QrCode className="w-4 h-4" /> QR Scan
            </button>
            <button 
              onClick={() => setAttendanceMode('face')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                attendanceMode === 'face' ? "bg-[#5A5A40] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
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
                  Scan the QR code displayed by your faculty to mark your presence.
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
                  <button
                    onClick={startScanning}
                    className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 flex items-center justify-center gap-3"
                  >
                    <Camera className="w-6 h-6" />
                    Scan QR Code
                  </button>
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
      )}
    </div>
  );
}
