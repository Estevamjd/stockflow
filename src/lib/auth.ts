import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";

/**
 * Configuração do NextAuth.
 *
 * Decisões:
 *  - Strategy `jwt` (sem tabela de Sessions consultada a cada request).
 *  - Adapter Prisma só para User/Account (Google OAuth).
 *  - Google é opcional: o array de providers só inclui Google se a env
 *    estiver setada NO BUILD. Se você só ligar Google em runtime, vai
 *    ter que rebuildar — limitação aceita para evitar criar provider
 *    inválido.
 *  - **Logs de credenciais NÃO são gravados.** O fluxo de login não
 *    deve emitir nada que permita correlacionar email→sucesso/falha
 *    em log indexado (vetor de enumeração de usuários).
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        // Mensagem de erro genérica em todos os caminhos para não
        // diferenciar "email não existe" de "senha errada" — isso
        // bloqueia enumeração de usuários.
        const GENERIC_ERROR = "Email ou senha inválidos";

        if (!credentials?.email || !credentials?.password) {
          throw new Error(GENERIC_ERROR);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user || !user.passwordHash) {
          // Compara contra hash dummy para igualar o tempo de resposta
          // entre "usuário existe" e "usuário não existe" (timing attack).
          await bcrypt.compare(credentials.password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");
          throw new Error(GENERIC_ERROR);
        }

        if (!user.isActive) {
          throw new Error("Conta desativada. Entre em contato com o suporte.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error(GENERIC_ERROR);
        }

        // Log apenas o ID interno — nunca email/role/tenantId em mensagem.
        // O resto do fluxo segue via JWT.
        logger.info({ userId: user.id }, "Login bem-sucedido");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Criar tenant + user para novo usuário Google
          const tenantName = user.name ?? user.email!.split("@")[0];
          const slug = slugify(tenantName) + "-" + Date.now().toString(36);

          await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
              data: { name: tenantName, slug },
            });
            await tx.user.create({
              data: {
                tenantId: tenant.id,
                email: user.email!,
                name: user.name,
                image: user.image,
                role: "OWNER",
              },
            });
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
      } else if (token.id && !token.tenantId) {
        // Buscar dados do usuário se não estiverem no token
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { tenantId: true, role: true },
        });
        if (dbUser) {
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.tenantId = token.tenantId;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
