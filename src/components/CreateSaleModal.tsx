import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, CreateSalePayload, CreateSaleResult, ProductSelection } from '../types/api';
import { logger } from '../lib/logger';
import { usePaymentSocket } from '../hooks/usePaymentSocket';
import {
  buildAvatarCandidates,
  getResolvedAvatarUrl,
  preloadAvatarsForUsers,
  rememberResolvedAvatarUrl,
} from '../lib/avatar';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSalePayload) => Promise<CreateSaleResult>;
  users: User[];
  isLoading?: boolean;
  onLeaderboardUpdate?: () => void;
  onStockUpdate?: () => void;
}

type ModalStep = 'seller' | 'quantity' | 'summary' | 'method' | 'pixQr' | 'confirmation';

const sortUsersAlphabetically = (list: User[]) =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

export function CreateSaleModal({
  isOpen,
  onClose,
  onSubmit,
  users,
  isLoading = false,
  onLeaderboardUpdate,
  onStockUpdate,
}: CreateSaleModalProps) {
  const UNIT_PRICE = 20;
  const AVAILABLE_PRODUCTS = [
    { id: 1, name: 'branco', displayName: 'Branco', color: '#FFFFFF', borderColor: '#666666' },
    { id: 2, name: 'cinza', displayName: 'Cinza', color: '#666666', borderColor: 'transparent' },
    { id: 3, name: 'aluminio', displayName: 'Alumínio', color: '#999999', borderColor: 'transparent' },
    { id: 4, name: 'preto', displayName: 'Preto', color: '#000000', borderColor: '#666666' },
  ];

  const [currentStep, setCurrentStep] = useState<ModalStep>('seller');
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'dinheiro' | null>(null);
  const [saleId, setSaleId] = useState<string | number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({
    branco: 0,
    cinza: 0,
    aluminio: 0,
    preto: 0,
  });
  const [formData, setFormData] = useState<CreateSalePayload>({
    products: [],
    uuid: sortUsersAlphabetically(users)[0]?.uuid || '',
    amount: 0,
    method: 'pix',
    local: true,
  });
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserAvatarIndex, setSelectedUserAvatarIndex] = useState(0);
  const [selectedUserAvatarSrc, setSelectedUserAvatarSrc] = useState<string | null>(null);
  const autoCloseTimeoutRef = useRef<number | null>(null);
  const shouldEnableSocket = isOpen && currentStep === 'pixQr' && selectedMethod === 'pix' && !!saleId;

  const sortedUsers = useMemo(() => sortUsersAlphabetically(users), [users]);

  const { isConnected, joinSale, leaveSale, startPollingFallback, stopPollingFallback } =
    usePaymentSocket({
      enabled: shouldEnableSocket,
      onPaymentConfirmed: () => {
        logger.debug('[Modal] ✓ Pagamento confirmado via WebSocket');
        setCurrentStep('confirmation');
        stopPollingFallback();
        onLeaderboardUpdate?.();
        onStockUpdate?.();

        if (autoCloseTimeoutRef.current) {
          window.clearTimeout(autoCloseTimeoutRef.current);
        }

        autoCloseTimeoutRef.current = window.setTimeout(() => {
          handleClose();
        }, 2500);
      },
      onConnect: () => {
        logger.debug('[Modal] WebSocket conectado');
      },
      onDisconnect: () => {
        logger.debug('[Modal] WebSocket desconectado');

        if (saleId && selectedMethod === 'pix' && pixQrCodeBase64 && currentStep === 'pixQr') {
          logger.debug('[Modal] Ativando polling fallback');
          startPollingFallback(saleId);
        }
      },
      onError: (socketError) => {
        logger.error('[Modal] Erro de socket', socketError);
      },
    });

  useEffect(() => {
    if (!formData.uuid && sortedUsers.length > 0) {
      setFormData((prev) => ({
        ...prev,
        uuid: sortedUsers[0].uuid,
      }));
    }
  }, [sortedUsers, formData.uuid]);

  useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current) {
        window.clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pixQrCodeBase64 && saleId && selectedMethod === 'pix' && currentStep === 'pixQr') {
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
  }, [
    pixQrCodeBase64,
    saleId,
    selectedMethod,
    isConnected,
    joinSale,
    leaveSale,
    startPollingFallback,
    stopPollingFallback,
    currentStep,
  ]);

  const resetForm = () => {
    setSelectedProducts({
      branco: 0,
      cinza: 0,
      aluminio: 0,
      preto: 0,
    });
    setFormData({
      products: [],
      uuid: sortedUsers[0]?.uuid || '',
      amount: 0,
      method: 'pix',
      local: true,
    });
  };

  const getTotalQuantity = () => {
    return Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0);
  };

  const updateProductQuantity = (productName: string, newQuantity: number) => {
    const safeQuantity = Math.max(0, newQuantity);
    const newSelectedProducts = {
      ...selectedProducts,
      [productName]: safeQuantity,
    };

    setSelectedProducts(newSelectedProducts);

    // Atualizar formData
    const totalQuantity = Object.values(newSelectedProducts).reduce((sum, qty) => sum + qty, 0);
    const totalAmount = totalQuantity * UNIT_PRICE * 100;
    const isLocal = totalQuantity <= 12;
    const productsArray: ProductSelection[] = Object.entries(newSelectedProducts)
      .filter(([_, qty]) => qty > 0)
      .map(([productName, quantity]) => {
        const product = AVAILABLE_PRODUCTS.find(p => p.name === productName);
        return { id: product!.id, quantity };
      });

    setFormData((prev) => ({
      ...prev,
      amount: totalAmount,
      products: productsArray,
      local: isLocal,
    }));

    logger.debug('[Modal] Produtos atualizados', {
      products: newSelectedProducts,
      totalQuantity,
      totalAmount,
      local: isLocal,
    });
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'V';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const buildModalAvatarCandidates = useCallback((user: User) => {
    const candidates = buildAvatarCandidates(user);
    const resolved = getResolvedAvatarUrl(user.uuid);

    if (resolved && candidates.includes(resolved)) {
      return [resolved, ...candidates.filter((candidate) => candidate !== resolved)];
    }

    return candidates;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const preloadUsersAvatars = async () => {
      if (cancelled || sortedUsers.length === 0) {
        return;
      }

      await preloadAvatarsForUsers(sortedUsers);
    };

    preloadUsersAvatars();

    return () => {
      cancelled = true;
    };
  }, [sortedUsers]);

  const selectedUserIndex = sortedUsers.findIndex((user) => user.uuid === formData.uuid);
  const safeUserIndex = selectedUserIndex >= 0 ? selectedUserIndex : 0;
  const selectedUser = sortedUsers[safeUserIndex];
  const selectedUserAvatarCandidates = useMemo(() => {
    if (!selectedUser) return [] as string[];

    return buildModalAvatarCandidates(selectedUser);
  }, [selectedUser, buildModalAvatarCandidates]);
  const selectedUserCandidatesSignature = selectedUserAvatarCandidates.join('|');

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserAvatarIndex(0);
      setSelectedUserAvatarSrc(null);
      return;
    }

    const cachedUrl = getResolvedAvatarUrl(selectedUser.uuid);
    if (cachedUrl && selectedUserAvatarCandidates.includes(cachedUrl)) {
      setSelectedUserAvatarIndex(selectedUserAvatarCandidates.indexOf(cachedUrl));
      setSelectedUserAvatarSrc(cachedUrl);
      return;
    }

    setSelectedUserAvatarIndex(0);
    setSelectedUserAvatarSrc(selectedUserAvatarCandidates[0] || null);
  }, [selectedUser?.uuid, selectedUserCandidatesSignature]);

  const handleSelectedUserAvatarError = () => {
    const nextIndex = selectedUserAvatarIndex + 1;
    if (nextIndex < selectedUserAvatarCandidates.length) {
      setSelectedUserAvatarIndex(nextIndex);
      setSelectedUserAvatarSrc(selectedUserAvatarCandidates[nextIndex]);
      return;
    }

    const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      selectedUser?.name || 'User'
    )}&backgroundColor=BCCF00&textColor=000000`;
    setSelectedUserAvatarSrc(fallbackUrl);
  };

  const handleSelectedUserAvatarLoad = () => {
    if (selectedUser && selectedUserAvatarSrc) {
      rememberResolvedAvatarUrl(selectedUser.uuid, selectedUserAvatarSrc);
    }
  };

  const goToPreviousUser = () => {
    if (safeUserIndex <= 0) return;
    const prevUser = sortedUsers[safeUserIndex - 1];
    if (prevUser) {
      setFormData((prev) => ({ ...prev, uuid: prevUser.uuid }));
    }
  };

  const goToNextUser = () => {
    if (safeUserIndex >= sortedUsers.length - 1) return;
    const nextUser = sortedUsers[safeUserIndex + 1];
    if (nextUser) {
      setFormData((prev) => ({ ...prev, uuid: nextUser.uuid }));
    }
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
    setCurrentStep('seller');
    setSelectedMethod(null);
    setSaleId(null);
    resetForm();
    onClose();
  };

  const validateSellerAndQuantity = () => {
    if (!formData.uuid) {
      setError('Selecione um vendedor');
      return false;
    }

    if (getTotalQuantity() <= 0) {
      setError('Quantidade deve ser maior que 0');
      return false;
    }

    if (formData.amount <= 0) {
      setError('Valor deve ser maior que 0');
      return false;
    }

    return true;
  };

  const handleSellerNext = () => {
    if (!formData.uuid) {
      setError('Selecione um vendedor');
      return;
    }

    setError(null);
    setCurrentStep('quantity');
  };

  const handleQuantityNext = () => {
    if (!validateSellerAndQuantity()) {
      return;
    }

    setError(null);
    setCurrentStep('summary');
  };

  const handleSummaryNext = () => {
    if (!validateSellerAndQuantity()) {
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
        setCurrentStep('pixQr');
      } else {
        setPixQrCodeBase64(null);
        setCurrentStep('confirmation');

        onLeaderboardUpdate?.();
        onStockUpdate?.();

        autoCloseTimeoutRef.current = window.setTimeout(() => {
          handleClose();
        }, 2500);
      }
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
                  {currentStep === 'seller' && (
                    <motion.div
                      key="seller-step"
                      initial={{ opacity: 0, x: -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <p className="text-hm-gray-400 text-xs uppercase tracking-widest">Etapa 1 de 6</p>
                      <h3 className="font-display text-lg font-black text-hm-gray-700 uppercase tracking-tight">
                        Selecionar vendedor
                      </h3>

                      {sortedUsers.length === 0 ? (
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
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center text-hm-gray-700 font-bold flex-shrink-0 ${
                                      selectedUserAvatarSrc?.includes('dicebear.com') ? 'border-2 border-hm-green' : ''
                                    }`}>
                                      {selectedUser && selectedUserAvatarSrc ? (
                                        <img
                                          src={selectedUserAvatarSrc}
                                          alt={selectedUser.name}
                                          className="w-full h-full object-cover"
                                          loading="eager"
                                          decoding="async"
                                          onError={handleSelectedUserAvatarError}
                                          onLoad={handleSelectedUserAvatarLoad}
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
                              disabled={isSubmitting || isLoading || safeUserIndex >= sortedUsers.length - 1}
                              className="min-h-[56px] min-w-[56px] rounded-hm bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 text-2xl font-bold disabled:opacity-40 hover:bg-hm-green/10 transition"
                              aria-label="Próximo vendedor"
                            >
                              ›
                            </button>
                          </div>

                          <div className="mt-2 text-center text-xs text-hm-gray-400">
                            {safeUserIndex + 1} de {sortedUsers.length}
                          </div>
                        </>
                      )}

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
                          type="button"
                          onClick={handleSellerNext}
                          disabled={isSubmitting || isLoading || sortedUsers.length === 0}
                          className="w-full min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition disabled:opacity-50 uppercase tracking-wide"
                        >
                          Continuar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'quantity' && (
                    <motion.div
                      key="quantity-step"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="space-y-4"
                    >
                      <p className="text-hm-gray-400 text-xs uppercase tracking-widest">Etapa 2 de 6</p>
                      <h3 className="font-display text-lg font-black text-hm-gray-700 uppercase tracking-tight">
                        Selecionar Produtos
                      </h3>

                      <div className="bg-hm-gray-100/40 border border-hm-green/20 rounded p-3 flex items-center justify-between">
                        <span className="text-sm text-hm-gray-600 font-display uppercase">Total</span>
                        <span className="text-lg font-bold text-hm-gray-700">
                          {getTotalQuantity()}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {AVAILABLE_PRODUCTS.map((product) => (
                          <div
                            key={product.name}
                            className="bg-hm-bg-light border border-hm-gray-400/20 rounded p-4 hover:border-hm-green/40 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-5 h-5 rounded-full border-2"
                                  style={{
                                    backgroundColor: product.color,
                                    borderColor: product.borderColor,
                                  }}
                                ></div>
                                <span className="text-hm-gray-700 font-semibold text-base">
                                  {product.displayName}
                                </span>
                              </div>
                              <span className="text-hm-gray-400 text-sm">
                                R$ {UNIT_PRICE.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(product.name, selectedProducts[product.name] - 1)}
                                disabled={isSubmitting || selectedProducts[product.name] <= 0}
                                className="min-h-[44px] min-w-[44px] rounded bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 font-bold disabled:opacity-30 hover:bg-hm-green/10 transition flex items-center justify-center"
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <div className="flex-1 text-center">
                                <span className="text-2xl font-black text-hm-gray-700">
                                  {selectedProducts[product.name]}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => updateProductQuantity(product.name, selectedProducts[product.name] + 1)}
                                disabled={isSubmitting}
                                className="min-h-[44px] min-w-[44px] rounded bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 font-bold disabled:opacity-30 hover:bg-hm-green/10 transition flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-hm-gray-100/40 border border-hm-green/20 rounded p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-hm-gray-600 font-display uppercase text-sm">Valor Total</span>
                          <span className="text-hm-green font-display text-2xl font-black">
                            R$ {(formData.amount / 100).toFixed(2)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-hm-gray-400">Valor unitário: R$ {UNIT_PRICE.toFixed(2)}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setCurrentStep('seller')}
                          disabled={isSubmitting}
                          className="w-full min-h-[56px] px-4 py-3 bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 rounded-hm text-lg font-semibold hover:bg-hm-gray-100 hover:border-opacity-40 transition disabled:opacity-50"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleQuantityNext}
                          disabled={isSubmitting || getTotalQuantity() === 0}
                          className="w-full min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition disabled:opacity-50 uppercase tracking-wide"
                        >
                          Continuar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'summary' && (
                    <motion.div
                      key="summary-step"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="space-y-4"
                    >
                      <p className="text-hm-gray-400 text-xs uppercase tracking-widest">Etapa 3 de 6</p>
                      <h3 className="font-display text-lg font-black text-hm-gray-700 uppercase tracking-tight">
                        Resumo da transação
                      </h3>

                      <div className="border border-hm-green/20 rounded-hm p-4 space-y-3 bg-hm-gray-100/40">
                        <div className="pb-3 border-b border-hm-gray-400/20">
                          <p className="text-hm-gray-700 font-semibold text-base">
                            Vendedor: {selectedUser?.name || '-'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-hm-gray-600 text-xs uppercase tracking-wide font-display">Produtos:</p>
                          {Object.entries(selectedProducts)
                            .filter(([_, qty]) => qty > 0)
                            .map(([productName, qty]) => {
                              const productInfo = AVAILABLE_PRODUCTS.find(p => p.name === productName);
                              return (
                                <div key={productName} className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full border-2"
                                      style={{
                                        backgroundColor: productInfo?.color || '#BCCF00',
                                        borderColor: productInfo?.borderColor || 'transparent',
                                      }}
                                    ></div>
                                    <span className="text-hm-gray-700 font-medium">
                                      {productInfo?.displayName || productName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-hm-gray-600 text-sm">{qty}x</span>
                                    <span className="text-hm-gray-700 font-semibold">
                                      R$ {(qty * UNIT_PRICE).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        <div className="pt-3 border-t border-hm-gray-400/20">
                          <div className="flex items-center justify-between">
                            <span className="text-hm-gray-600 font-display uppercase text-sm">Total</span>
                            <span className="text-hm-green font-display text-2xl font-black">
                              R$ {(formData.amount / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-hm-gray-500 text-xs mt-1">
                            {getTotalQuantity()} {getTotalQuantity() === 1 ? 'produto' : 'produtos'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setCurrentStep('quantity')}
                          disabled={isSubmitting}
                          className="w-full min-h-[56px] px-4 py-3 bg-hm-gray-100 border border-hm-green border-opacity-20 text-hm-gray-700 rounded-hm text-lg font-semibold hover:bg-hm-gray-100 hover:border-opacity-40 transition disabled:opacity-50"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleSummaryNext}
                          disabled={isSubmitting}
                          className="w-full min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition disabled:opacity-50 uppercase tracking-wide"
                        >
                          Continuar
                        </button>
                      </div>
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
                      <p className="text-hm-gray-400 text-xs uppercase tracking-widest">Etapa 4 de 6</p>

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
                            <img src="/icons/pix.svg" alt="Ícone PIX" className="w-8 h-8" />
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
                        onClick={() => setCurrentStep('summary')}
                        disabled={isSubmitting}
                        className="w-full min-h-[48px] px-4 py-3 text-hm-gray-400 text-sm font-semibold hover:text-hm-gray-700 transition uppercase tracking-wide disabled:opacity-50"
                      >
                        ← Voltar ao resumo
                      </button>
                    </motion.div>
                  )}

                  {currentStep === 'pixQr' && (
                    <motion.div
                      key="pix-step"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="flex flex-col items-center"
                    >
                      <p className="text-hm-gray-400 text-xs uppercase tracking-widest mb-3">Etapa 5 de 6</p>

                      {pixQrCodeBase64 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-hm-green border-opacity-20 rounded-hm p-4 flex flex-col items-center w-full"
                        >
                          <h3 className="font-display text-xl font-bold text-hm-gray-700 mb-3">QR Code do PIX</h3>
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
                            {isConnected ? '✓ Escutando pagamento...' : '⚠ Reconectando... (polling ativo)'}
                          </motion.div>

                          <button
                            type="button"
                            onClick={handleClose}
                            className="mt-4 w-full max-w-[320px] min-h-[56px] px-4 py-3 bg-hm-green text-hm-black rounded-hm text-lg font-bold hover:bg-hm-green-hover transition uppercase tracking-wide"
                          >
                            Fechar
                          </button>
                        </motion.div>
                      ) : (
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
                    </motion.div>
                  )}

                  {currentStep === 'confirmation' && (
                    <motion.div
                      key="confirmation-step"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="flex flex-col items-center"
                    >
                      <p className="text-hm-gray-400 text-xs uppercase tracking-widest mb-3">Etapa 6 de 6</p>

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
                          {selectedMethod === 'pix' ? 'Pagamento PIX confirmado' : 'Pagamento em dinheiro confirmado'}
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
