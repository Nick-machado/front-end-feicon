import { useEffect, useCallback, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '../lib/logger';
import { saleService } from '../services/saleService';

interface PaymentConfirmedData {
  saleId: string | number;
  status: 'paid' | 'pending' | 'failed';
  amount: number;
  transactionId?: string;
  timestamp: string;
  message: string;
}

interface UsePaymentSocketOptions {
  onPaymentConfirmed?: (data: PaymentConfirmedData) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enabled?: boolean;
}

interface UsePaymentSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinSale: (saleId: string | number) => void;
  leaveSale: (saleId: string | number) => void;
  startPollingFallback: (saleId: string | number) => void;
  stopPollingFallback: () => void;
}

export function usePaymentSocket(options: UsePaymentSocketOptions = {}): UsePaymentSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!options.enabled) {
      setIsConnected(false);
      setSocket(null);
      return;
    }

    const socketUrl = import.meta.env.VITE_WS_URL as string | undefined;

    if (!socketUrl) {
      logger.debug('[Socket] VITE_WS_URL não configurada. Usando apenas polling fallback.');
      setIsConnected(false);
      setSocket(null);
      return;
    }

    logger.debug(`[Socket] Conectando a ${socketUrl}`);

    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      logger.debug(`[Socket] ✓ Conectado com ID: ${newSocket.id}`);
      setIsConnected(true);
      optionsRef.current.onConnect?.();
    });

    newSocket.on('disconnect', () => {
      logger.debug('[Socket] ✗ Desconectado');
      setIsConnected(false);
      optionsRef.current.onDisconnect?.();
    });

    newSocket.on('connect_error', (error) => {
      logger.error('[Socket] Erro de conexão:', error);
      optionsRef.current.onError?.(new Error(`Erro de conexão: ${String(error)}`));
    });

    newSocket.on('payment_confirmed', (data: PaymentConfirmedData) => {
      logger.debug('[Socket] 🎉 Pagamento confirmado:', data);
      optionsRef.current.onPaymentConfirmed?.(data);
    });

    newSocket.on('error', (error) => {
      logger.error('[Socket] Erro:', error);
      optionsRef.current.onError?.(new Error(typeof error === 'string' ? error : 'Erro de socket'));
    });

    setSocket(newSocket);

    return () => {
      logger.debug('[Socket] Desconectando...');
      newSocket.disconnect();
    };
  }, [options.enabled]);

  const joinSale = useCallback(
    (saleId: string | number) => {
      if (!socket) {
        logger.debug('[Socket] Socket não está conectado');
        return;
      }

      socket.emit('join_sale', { saleId });
      logger.debug(`[Socket] Entrando na sala: sale_${saleId}`);
    },
    [socket]
  );

  const leaveSale = useCallback(
    (saleId: string | number) => {
      if (!socket) {
        logger.debug('[Socket] Socket não está conectado');
        return;
      }

      socket.emit('leave_sale', { saleId });
      logger.debug(`[Socket] Saindo da sala: sale_${saleId}`);
    },
    [socket]
  );

  const startPollingFallback = useCallback(
    (saleId: string | number) => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
      }

      logger.debug(`[Polling] Iniciando polling para venda ${saleId}`);

      const interval = window.setInterval(async () => {
        try {
          const sales = await saleService.getAll();
          const sale = sales.find((item) => item.id === Number(saleId));

          if (!sale) {
            return;
          }

          const status = sale?.status;
          const amount = sale.total ?? 0;

          if (status === true) {
            logger.debug('[Polling] ✓ Pagamento confirmado (via polling)');

            optionsRef.current.onPaymentConfirmed?.({
              saleId,
              status: 'paid',
              amount,
              timestamp: new Date().toISOString(),
              message: 'Pagamento confirmado (via polling)',
            });

            window.clearInterval(interval);
            pollingIntervalRef.current = null;
          }
        } catch (error) {
          logger.error('[Polling] Erro:', error);
        }
      }, 2000);

      pollingIntervalRef.current = interval;
    },
    []
  );

  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      logger.debug('[Polling] Polling parado');
    }
  }, []);

  return {
    socket,
    isConnected,
    joinSale,
    leaveSale,
    startPollingFallback,
    stopPollingFallback,
  };
}
