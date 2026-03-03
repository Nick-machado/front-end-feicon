import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export function ApiStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const checkApiStatus = async () => {
    try {
      // Em desenvolvimento, usa proxy; em produção, URL real
      const isDev = window.location.hostname === 'localhost';
      const baseURL = isDev ? '/api' : 'https://api-feicon.onrender.com';
      await axios.get(`${baseURL}/ping`, { timeout: 10000 });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(checkApiStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
      style={{
        backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      }}
    >
      {isOnline ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-green-400">API Online</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-400">API Offline</span>
        </>
      )}
    </motion.div>
  );
}
