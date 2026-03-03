import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { User, CreateSalePayload, CreateSaleResult } from '../types/api';
import { logger } from '../lib/logger';
import { usePaymentSocket } from '../hooks/usePaymentSocket';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSalePayload) => Promise<CreateSaleResult>;
  users: User[];
  isLoading?: boolean;
  onLeaderboardUpdate?: () => void;
}

type ModalStep = 'form' | 'method' | 'result';

type UserWithPhoto = User & {
  avatarUrl?: string;
  photoUrl?: string;
  image?: string;
  avatar?: string;
  photo?: string;
};

export function CreateSaleModal({
  isOpen,
  onClose,
  onSubmit,
  users,
  isLoading = false,
  onLeaderboardUpdate,
}: CreateSaleModalProps) {
  const UNIT_PRICE = 15;
  const QUICK_QUANTITIES = [1, 2, 3, 5, 10];

  const [currentStep, setCurrentStep] = useState<ModalStep>('form');
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'dinheiro' | null>(null);
  const [saleId, setSaleId] = useState<string | number | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [formData, setFormData] = useState<CreateSalePayload>({
    quantity: 1,
    uuid: users[0]?.uuid || '',
    amount: 1 * UNIT_PRICE * 100,
    method: 'pix',
  });
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoCloseTimeoutRef = useRef<number | null>(null);
  const shouldEnableSocket = isOpen && currentStep === 'result' && selectedMethod === 'pix' && !!saleId;

  const { isConnected, joinSale, leaveSale, startPollingFallback, stopPollingFallback } =
    usePaymentSocket({
      enabled: shouldEnableSocket,
      onPaymentConfirmed: () => {
        logger.debug('[Modal] ✓ Pagamento confirmado via WebSocket');
        setShowSuccessAnimation(true);
        stopPollingFallback();
        onLeaderboardUpdate?.();

        if (autoCloseTimeoutRef.current) {
          window.clearTimeout(autoCloseTimeoutRef.current);
        }

        autoCloseTimeoutRef.current = window.setTimeout(() => {
          handleClose();
        }, 2000);
      },
      onConnect: () => {
        logger.debug('[Modal] WebSocket conectado');
      },
      onDisconnect: () => {
        logger.debug('[Modal] WebSocket desconectado');

        if (saleId && selectedMethod === 'pix' && pixQrCodeBase64 && !showSuccessAnimation) {
          logger.debug('[Modal] Ativando polling fallback');
          startPollingFallback(saleId);
        }
      },
      onError: (socketError) => {
        logger.error('[Modal] Erro de socket', socketError);
      },
    });

  useEffect(() => {
    if (!formData.uuid && users.length > 0) {
      setFormData((prev) => ({
        ...prev,
        uuid: users[0].uuid,
      }));
    }
  }, [users, formData.uuid]);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        window.clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pixQrCodeBase64 && saleId && selectedMethod === 'pix') {
      if (isConnected) {
        joinSale(saleId);
        stopPollingFallback();
      } else {
        startPollingFallback(saleId);
      }

      return () => {
        if (isConnected) {
          leaveSale(saleId);
        }
      };
    }

    return undefined;
  }, [pixQrCodeBase64, saleId, selectedMethod, isConnected, joinSale, leaveSale, startPollingFallback, stopPollingFallback]);

  const resetForm = () => {
    setFormData({
      quantity: 1,
      uuid: users[0]?.uuid || '',
      amount: UNIT_PRICE * 100,
      method: 'pix',
    });
  };

  const getUserPhoto = (user: User): string | null => {
    const userWithPhoto = user as UserWithPhoto;
    return (
      userWithPhoto.avatarUrl ||
      userWithPhoto.photoUrl ||
      userWithPhoto.image ||
      userWithPhoto.avatar ||
      userWithPhoto.photo ||
      null
    );
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'V';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const selectedUserIndex = users.findIndex((user) => user.uuid === formData.uuid);
  const safeUserIndex = selectedUserIndex >= 0 ? selectedUserIndex : 0;
  const selectedUser = users[safeUserIndex];

  const goToPreviousUser = () => {
    if (safeUserIndex <= 0) return;
    const prevUser = users[safeUserIndex - 1];
    if (prevUser) {
      setFormData((prev) => ({ ...prev, uuid: prevUser.uuid }));
    }
  };

  const goToNextUser = () => {
    if (safeUserIndex >= users.length - 1) return;
    const nextUser = users[safeUserIndex + 1];
    if (nextUser) {
      setFormData((prev) => ({ ...prev, uuid: nextUser.uuid }));
    }
  };

  const updateQuantity = (quantity: number) => {
    const safeQuantity = Math.max(1, quantity);
    const calculatedAmountCents = safeQuantity * UNIT_PRICE * 100;
    logger.debug('[Modal] Quantidade/valor recalculados', {
      quantity: safeQuantity,
      amountCents: calculatedAmountCents,
      amountBRL: (calculatedAmountCents / 100).toFixed(2),
    });
    setFormData((prev) => ({
      ...prev,
      quantity: safeQuantity,
      amount: calculatedAmountCents,
    }));
  };

  const handleClose = () => {
    if (autoCloseTimeoutRef.current) {
      window.clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }

    if (saleId) {
      leaveSale(saleId);
    }

    stopPollingFallback();

    setPixQrCodeBase64(null);
    setError(null);
    setCurrentStep('form');
    setSelectedMethod(null);
    setSaleId(null);
    setShowSuccessAnimation(false);
    resetForm();
    onClose();
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.uuid) {
      setError('Selecione um vendedor');
      return;
    }

    if (formData.quantity <= 0) {
      setError('Quantidade deve ser maior que 0');
      return;
    }

    if (formData.amount <= 0) {
      setError('Valor deve ser maior que 0');
      return;
    }

    setError(null);
    setCurrentStep('method');
  };

  const handleSelectMethod = async (method: 'pix' | 'dinheiro') => {
    setSelectedMethod(method);

    const payload: CreateSalePayload = {
      ...formData,
      method,
    };

    try {
      setIsSubmitting(true);
      setError(null);
      logger.debug('[Modal] Submetendo venda', payload);

      const result = await onSubmit(payload);
      setSaleId(result.sale.id);

      if (method === 'pix') {
        setPixQrCodeBase64(result.brCodeBase64);
        setShowSuccessAnimation(false);
        setCurrentStep('result');
      } else {
        setPixQrCodeBase64(null);
        setCurrentStep('result');
        setShowSuccessAnimation(true);

        onLeaderboardUpdate?.();

        autoCloseTimeoutRef.current = window.setTimeout(() => {
          handleClose();
        }, 2500);
      }

      resetForm();
    } catch (err: any) {
      logger.error('[Modal] Erro ao criar venda');
      logger.debug('[Modal] Resposta de erro:', err.response?.data);

      let message = 'Erro ao criar venda';
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          >
            <div className="bg-hm-white rounded-t-sm sm:rounded shadow-xl max-w-2xl w-full h-[92vh] sm:h-auto overflow-y-auto border border-hm-bg-card">
              <div className="bg-hm-black px-6 py-4 flex items-center justify-between rounded-t-sm">
                <div>
                  <p className="text-hm-green text-xs font-bold uppercase tracking-widest">HM Rubber</p>
                  <h2 className="font-display text-lg font-black text-hm-white uppercase tracking-tight">
                    Nova Venda
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-hm-gray-400 hover:text-hm-white transition"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:p-8">
                <AnimatePresence mode="wait">
                  {currentStep === 'form' && (
                    <motion.div
                      key="form-step"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                    >
                      <form onSubmit={handleContinue} className="space-y-4">
                        <div>
                          <label className="block text-sm text-hm-gray-400 mb-2">Vendedor *</label>
                          {users.length === 0 ? (
                            <div className="w-full min-h-[56px] px-4 py-3 bg-hm-gray-100 border border-hm-green border-opacity-20 rounded-hm text-hm-gray-400 text-base flex items-center">
                              Nenhum vendedor disponível
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={goToPreviousUser}
                                  disabled={isSubmitting || isLoading || safeUserIndex === 0}
                                  className="min-h-[56px] min-w-[56px] rounded-hm bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 text-2xl font-bold disabled:opacity-40 hover:bg-hm-green/10 transition"
                                  aria-label="Vendedor anterior"
                                >
                                  ‹
                                </button>

                                <div className="flex-1 relative min-h-[110px]">
                                  <AnimatePresence mode="wait">
                                    <motion.button
                                      key={selectedUser?.uuid || 'empty'}
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                      type="button"
                                      disabled={isSubmitting || isLoading}
                                      className="absolute inset-0 w-full min-h-[110px] p-3 rounded-hm border border-hm-green bg-hm-green/20 text-left disabled:opacity-50"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-hm-green/20 flex items-center justify-center text-hm-gray-700 font-bold flex-shrink-0">
                                          {selectedUser && getUserPhoto(selectedUser) ? (
                                            <img
                                              src={getUserPhoto(selectedUser) as string}
                                              alt={selectedUser.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <span>{getInitials(selectedUser?.name || 'Vendedor')}</span>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-hm-gray-700 text-base font-semibold truncate">
                                            {selectedUser?.name || 'Vendedor'}
                                          </p>
                                          <p className="text-hm-gray-400 text-xs truncate">
                                            {selectedUser?.sector || 'Vendedor'}
                                          </p>
                                        </div>
                                      </div>
                                    </motion.button>
                                  </AnimatePresence>
                                </div>

                                <button
                                  type="button"
                                  onClick={goToNextUser}
                                  disabled={isSubmitting || isLoading || safeUserIndex >= users.length - 1}
                                  className="min-h-[56px] min-w-[56px] rounded-hm bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 text-2xl font-bold disabled:opacity-40 hover:bg-hm-green/10 transition"
                                  aria-label="Próximo vendedor"
                                >
                                  ›
                                </button>
                              </div>

                              <div className="mt-2 text-center text-xs text-hm-gray-400">
                                {safeUserIndex + 1} de {users.length}
                              </div>
                            </>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-hm-gray-400 mb-2">Quantidade *</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateQuantity(formData.quantity - 1)}
                              disabled={isSubmitting || formData.quantity <= 1}
                              className="min-h-[56px] min-w-[56px] rounded-hm bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 text-2xl font-bold disabled:opacity-40"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={formData.quantity}
                              onChange={(e) => updateQuantity(parseInt(e.target.value) || 1)}
                              disabled={isSubmitting}
                              className="w-full min-h-[56px] px-3 py-3 bg-hm-gray-100 border border-hm-green border-opacity-20 rounded-hm text-hm-gray-700 text-2xl text-center font-bold focus:outline-none focus:border-hm-green disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(formData.quantity + 1)}
                              disabled={isSubmitting}
                              className="min-h-[56px] min-w-[56px] rounded-hm bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 text-2xl font-bold disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-5 gap-2">
                            {QUICK_QUANTITIES.map((quantity) => (
                              <button
                                key={quantity}
                                type="button"
                                onClick={() => updateQuantity(quantity)}
                                disabled={isSubmitting}
                                className={`min-h-[48px] rounded-hm border text-base font-semibold transition ${
                                  formData.quantity === quantity
                                    ? 'bg-hm-green text-hm-black border-hm-green'
                                    : 'bg-hm-gray-100 text-hm-gray-700 border-hm-green border-opacity-20'
                                }`}
                              >
                                {quantity}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-hm-gray-400 mb-2">Valor (R$) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={(formData.amount / 100).toFixed(2)}
                            readOnly
                            disabled
                            className="w-full min-h-[56px] px-4 py-3 bg-hm-gray-100 border border-hm-green border-opacity-20 rounded-hm text-hm-gray-700 text-2xl text-center font-bold focus:outline-none disabled:opacity-70"
                          />
                          <p className="mt-2 text-sm text-hm-gray-400">Valor unitário: R$ {UNIT_PRICE.toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                          <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="w-full min-h-[56px] px-4 py-3 bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 rounded-hm text-lg font-semibold hover:bg-hm-gray-100 hover:border-opacity-40 transition disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || isLoading || users.length === 0}
                            className="w-full min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
                          >
                            CONTINUAR
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {currentStep === 'method' && (
                    <motion.div
                      key="method-step"
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="flex flex-col gap-4"
                    >
                      <div className="text-center border-b border-hm-green/20 pb-4">
                        <p className="text-hm-gray-400 text-xs uppercase tracking-widest mb-1">Resumo da venda</p>
                        <p className="text-hm-gray-700 font-bold text-base">
                          {selectedUser?.name} — {formData.quantity} {formData.quantity === 1 ? 'produto' : 'produtos'}
                        </p>
                        <p className="text-hm-green font-display text-2xl font-black mt-1">
                          R$ {(formData.amount / 100).toFixed(2)}
                        </p>
                      </div>

                      <h3 className="font-display text-lg font-black text-hm-gray-700 uppercase tracking-tight text-center">
                        Método de Pagamento
                      </h3>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectMethod('pix')}
                        disabled={isSubmitting}
                        className="w-full min-h-[100px] sm:min-h-[120px] px-6 py-6 bg-hm-black text-hm-white rounded-hm text-xl font-black uppercase tracking-wide border-2 border-hm-green hover:bg-hm-green hover:text-hm-black transition-all duration-300 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting && selectedMethod === 'pix' ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13.17 10.83l-1.41-1.41a4 4 0 00-5.66 0l-1.41 1.41a4 4 0 000 5.66l1.41 1.41" />
                              <path d="M10.83 13.17l1.41 1.41a4 4 0 005.66 0l1.41-1.41a4 4 0 000-5.66l-1.41-1.41" />
                            </svg>
                            <span>PIX</span>
                            <span className="text-xs font-normal opacity-70 normal-case tracking-normal">
                              Gerar QR Code para pagamento
                            </span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectMethod('dinheiro')}
                        disabled={isSubmitting}
                        className="w-full min-h-[100px] sm:min-h-[120px] px-6 py-6 bg-hm-white text-hm-gray-700 rounded-hm text-xl font-black uppercase tracking-wide border-2 border-hm-green/40 hover:border-hm-green hover:bg-hm-green/10 transition-all duration-300 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting && selectedMethod === 'dinheiro' ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="6" width="20" height="12" rx="2" />
                              <circle cx="12" cy="12" r="2" />
                              <path d="M6 12h.01M18 12h.01" />
                            </svg>
                            <span>DINHEIRO</span>
                            <span className="text-xs font-normal opacity-70 normal-case tracking-normal">
                              Pagamento já recebido em espécie
                            </span>
                          </>
                        )}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep('form')}
                        disabled={isSubmitting}
                        className="w-full min-h-[48px] px-4 py-3 text-hm-gray-400 text-sm font-semibold hover:text-hm-gray-700 transition uppercase tracking-wide disabled:opacity-50"
                      >
                        ← Voltar ao formulário
                      </button>
                    </motion.div>
                  )}

                  {currentStep === 'result' && (
                    <motion.div
                      key="result-step"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="flex flex-col items-center"
                    >
                      {selectedMethod === 'pix' && pixQrCodeBase64 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-hm-green border-opacity-20 rounded-hm p-4 flex flex-col items-center w-full"
                        >
                          {showSuccessAnimation ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                              className="flex flex-col items-center py-8"
                            >
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                                className="w-24 h-24 rounded-full bg-hm-green flex items-center justify-center mb-6"
                              >
                                <motion.svg
                                  className="w-12 h-12 text-hm-black"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <motion.path
                                    d="M5 13l4 4L19 7"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.6, duration: 0.4 }}
                                  />
                                </motion.svg>
                              </motion.div>

                              <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="font-display text-2xl font-black text-hm-green uppercase tracking-tight"
                              >
                                Pagamento Confirmado!
                              </motion.h3>

                              <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-hm-gray-400 text-sm mt-2 uppercase tracking-wide"
                              >
                                Venda registrada com sucesso
                              </motion.p>
                            </motion.div>
                          ) : (
                            <>
                              <h3 className="font-display text-xl font-bold text-hm-gray-700 mb-3">
                                QR Code do PIX
                              </h3>
                              <img
                                src={pixQrCodeBase64}
                                alt="QR Code PIX"
                                className="w-full max-w-[320px] aspect-square rounded-hm bg-white p-2"
                              />

                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className={`mt-3 px-3 py-2 rounded text-xs uppercase tracking-wide font-semibold ${
                                  isConnected
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                }`}
                              >
                                {isConnected
                                  ? '✓ Escutando pagamento...'
                                  : '⚠ Reconectando... (polling ativo)'}
                              </motion.div>

                              <button
                                type="button"
                                onClick={handleClose}
                                className="mt-4 w-full max-w-[320px] min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition uppercase tracking-wide"
                              >
                                Fechar
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}

                      {selectedMethod === 'pix' && !pixQrCodeBase64 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-red-500/30 rounded-hm p-4 flex flex-col items-center w-full"
                        >
                          <h3 className="font-display text-lg font-bold text-red-600 mb-2">QR Code indisponível</h3>
                          <p className="text-sm text-hm-gray-400 text-center mb-4">
                            A venda foi criada, mas não recebemos o QR Code. Tente novamente.
                          </p>
                          <button
                            type="button"
                            onClick={handleClose}
                            className="w-full max-w-[320px] min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition uppercase tracking-wide"
                          >
                            Fechar
                          </button>
                        </motion.div>
                      )}

                      {selectedMethod === 'dinheiro' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                          className="flex flex-col items-center py-8"
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                            className="w-24 h-24 rounded-full bg-hm-green flex items-center justify-center mb-6"
                          >
                            <motion.svg
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ delay: 0.5, duration: 0.4 }}
                              className="w-12 h-12 text-hm-black"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <motion.path
                                d="M5 13l4 4L19 7"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.6, duration: 0.4 }}
                              />
                            </motion.svg>
                          </motion.div>

                          <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="font-display text-2xl font-black text-hm-green uppercase tracking-tight"
                          >
                            Venda Registrada!
                          </motion.h3>

                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-hm-gray-400 text-sm mt-2 uppercase tracking-wide"
                          >
                            Pagamento em dinheiro confirmado
                          </motion.p>

                          <motion.div className="w-48 h-1 bg-hm-gray-100 rounded-full mt-6 overflow-hidden">
                            <motion.div
                              initial={{ width: '100%' }}
                              animate={{ width: '0%' }}
                              transition={{ duration: 2.5, ease: 'linear' }}
                              className="h-full bg-hm-green rounded-full"
                            />
                          </motion.div>

                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-hm-gray-400 text-xs mt-2"
                          >
                            Fechando automaticamente...
                          </motion.p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-hm"
                  >
                    <p className="text-red-300 text-sm">{error}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
