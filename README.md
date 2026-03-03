# Sales Leaderboard

Uma webapp moderna de ranking de vendedores com design "Podium Noir" — Neo-Brutalism com luxo editorial.

## 🚀 Quick Start

### Instalação de Dependências

```bash
npm install
# ou
pnpm install
```

### Desenvolvimento

```bash
npm run dev
# ou
pnpm dev
```

O servidor de desenvolvimento estará rodando em `http://localhost:5173`

### Build para Produção

```bash
npm run build
# ou
pnpm build
```

## 📋 Conteúdo do Projeto

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── Header.tsx       # Cabeçalho com título e subtítulo
│   ├── RankBadge.tsx    # Badge com posição (ouro, prata, bronze)
│   ├── Avatar.tsx       # Avatar customizado do vendedor
│   ├── SalesCounter.tsx # Contador animado de vendas
│   ├── Progress.tsx     # Barra de progresso customizada
│   ├── LeaderboardCard.tsx    # Card individual de vendedor
│   └── LeaderboardPodium.tsx  # Composição dos 3 cards
├── data/
│   └── sellers.ts       # Dados fictícios dos vendedores
├── types/
│   └── seller.ts        # Interface TypeScript
├── lib/
│   └── utils.ts         # Funções utilitárias
├── App.tsx              # Componente raiz
├── main.tsx             # Ponto de entrada React
└── index.css            # Estilos globais

```

## 🎨 Design System

### Paleta de Cores "Podium Noir"
- **Fundo Principal:** `#0A0A0F`
- **Fundo dos Cards:** `#13131A`
- **Texto Principal:** `#F5F5F0`
- **Texto Secundário:** `#8A8A99`
- **Acento Ouro (1º):** `#D4A853`
- **Acento Prata (2º):** `#A8B0BC`
- **Acento Bronze (3º):** `#CD7F5C`

### Tipografia
- **Headings & Números:** Space Grotesk (700)
- **Corpo & Labels:** DM Sans (400/500)

## 🎭 Animações

- **Cards:** Entrada com stagger (slide-up + fade-in)
- **Contadores:** Animação numérica (0 → valor final em 2s)
- **Barra de Progresso:** Preenchimento com delay
- **Hover:** Scale(1.02) + intensificação do glow

## 📱 Responsividade

- **Mobile (<640px):** Layout vertical, cards em coluna
- **Tablet (640px-1024px):** Layout ajustado com padding
- **Desktop (>1024px):** Layout completo conforme especificado

## 🛠️ Stack Tecnológico

- **React 18+** — Framework UI
- **TypeScript** — Tipagem estática
- **Vite** — Build tool
- **Tailwind CSS 3+** — Estilização
- **Framer Motion** — Animações
- **Lucide React** — Ícones
- **Radix UI** — Componentes base

## 📦 Dependências Instaladas

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "framer-motion": "^10.16.4",
  "lucide-react": "^0.294.0",
  "@radix-ui/react-progress": "^1.0.3"
}
```

## 🎯 Features

✅ Ranking de vendedores com posições 1º, 2º e 3º
✅ Avatares customizados por rank
✅ Animação numérica de vendas
✅ Barra de progresso relativa ao 1º lugar
✅ Design neo-brutalism com textura de grain
✅ Tema escuro com acentos em ouro/prata/bronze
✅ Totalmente responsivo
✅ Animações suaves em entrada e hover
✅ Tipagem TypeScript completa

## 📄 Licença

MIT
