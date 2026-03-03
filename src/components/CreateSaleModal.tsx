import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { User, CreateSalePayload, CreateSaleResult } from '../types/api';
import { logger } from '../lib/logger';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSalePayload) => Promise<CreateSaleResult>;
  users: User[];
  isLoading?: boolean;
}

export function CreateSaleModal({
  isOpen,
  onClose,
  onSubmit,
  users,
  isLoading = false,
}: CreateSaleModalProps) {
  const UNIT_PRICE = 15;
  const QUICK_QUANTITIES = [1, 2, 3, 5, 10];

  type UserWithPhoto = User & {
    avatarUrl?: string;
    photoUrl?: string;
    image?: string;
    avatar?: string;
    photo?: string;
  };

  const [formData, setFormData] = useState<CreateSalePayload>({
    quantity: 1,
    uuid: users[0]?.uuid || '',
    amount: 1 * UNIT_PRICE * 100, // em centavos
  });
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.uuid && users.length > 0) {
      setFormData((prev) => ({
        ...prev,
        uuid: users[0].uuid,
      }));
    }
  }, [users, formData.uuid]);

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
    const calculatedAmountCents = safeQuantity * UNIT_PRICE * 100; // centavos
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
    setPixQrCodeBase64(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsSubmitting(true);
      setError(null);
      logger.debug('[Modal] Submetendo venda', formData);
      const result = await onSubmit(formData);
      logger.debug('[Modal] Resultado createSale', result);
      setPixQrCodeBase64(result.brCodeBase64);
      
      // Reset form
      setFormData({
        quantity: 1,
        uuid: users[0]?.uuid || '',
        amount: UNIT_PRICE * 100, // em centavos
      });
    } catch (err: any) {
      logger.error('[Modal] Erro ao criar venda');
      logger.debug('[Modal] Resposta de erro:', err.response?.data);
      
      let message = 'Erro ao criar venda';
      if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      
      // Mostrar detalhes de validação se disponíveis
      if (err.response?.data?.error?.details) {
        const details = err.response.data.error.details;
        message += '\n' + JSON.stringify(details, null, 2);
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          >
            <div className="bg-hm-white rounded-t-sm sm:rounded shadow-xl max-w-2xl w-full h-[92vh] sm:h-auto overflow-y-auto border border-hm-bg-card">
              {/* Header — barra preta estilo HM */}
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

              {!pixQrCodeBase64 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Vendedor */}
                  <div>
                    <label className="block text-sm text-hm-gray-400 mb-2">
                      Vendedor *
                    </label>
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

                  {/* Quantidade */}
                  <div>
                    <label className="block text-sm text-hm-gray-400 mb-2">
                      Quantidade *
                    </label>
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

                  {/* Valor */}
                  <div>
                    <label className="block text-sm text-hm-gray-400 mb-2">
                      Valor (R$) *
                    </label>
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

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-900/30 border border-red-500/50 rounded-hm"
                    >
                      <p className="text-red-300 text-sm">{error}</p>
                    </motion.div>
                  )}

                  {/* Buttons */}
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
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {isSubmitting ? 'Gerando QR...' : 'Criar Venda'}
                    </button>
                  </div>
                </form>
              )}

              {pixQrCodeBase64 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-hm-green border-opacity-20 rounded-hm p-4 flex flex-col items-center"
                >
                  <h3 className="font-display text-xl font-bold text-hm-gray-700 mb-3">
                    QR Code do PIX
                  </h3>
                  <img
                    src={pixQrCodeBase64}
                    alt="QR Code PIX"
                    className="w-full max-w-[320px] aspect-square rounded-hm bg-white p-2"
                  />
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 w-full max-w-[320px] min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition uppercase tracking-wide"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}
            </div>{/* end p-6 */}
            </div>{/* end modal card */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
