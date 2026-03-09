export interface User {
  uuid: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sale {
  id: number;
  quantity: number;
  uuid: string;
  total: number;
  status: boolean;
  pixQrCode?: Record<string, unknown>;
}

export interface PixQrCodeData {
  brCodeBase64?: string;
}

export interface PixQrCode {
  success?: boolean;
  data?: PixQrCodeData;
  error?: unknown;
}

export interface CreateSaleResult {
  sale: Sale;
  brCodeBase64: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details: unknown[];
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface LeaderboardEntry {
  user: User;
  rank: number;
  totalSales: number;
  totalRevenue: number;
  salesCount: number;
  confirmedSales: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  sector: string;
}

export interface ProductSelection {
  id: number;
  quantity: number;
}

export interface CreateSalePayload {
  products: ProductSelection[];
  uuid: string;
  amount: number;
  method: 'pix' | 'dinheiro';
  local: boolean;
}

export interface Stock {
  id: number;
  product: string;
  quantity: number;
  created_at: string;
}
