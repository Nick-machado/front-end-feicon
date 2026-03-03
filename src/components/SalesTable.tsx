import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useUsers } from '../hooks/useUsers';
import { CreateSalePayload } from '../types/api';

export function SalesTable() {
  const { sales, isLoading, deleteSale, createSale } = useSales();
  const { users } = useUsers();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateSalePayload>({
    quantity: 1,
    uuid: users[0]?.uuid || '',
    amount: 0,
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.uuid || formData.quantity <= 0 || formData.amount <= 0) {
      alert('Preencha todos os campos corretamente');
      return;
    }

    try {
      setIsCreating(true);
      await createSale(formData);
      setFormData({
        quantity: 1,
        uuid: users[0]?.uuid || '',
        amount: 0,
      });
      setShowForm(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao criar venda');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja deletar esta venda?')) {
      try {
        setDeletingId(id);
        await deleteSale(id);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao deletar venda');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-hm-bg-light rounded-xl border border-hm-green border-opacity-5 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-hm-gray-700">Vendas</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-hm-green text-hm-black rounded-lg font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Nova Venda
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateSale} className="mb-6 p-4 bg-hm-gray-100 rounded-lg border border-hm-green border-opacity-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Vendedor</label>
              <select
                value={formData.uuid}
                onChange={(e) =>
                  setFormData({ ...formData, uuid: e.target.value })
                }
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
              >
                {users.map((user) => (
                  <option key={user.uuid} value={user.uuid}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Valor (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-hm-green text-hm-black rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-hm-green bg-opacity-20 text-podium-gold rounded-lg font-medium hover:opacity-90 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-hm-gray-400">Carregando vendas...</div>
      ) : sales.length === 0 ? (
        <div className="text-center py-8 text-hm-gray-400">Nenhuma venda registrada</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hm-green border-opacity-10">
                <th className="text-left py-3 px-4 text-hm-gray-400 text-sm font-medium">ID</th>
                <th className="text-left py-3 px-4 text-hm-gray-400 text-sm font-medium">Vendedor</th>
                <th className="text-left py-3 px-4 text-hm-gray-400 text-sm font-medium">Qtd</th>
                <th className="text-left py-3 px-4 text-hm-gray-400 text-sm font-medium">Total (R$)</th>
                <th className="text-left py-3 px-4 text-hm-gray-400 text-sm font-medium">Status</th>
                <th className="text-left py-3 px-4 text-hm-gray-400 text-sm font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const user = users.find((u) => u.uuid === sale.uuid);
                return (
                  <tr
                    key={sale.id}
                    className="border-b border-hm-green border-opacity-5 hover:bg-hm-gray-100 hover:bg-opacity-50 transition"
                  >
                    <td className="py-3 px-4 text-hm-gray-700 text-sm">#{sale.id}</td>
                    <td className="py-3 px-4 text-hm-gray-700 text-sm">{user?.name || 'Desconhecido'}</td>
                    <td className="py-3 px-4 text-hm-gray-700 text-sm">{sale.quantity}</td>
                    <td className="py-3 px-4 text-podium-gold text-sm font-medium">
                      R$ {sale.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.status
                            ? 'bg-green-500 bg-opacity-20 text-green-400'
                            : 'bg-yellow-500 bg-opacity-20 text-yellow-400'
                        }`}
                      >
                        {sale.status ? 'Confirmada' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(sale.id)}
                        disabled={deletingId === sale.id}
                        className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                      >
                        {deletingId === sale.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
