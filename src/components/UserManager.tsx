import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit2, Plus, Loader2, X } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { CreateUserPayload } from '../types/api';

export function UserManager() {
  const { users, isLoading, createUser, updateUser, deleteUser } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: '',
    email: '',
    role: '',
    sector: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: '',
      sector: '',
    });
    setEditingUuid(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role || !formData.sector) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUuid) {
        await updateUser(editingUuid, formData);
      } else {
        await createUser(formData);
      }
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (userUuid: string) => {
    const user = users.find((u) => u.uuid === userUuid);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        sector: user.sector,
      });
      setEditingUuid(userUuid);
      setShowForm(true);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (confirm('Tem certeza que deseja deletar este usuário?')) {
      try {
        setDeletingUuid(uuid);
        await deleteUser(uuid);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao deletar usuário');
      } finally {
        setDeletingUuid(null);
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
        <h2 className="font-display text-2xl font-bold text-hm-gray-700">Vendedores</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-hm-green text-hm-black rounded-lg font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Novo Vendedor
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-hm-gray-100 rounded-lg border border-hm-green border-opacity-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Cargo</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
                placeholder="Ex: Vendedor Sênior"
              />
            </div>
            <div>
              <label className="block text-sm text-hm-gray-400 mb-1">Setor</label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full px-3 py-2 bg-hm-bg-light border border-hm-green border-opacity-10 rounded-lg text-hm-gray-700"
                placeholder="Ex: Comercial"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-hm-green text-hm-black rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : ''}
              {editingUuid ? 'Atualizar' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 bg-hm-green bg-opacity-20 text-podium-gold rounded-lg font-medium hover:opacity-90 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-hm-gray-400">Carregando vendedores...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-hm-gray-400">Nenhum vendedor cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <motion.div
              key={user.uuid}
              className="p-4 bg-hm-gray-100 rounded-lg border border-hm-green border-opacity-10 hover:border-opacity-20 transition"
            >
              <div className="mb-3">
                <h3 className="font-display text-lg font-bold text-hm-gray-700">{user.name}</h3>
                <p className="text-xs text-hm-gray-400">{user.role}</p>
                <p className="text-xs text-hm-gray-400">{user.sector}</p>
                <p className="text-xs text-hm-gray-400 mt-1 break-all">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(user.uuid)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-hm-green bg-opacity-20 text-podium-gold rounded text-sm font-medium hover:opacity-90 transition"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(user.uuid)}
                  disabled={deletingUuid === user.uuid}
                  className="px-3 py-1.5 bg-red-500 bg-opacity-20 text-red-400 rounded text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {deletingUuid === user.uuid ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
