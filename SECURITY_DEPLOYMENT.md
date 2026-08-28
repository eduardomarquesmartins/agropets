# Ativação segura

Esta alteração substitui o login customizado por Supabase Auth e fecha o acesso público ao banco. A migração não foi aplicada automaticamente porque o repositório não identifica qual projeto Supabase remoto pertence à Agropets.

1. Configure no Supabase Auth os provedores Email e Google e inclua a URL de produção nas Redirect URLs.
2. Crie os usuários da equipe no Supabase Auth. Não reutilize as credenciais antigas.
3. Aplique a migração `supabase/migrations/20260828181024_harden_auth_and_rls.sql` no projeto correto.
4. Associe cada membro da equipe à identidade criada, pelo SQL Editor, usando o UUID de `auth.users`:

```sql
update public.admin_users
set auth_user_id = '<uuid de auth.users>'
where email = '<email da equipe>';
```

5. Rotacione as chaves Supabase, Resend, OpenAI e Evolution API. Mantenha somente chaves públicas do Supabase em variáveis `VITE_*`; use `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `OPENAI_API_KEY` somente no ambiente da Vercel.
6. O `db.json` já foi limpo de dados pessoais e credenciais; mantenha apenas dados fictícios nele.

Após a migração, clientes precisam criar/confirmar a conta pelo Supabase Auth. Perfis de clientes legados são vinculados ao usuário autenticado pelo e-mail no primeiro cadastro confirmado.
