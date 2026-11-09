# Polita Offer Studio v1

Aplicação estática responsiva com login Supabase, cadastro individual de contatos, ofertas, campanhas e fila de envio assistido via WhatsApp. Não envia mensagens automaticamente.

## Instalação
1. Crie um projeto gratuito em https://supabase.com (confira os limites e termos do plano).
2. No SQL Editor, execute `schema.sql` uma vez.
3. Em Authentication > Users, crie/convide os vendedores. Desative cadastro público (Allow new users to sign up) para impedir inscrições livres.
4. Copie `config.example.js` para `config.js` e preencha a Project URL e a chave **publishable/anon**, nunca a `service_role` ou secret key.
5. Publique `index.html`, `app.js` e `config.js` em uma hospedagem estática que permita uso comercial, ou teste localmente com `python3 -m http.server 8000` e abra `http://localhost:8000`.
6. Ajuste as configurações de URL permitidas no Supabase Auth para o domínio usado.

## Segurança e limitações
- Cada vendedor vê apenas seus próprios registros, protegidos por Row Level Security (RLS). O compartilhamento de carteira entre vendedores **não está implementado** nesta versão.
- Os contatos são adicionados manualmente; importação CSV e upload de imagens serão próximos módulos.
- O campo de catálogo aceita uma URL pública já existente; o site ainda não hospeda galerias.
- Os valores são informados pelo vendedor, sem sincronização de estoque.
- A marcação 'confirmado' é manual; não há verificação de entrega.
- Ao clicar em Abrir WhatsApp, o navegador pode bloquear pop-ups; permita pop-ups para o site.
- A API WhatsApp Business não é utilizada; não há envio em massa automático.
- Envie ofertas apenas a compradores que tenham autorizado comunicações comerciais. Respeite pedidos de descadastro e leis aplicáveis de proteção de dados.
- Para produção, acrescente política de privacidade, processo de revogação de consentimento, backups, revisão de permissões, tratamento de erros e auditoria.
- Não hospede dados sensíveis sem configurar segurança e controles de acesso adequados.

## Teste imediato sem conta (demo.html)
Abra `demo.html` no navegador. É um ambiente de demonstração, sem Supabase, com contatos fictícios sem número e sem consentimento. Cadastre um contato de teste autorizado, crie uma campanha e use a prévia. O botão Abrir WhatsApp apenas abre a conversa para confirmação manual. Os dados desta demo ficam somente na memória da aba e desaparecem ao recarregar. Para testar autenticação e persistência, configure a aplicação principal seguindo a seção Instalação.

## iPhone e iPad (PWA)
- Publique a pasta completa em um servidor HTTPS; `file://` não permite instalar o PWA corretamente.
- Abra a URL no Safari no iPhone ou iPad, use Compartilhar > Adicionar à Tela de Início.
- `manifest.webmanifest`, `sw.js` e os ícones são necessários para a experiência de aplicativo.
- O service worker mantém apenas arquivos de interface em cache. Login, clientes e campanhas requerem conexão com Supabase. Não há modo offline de envio.
- A demonstração `demo.html` continua temporária, sem persistência e sem autenticação.
- Não armazene chaves secretas no `config.js`.
