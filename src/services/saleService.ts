import apiClient from './api';
import { Sale, CreateSalePayload, CreateSaleResult } from '../types/api';

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
    console.log('[saleService] Enviando venda:', JSON.stringify(data, null, 2));
    console.log('[saleService] Quantidade:', data.quantity, '| Amount calculado:', data.amount);
    
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

      console.log('[saleService] Resposta completa:', JSON.stringify(response.data, null, 2));

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
      console.error('[saleService] ERRO ao criar venda:', error);
      console.error('[saleService] Status:', error.response?.status);
      console.error('[saleService] Response data completo:', JSON.stringify(error.response?.data, null, 2));
      console.error('[saleService] Error message:', error.response?.data?.error?.message);
      console.error('[saleService] Error details:', JSON.stringify(error.response?.data?.error?.details, null, 2));
      console.error('[saleService] Payload enviado:', JSON.stringify(data, null, 2));
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
