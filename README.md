# StockFlow — Controle de Estoque e Vendas SaaS

![Dashboard do StockFlow](docs/screenshots/dashboard.png)

Um sistema SaaS moderno para pequenos vendedores e empreendedores focado no controle de estoque e vendas, com integração automática para a Shopee.

## 🎯 O problema

Quem vende em loja física e na Shopee ao mesmo tempo costuma controlar estoque em planilha e descobrir tarde que um produto acabou ou que vendeu sem ter. O StockFlow centraliza produtos, entradas e vendas, baixa o estoque automaticamente quando chega um pedido da Shopee e avisa quando algo está acabando.

> Projeto pessoal de portfólio. A integração com a Shopee pode ser testada no **Modo de Simulação**, sem credenciais reais.

## 📸 Telas

| Produtos | Vendas | Relatórios |
|---|---|---|
| ![Produtos](docs/screenshots/products.png) | ![Vendas](docs/screenshots/sales.png) | ![Relatórios](docs/screenshots/reports.png) |
| **Integrações** | **Notificações** | |
| ![Integrações](docs/screenshots/integrations.png) | ![Notificações](docs/screenshots/notifications.png) | |

## ✨ Funcionalidades Principais

- **Multi-tenant isolado**: Cada loja ou usuário tem seus próprios dados compartimentados via `tenantId`.
- **Controle Rigoroso de Estoque**: Registros de entradas (com cálculo de Custo Médio Ponderado) e saídas (baixas manuais ou por vendas automáticas).
- **Integração com a Shopee**: Serviço de sincronização e webhook para abater o estoque automaticamente conforme novos pedidos ou mudanças de status na Shopee.
- **Modo de Simulação**: Endpoint e painel que permitem testar as funções do sistema (geração de venda e simulação de webhook) sem precisar de credenciais reais da Shopee.
- **Notificações em Tempo Real**: Alertas sobre vendas recém processadas, estoque baixo, ruptura de estoque (produtos zerados) e erros de integração.
- **Relatórios**: Filtros de vendas e relatórios de métricas do estoque (produtos mais vendidos, margem de lucro), com exportação para CSV e Excel.
- **Autenticação Segura**: Login por credenciais clássicas. Arquitetura pronta para incluir o Google OAuth no NextAuth.

## 🛠️ Stack Tecnológica

- **Frontend / Framework**: Next.js 14 (App Router)
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado e Requisições**: Zustand (Notificações Globais), TanStack Query (Estado de Servidor)
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: NextAuth v4
- **Gráficos e Estruturação**: Recharts, Lucide React

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (versão 18+)
- Banco de Dados PostgreSQL (rodando localmente, pelo Docker, ou banco cloud como Supabase / Railway)

### 1. Clonar o repositório
```bash
git clone https://github.com/Estevamjd/stockflow.git
cd stockflow
```

### 2. Instalar dependências
```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz. O mínimo para rodar localmente:
```bash
DATABASE_URL="postgresql://usuario:senha@localhost:5432/stockflow"
NEXTAUTH_SECRET="gere-um-valor-aleatorio"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
_Opcionais: `SHOPEE_*` (integração real), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `STRIPE_*`/`MERCADOPAGO_WEBHOOK_SECRET` (planos), `WHATSAPP_PROVIDER`/`EVOLUTION_*`/`CALLMEBOT_API_KEY` (alertas por WhatsApp) e `CRON_SECRET`. Nunca faça commit do `.env`._

### 4. Configurar e Semear o Banco de Dados
A aplicação utiliza Prisma como ORM. Siga os comandos abaixo para criar as tabelas e povoar informações iniciais de demonstração.

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```
> O arquivo de *seed* criará dados para apresentar no Dashboard (Usuário, Produtos, Entradas de Estoque, Vendas, Notificações, etc.) utilizando **demo@stockflow.com** com a senha **demo123456**.

### 5. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador. O acesso inicial pedirá login.

## 🔗 Integração com a Shopee

O StockFlow possui suporte para webhook da Shopee:
- Vá em **Integrações** no dashboard do StockFlow.
- Em desenvolvimento, deixe o **Modo Mock** ativado para usar os botões "Gerar Venda Simulada" e "Simular Webhook".
- Em produção, configure a URL gerada (por exemplo `https://seusite.com/api/webhooks/shopee`) dentro do seu console de vendedor da plataforma Shopee/Partner com as devidas chaves colocadas no arquivo `.env`.

***
## 🧪 Qualidade

```bash
npm run ci   # lint + typecheck + testes (Vitest) + build
```

## 👤 Autor

Feito por **Estevam Juliano** — [LinkedIn](https://www.linkedin.com/in/estevam-juliano-8799b026b/) · [GitHub](https://github.com/Estevamjd)

_Construído para escalar pequenos varejos do mundo físico e digital._
