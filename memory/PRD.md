# HarmonyVox - PRD

## Problem Statement
Plataforma musical para coristas e grupos vocais onde usuários podem praticar naipes vocais individualmente com controles de volume/mute/solo por faixa. Interface de usuário + painel admin.

## Architecture
- **Backend**: FastAPI + MongoDB + Motor (async)
- **Frontend**: React 19 + Tailwind + Shadcn UI
- **Auth**: JWT (separado para user e admin)
- **Payments**: Stripe (BRL, Pix + cartões)
- **Email**: Resend (recuperação de senha)
- **Audio**: Armazenamento local em /app/backend/uploads/, streaming protegido via API

## User Personas
1. **Corista/Cantor** - Precisa praticar naipes vocais individualmente
2. **Admin/Regente** - Gerencia músicas, faixas, usuários e preços

## Core Requirements
- Multi-track player com volume/mute/solo por faixa
- Lista de músicas em ordem alfabética com busca
- Proteção de áudio (sem download direto)
- Assinatura mensal com Stripe
- Painel admin completo (CRUD músicas, usuários, warmup, preços)
- Recuperação de senha por email

## What's Been Implemented (2026-02-26)
- [x] Auth JWT (user + admin separados)
- [x] Registro e login de usuários
- [x] Login admin separado (admin@vocallayers.com / admin123)
- [x] Home page com lista de músicas + busca
- [x] Multi-track player com volume/mute/solo/seek
- [x] Audio streaming protegido (fetch + blob, sem download)
- [x] Perfil do usuário (dados, senha, assinatura)
- [x] Warm Up page
- [x] Stripe payment integration
- [x] Resend email integration (forgot password)
- [x] Admin Dashboard com stats
- [x] Admin Users CRUD (criar, ativar/desativar, reset senha, deletar)
- [x] Admin Songs CRUD (criar música, upload faixas MP3/WAV, deletar)
- [x] Admin Warmup CRUD
- [x] Admin Pricing (atualizar preço para todos ou só novos)
- [x] Design "Obsidian Gold" (dark mode, Playfair Display + Manrope)
- [x] Sonner toasts
- [x] Data-testid em todos elementos interativos

## P0 Features (Done)
- Multi-track player ✅
- Auth + roles ✅
- Song management ✅
- User management ✅

## P1 Features (Backlog)
- Edição de músicas e faixas no admin
- Exportar lista de emails inativos (CSV)
- Indicador visual de waveform no player

## P2 Features (Backlog)
- Busca avançada por naipe
- Favoritos do usuário
- Histórico de prática
- Notificações de expiração de assinatura

## Next Tasks
- Testar fluxo completo de pagamento Stripe em ambiente de teste
- Adicionar paginação para lista de usuários admin
- Melhorar responsividade mobile do player
