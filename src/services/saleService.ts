import apiClient from './api';
import { Sale, CreateSalePayload, CreateSaleResult } from '../types/api';
import { logger } from '../lib/logger';

export const saleService = {
  async getAll(): Promise<Sale[]> {
    const response = await apiClient.get<{ data: Sale[] }>('/sales');
    return response.data.data || [];
  },

  async getByUser(uuid: string): Promise<Sale[]> {
    const response = await apiClient.get<{ data: Sale[] }>(`/sales/${uuid}`);
    return response.data.data || [];
  },

  async create(data: CreateSalePayload): Promise<CreateSaleResult> {
    logger.debug('[saleService] Enviando venda', { quantity: data.quantity, uuid: data.uuid, amount: data.amount });
    
    try {
      const response = await apiClient.post<{
        data?: {
          sale?: Sale & {
            pixQrCode?: {
              data?: {
                brCodeBase64?: string;
              };
            };
          };
        };
      }>('/sales', data);

      logger.debug('[saleService] Venda criada com sucesso');

      const sale = response.data?.data?.sale;

      if (!sale) {
        throw new Error('Resposta inválida ao criar venda');
      }

      const brCodeBase64 = sale.pixQrCode?.data?.brCodeBase64 ?? null;

      return {
        sale,
        brCodeBase64,
      };
    } catch (error: any) {
      logger.error('[saleService] ERRO ao criar venda:', error?.response?.status || error?.message || 'erro desconhecido');
      logger.debug('[saleService] Detalhes erro createSale:', error?.response?.data);
      throw error;
    }
  },

  async update(id: number, data: Partial<Sale>): Promise<Sale> {
    const { data: result } = await apiClient.put<Sale>(`/sales/${id}`, data);
    return result;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/sales/${id}`);
  },
};
