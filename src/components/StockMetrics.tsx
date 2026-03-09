import { motion } from 'framer-motion';
import { Stock } from '../types/api';
import { Package } from 'lucide-react';

interface StockMetricsProps {
  stock: Stock[];
  isLoading?: boolean;
}

export function StockMetrics({ stock, isLoading }: StockMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-hm-bg-light border border-hm-gray-400/20 rounded p-4 animate-pulse"
          >
            <div className="h-4 bg-hm-gray-400/20 rounded mb-2 w-20"></div>
            <div className="h-8 bg-hm-gray-400/20 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  // Cores para cada produto
  const productColors: Record<string, string> = {
    branco: '#FFFFFF',
    cinza: '#666666',
    aluminio: '#999999',
    preto: '#000000',
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-hm-green" />
        <h2 className="text-hm-gray-700 font-bold text-sm uppercase tracking-widest">
          Estoque
        </h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stock.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="bg-hm-bg-light border border-hm-gray-400/20 rounded p-4 hover:border-hm-green/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: productColors[item.product.toLowerCase()] || '#BCCF00',
                  borderColor: item.product.toLowerCase() === 'branco' ? '#666666' : 'transparent',
                }}
              ></div>
              <span className="text-hm-gray-500 text-xs uppercase tracking-wide font-display">
                {item.product}
              </span>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-hm-gray-700 font-black text-2xl">
                {item.quantity}
              </span>
              <span className="text-hm-gray-400 text-xs uppercase tracking-wide">
                un
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
