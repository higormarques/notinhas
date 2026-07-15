# Análise do Octarine

**Fonte:** [docs.octarine.app/getting-started/meet-octarine](https://docs.octarine.app/getting-started/meet-octarine)
**Data da análise:** 2026-07-15

Octarine é um app de notas/PKM (personal knowledge management) com abordagem **local-first**, construído sobre arquivos Markdown, com editor WYSIWYG, sistema de journaling diário vinculado a um calendário, sincronização via Git e recursos opcionais de IA. Disponível para Desktop e iOS.

Esta análise foca nas quatro características pedidas: armazenamento 100% local, arquivos em Markdown, sync com GitHub e notas vinculadas ao calendário — com a edição WYSIWYG como quinto ponto por ser o "motor" que conecta tudo isso.

---

## 1. Projeto com arquivos totalmente locais

- As notas vivem em uma pasta de **workspace no sistema de arquivos do dispositivo** — não em um servidor proprietário na nuvem. O workspace pode estar em um disco local ou dentro de uma pasta sincronizada por serviços de terceiros (iCloud, Dropbox, OneDrive, Syncthing).
- **"Sem bloqueio em nuvem, sem assinatura necessária para recursos principais"** — a proposta de valor central é a portabilidade e a ausência de vendor lock-in.
- Existem dois níveis de armazenamento:
  - **`.store.dat`** (JSON): config global do app — workspaces, temas, preferências do editor, licença Pro, credenciais de IA. Fica **sempre local**, nunca sincronizado.
  - **IndexedDB**: cache de performance (estrutura de pastas, metadados, notas fixadas/bloqueadas, histórico de chat) — não é a fonte de verdade, apenas um índice.
- O app monitora o filesystem em tempo real, então edições feitas por fora (outro editor, sync de terceiros, script) são refletidas instantaneamente.

**Avaliação:** é um local-first "de verdade" — os arquivos no disco são a fonte da verdade, não um cache de uma cópia remota. Isso é bem diferente de apps que dizem ter "modo offline" mas ainda dependem de um servidor central para o estado canônico.

---

## 2. Arquivos em Markdown

- Notas são salvas como **Markdown puro em plain text**, com extensão de arquivo padrão — nada de formato binário ou proprietário.
- Consequência direta do ponto acima: qualquer editor de texto externo (VS Code, Obsidian, vim etc.) consegue abrir e editar os mesmos arquivos sem conversão.
- Isso também facilita versionamento com Git (ponto 3) e portabilidade para outras ferramentas caso o usuário decida migrar.

**Avaliação:** Markdown simples é a escolha "segura" para retenção de dados a longo prazo — reduz o risco de lock-in mesmo que o app pare de ser mantido.

---

## 3. Sync com GitHub (Git Sync)

- Recurso de **backup/versionamento via Git**, sincronizando o workspace com um repositório GitHub (ou GitLab).
- **Importante:** a documentação é explícita que isso é um _"backup service rather than real-time synchronization"_ — ou seja, roda em intervalos configuráveis em background, não é sync instantâneo/bidirecional no sentido de ferramentas como Google Docs.
- **Configuração:**
  - Manual: criar repo vazio, colar URL SSH em `Settings → Git Sync`.
  - Automática: se a pasta já for um clone Git, detecta o remote existente.
- **Resolução de conflitos:** automática, com preferência configurável (`Settings → Git Sync → Conflict Resolution`) — favorecer mudanças remotas ou manter as locais. Sem merge manual.
- **Requisitos:** Git instalado localmente, SSH configurado, passphrase salva para automação funcionar sem prompts.
- **Limitações a observar:**
  - Anexos/arquivos/templates podem ser opcionalmente excluídos do sync.
  - Auto-sync se desativa após 3 falhas consecutivas (exige atenção manual).
  - Ainda em beta segundo a doc, recomenda-se repositório vazio.
  - Não ficou claro se é um recurso do plano gratuito ou exclusivo do Pro.

**Avaliação:** é mais "backup versionado" do que "sync em tempo real multi-dispositivo". Para quem já usa Git no dia a dia isso é natural e dá histórico de versões de graça, mas quem espera sync instantâneo tipo Notion/iCloud pode se frustrar — a resolução de conflito é "última gaveta vence" (local ou remoto), não um merge inteligente.

---

## 4. Notas vinculadas aos dias do calendário (Daily Desk)

- Sistema dedicado de **journaling baseado em calendário**, separado das notas regulares — pensado para começar o dia com um espaço de tarefas, notas e captura rápida.
- **Estrutura de arquivos previsível** (por ser tudo Markdown):
  - `Daily/YYYY-MM-DD.md` para notas diárias
  - `Daily/Weekly/YYYY-W<n>.md` para notas semanais
- **Navegação:**
  - Clique direto no calendário (cria a nota se não existir)
  - Atalhos de teclado / setas com o calendário em foco
  - Indicador visual (ponto sob o número do dia) mostra quais dias já têm nota, com preview no hover
  - **Smart Dates**: `Cmd/Ctrl+K` → "Go to Date" aceita linguagem natural ("ontem", "próxima sexta", "15 de março")
- **Produtividade:** contador de tarefas por nota diária e **migração automática de tarefas incompletas** entre dias/períodos (padrão comum em apps de journaling tipo Logseq/Obsidian Tasks, mas nativo aqui).

**Avaliação:** o fato de a nota diária ser só mais um arquivo Markdown com nome previsível (`YYYY-MM-DD.md`) é elegante — permite automação/scripts externos sem precisar da API do app. A migração automática de tarefas é o tipo de feature que costuma ser plugin em outras ferramentas (Obsidian) e aqui vem nativa.

---

## 5. Edição WYSIWYG

- Construído sobre **Tiptap + ProseMirror**. Ponto-chave da doc: _"stores data as markdown in content, but it isn't a markdown editor"_ — ou seja, o dado salvo em disco é Markdown, mas a interface nunca mostra a sintaxe crua.
- Experiência = processador de texto moderno ("simplesmente clique e comece a digitar"), sem painel de preview separado — evita a sensação "jumpy" de editores Markdown tradicionais com preview lado a lado.
- Formatação suportada: tabelas, blocos de código com syntax highlighting (70+ linguagens), LaTeX, anotações de vídeo, diagramas Mermaid, cabeçalhos com fontes customizáveis, seções recolhíveis, imagens via drag-and-drop.
- Auto-save contínuo.
- Atalhos: `Cmd/Ctrl+Z/Shift+Z` (undo/redo), `Cmd/Ctrl+F` (buscar), `Shift+Enter` (quebra de linha), `Enter` (novo parágrafo).

**Avaliação:** essa combinação — edição WYSIWYG por cima, Markdown puro por baixo — é o ponto de maior atrito técnico do produto e, ao mesmo tempo, o maior diferencial: resolve a dor clássica de "eu quero Markdown para portabilidade, mas não quero ver `**` e `##` enquanto escrevo". Ferramentas como Obsidian oferecem um modo WYSIWYG parcial; Notion é WYSIWYG mas não é Markdown puro em disco. Octarine tenta ficar no meio-termo dos dois mundos.

---

## Outras características relevantes (contexto)

Não eram foco do pedido, mas ajudam a situar o produto:

- **Organização:** doclinks (links entre notas), árvore de arquivos com ícones/ordenação, tags, propriedades de notas, tipos de nota, views customizáveis.
- **Busca:** full-text search em todo o workspace.
- **IA opcional:** integrações com Codex, Ollama e LM Studio (ambos rodando local), "Ask Octarine" para consulta contextual, resumo semanal por IA, escrita assistida.
- **Backup alternativo:** além do Git Sync, suporta viver dentro de pastas do Dropbox/OneDrive/iCloud/Syncthing.
- **Plataformas:** Desktop e iOS, com URI scheme para integração com outros fluxos de automação (captura rápida via atalhos do SO, por exemplo).

---

## Síntese

| Feature        | Nível de maturidade (pela doc) | Ponto forte                                                          | Ponto de atenção                                                                                          |
| -------------- | ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Local-first    | Sólido / core do produto       | Sem lock-in, dado é o arquivo                                        | —                                                                                                         |
| Markdown puro  | Sólido                         | Compatível com qualquer editor externo                               | —                                                                                                         |
| Git Sync       | Beta                           | Versionamento "de graça" via Git                                     | Não é real-time; resolução de conflito é binária (local vence ou remoto vence); auto-desativa após falhas |
| Daily Desk     | Sólido                         | Nomenclatura de arquivo previsível, smart dates, migração de tarefas | —                                                                                                         |
| Editor WYSIWYG | Sólido (Tiptap/ProseMirror)    | Sem painel de preview separado, formatação rica                      | Curva pequena de confiança para quem gosta de ver a sintaxe Markdown crua                                 |

Em conjunto, essas quatro features formam uma proposta coerente: notas como arquivos Markdown que você realmente possui, editadas de forma amigável (WYSIWYG), organizadas por um sistema de journaling diário nativo, com Git como rede de segurança de versionamento — tudo sem depender de um backend proprietário para funcionar.
