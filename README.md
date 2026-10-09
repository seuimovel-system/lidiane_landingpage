# LP Carreira — Lidiane Pinheiro (`lidianepinheiro.seuimovel.com.br`)

Landing page de recrutamento da RE/MAX Seu Imóvel: apresenta a carreira, oferece os e-books e
capta o lead de quem quer ser (ou já é) corretor. Direção visual "A — Noturno" (Claude Design,
09/10/2026). **No ar desde 09/10/2026, ~14:31 UTC** (11:31 de Brasília).

## O caminho do lead

```
formulário ──POST──▶ app.onixcloud.com.br/team/api/publico/lp/lidiane   (OnixTeam do portal)
                        └─ grava no funil de Recrutamento → 201 → a tela mostra "Pronto!"
```

- **O OnixTeam é o único destino, e é ele quem decide o "Pronto!".** Se a gravação falhar, a pessoa vê
  o aviso com o link do WhatsApp — nunca um sucesso falso. Até 09/10/2026 a LP mandava para a ponte
  `/api/site-lead/team`, que apontava para um OnixTeam retirado do ar em 11/09; uma cópia ia ao n8n
  (pelo backend do Render), que aceitava, e a tela dizia "sucesso" sem nenhum lead chegar ao funil. A
  cópia para o n8n foi **cortada** por decisão de Apollo em 09/10.
- **O que o OnixTeam faz com o lead** (`TeamPortal/backend/src/lib/landingPages.ts`): card **Pendente**
  na 1ª etapa do **Recrutamento**, **sem responsável** (é a fila do módulo), etiqueta **"LP Lidiane"**,
  mídia pelo `utm_source` (Instagram, Facebook, Google, LinkedIn; senão "Site") e um registro
  **"Landing page"** na linha do tempo com as respostas. Quem **já tem card vivo** em qualquer funil
  (inclusive Retenção) não ganha card novo: o cadastro vira etiqueta + registro no card existente.
  Reenvio da mesma pessoa em até 10 minutos não grava de novo.
- **Empresa, funil, etapa e etiqueta saem do servidor**, não da página. O servidor aceita só a origem
  `https://lidianepinheiro.seuimovel.com.br`, só JSON de até 10 KB, até 8 envios por IP e 120 por LP a
  cada 10 minutos, e tem um campo-isca (`nao_preencher`) para robô.

## Arquivos

| Pasta | O quê |
|---|---|
| `frontend/` | o site estático (Cloudflare Pages, projeto `lp-lidiane`). `config.js` tem o endereço do funil (`ONIX_LEAD_URL`). `_headers` tem cache e cabeçalhos de segurança. O link "Termos e políticas" saiu do rodapé em 09/10 (o domínio `web.seuimovel.com.br`, da GreatPages, está fora do ar e Apollo decidiu não usar). |
| `backend/` | ⚠️ **fora de uso desde 09/10/2026.** Era o backend no Render (`lidiane-landingpage.onrender.com`) que repassava o lead ao n8n. Ficou revisado (CORS de verdade, só os campos do formulário, `trust proxy`), mas a LP não o chama mais — o serviço no Render pode ser desligado. |

## Publicar

- **O projeto `lp-lidiane` NÃO tem Git ligado:** publicar é **upload direto**. No painel da Cloudflare:
  Workers e Pages → `lp-lidiane` → **Criar implantação** → **Produção** → enviar um `.zip` com o conteúdo
  de `frontend/` na raiz (o `tar` do Windows serve: `tar.exe -a -cf lp.zip -C frontend <arquivos>`) →
  **Salvar e implantar**. Push no GitHub não publica nada. A versão anterior volta pelo "Rollback" na lista
  de implantações.
- Ao mudar `script.js`, `style.css` ou `config.js`, **troque o `?v=` no `index.html`** — o `_headers` deixa
  JS e CSS em cache por 1 dia, na Cloudflare e no navegador.
- 🔴 **Não abra a LP no primeiro minuto depois de implantar.** Em 09/10 a conferência feita logo depois do
  upload pegou o domínio ainda servindo a versão anterior: o `config.js` ANTIGO ficou guardado no cache da
  Cloudflare sob a URL NOVA (`?v=…`), por até 1 dia — e o formulário quebraria. Se acontecer: zona
  `seuimovel.com.br` → Caching → Configuração → **Limpeza personalizada** → URL exata do arquivo. Confira
  depois por md5 (`curl` do arquivo × o local).
- **OnixTeam:** a rota pública faz parte do `TeamPortal` e sai na publicação dele (`TeamPortal/README.md`).
  Liberar outra origem (ou outra LP) é configuração no `LANDING_PAGES` daquele arquivo + deploy do módulo.

## Testar sem tocar produção

O formulário real grava no funil de produção. Para validar, use o sandbox do TeamPortal
(`node TeamPortal/deploy/sandbox-funis.mjs` com `LP_ORIGENS_EXTRAS=http://localhost:5510`) e sirva esta
pasta em `http://localhost:5510` com um `config.js` apontando para `http://localhost:4026`. A bateria da
rota está em `TeamPortal/backend/test/lp-publica.mjs` (`npm run test:lp`). Em produção, a prova sem gravar
é um POST `{}` a partir da própria página: tem de voltar 400 com a lista de campos.

## Em aberto (P96 no `Main/PENDENTES.md`)

- O PDF dos e-books no Google Drive é **privado** (pede login) e os três itens apontam para o mesmo
  arquivo — publicado assim por decisão de Apollo; resolver no Drive.
- Não há aviso de LGPD junto do botão.
