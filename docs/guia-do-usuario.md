# Guia do notinhas

Bem-vindo(a) ao **notinhas** — um app de notas em Markdown puro que roda inteiramente no seu
navegador e lê/grava arquivos direto numa pasta do seu computador. Não há nuvem, conta ou
sincronização: seus arquivos continuam sendo arquivos `.md` normais, editáveis por qualquer outro
programa.

## Conectando um workspace

Na primeira vez que você abre o notinhas, é preciso escolher uma pasta local ("workspace") onde
suas notas vão morar. Clique em **Escolher pasta do workspace** e selecione (ou crie) uma pasta
no seletor nativo do navegador.

- Em navegadores com suporte à *File System Access API* (Chrome, Edge, Opera), o app lembra da
  pasta escolhida entre sessões — ao reabrir, só é preciso confirmar a permissão de acesso.
- Em navegadores sem esse suporte (Firefox, Safari), o notinhas usa um armazenamento de sandbox
  do próprio navegador (OPFS) como alternativa — um aviso aparece no topo da tela avisando que,
  nesse modo, os arquivos ficam restritos ao navegador, não numa pasta real do disco.

## Árvore de arquivos

A árvore de arquivos (painel esquerdo) mostra todas as suas notas e pastas. A extensão `.md` não
é exibida — "Ideias" na árvore é o arquivo `Ideias.md` no disco.

- **Nova nota** / **Nova pasta**: botões no topo do painel, ou atalhos de teclado `n` (nota) e
  `Shift+N` (pasta) com um item da árvore focado. O novo item nasce dentro da pasta focada, se
  ela estiver expandida — senão nasce como irmã do item focado.
- **Navegar**: setas ↑/↓ movem o foco; → expande uma pasta (ou move pro próximo item, se já
  estiver expandida); ← colapsa uma pasta expandida (ou move o foco pra pasta-mãe).
- **Abrir uma nota**: `Enter` sobre um arquivo focado (veja "Abas de notas" abaixo).
- **Renomear ou mover**: `F2`, ou clique direito → "Renomear/Mover" — o campo mostra o caminho
  completo, então digitar um caminho em outra pasta move o item.
- **Excluir**: tecla `Delete`, ou clique direito → "Excluir" — pede confirmação, já que apaga o
  arquivo (ou a pasta inteira, recursivamente) do disco de verdade.
- **Arrastar e soltar**: também dá pra reorganizar notas/pastas arrastando um item sobre outro
  (mouse apenas — o atalho `F2` já cobre o mesmo resultado por teclado).

## Abas de notas

Cada nota aberta (pela árvore, pelo Daily Desk, pela paleta de comandos, pela busca, pelas tags,
pelos backlinks ou por um `[[link]]`) ganha sua própria aba na tira acima do editor. Só uma fica
visível por vez.

- **Trocar de aba**: clique numa aba, ou foque a tira de abas (`Tab` até chegar nela) e use
  ←/→ para mover o cursor entre as abas e `Enter`/`Espaço` para ativar a aba focada.
- **Fechar uma aba**: clique no ✕ que aparece ao passar o mouse, ou tecla `Delete`/`Backspace`
  com a aba focada. Fechar uma aba não apaga o arquivo — é só um estado de tela.

## Editor de notas

O editor é WYSIWYG (o que você vê é o que vai pro Markdown): formatação aparece renderizada
enquanto você digita, e o autosave grava um `.md` puro no disco (~300ms depois de parar de
digitar).

- **Formatação pela barra de ferramentas**: desfazer/refazer, títulos H1–H3, negrito, itálico,
  tachado, código inline, listas com marcadores/numerada/de tarefas, citação, bloco de código,
  inserir tabela — todos os botões são alcançáveis e operáveis só por teclado.
- **Buscar dentro da nota**: `Mod+F` (⌘F no Mac, Ctrl+F no Windows/Linux) abre uma barra de busca
  com contador de resultados e navegação anterior/próximo.
- **Tags**: escreva `#alguma-tag` em qualquer lugar do texto — vira uma tag automaticamente
  (não funciona dentro de um heading `# Título` nem dentro de um bloco de código).
- **Links entre notas**: digite `[[` para abrir um autocomplete com sugestões de notas
  existentes; escolha uma para inserir um `[[link]]`. Um link resolvido (aponta pra uma nota que
  existe) fica sublinhado e clicável — clique ou `Mod+Enter` com o cursor sobre ele navega até a
  nota. Um link pra uma nota inexistente aparece tracejado, sem navegação.
- **Propriedades**: o painel direito (aba "Propriedades") mostra data de criação/atualização
  (carimbadas automaticamente a cada salvamento) e permite adicionar/editar/remover pares
  chave-valor customizados — tudo isso vira frontmatter YAML no topo do arquivo.
- **Backlinks**: o painel direito (aba "Backlinks") lista quais outras notas linkam pra nota
  atual via `[[link]]`.

## Daily Desk

Ícone de calendário no cabeçalho (ou atalho `Mod+J`) abre o Daily Desk: um calendário para
navegar entre notas diárias, seguindo a convenção de arquivo `Daily/AAAA-MM-DD.md` (essa pasta
fica escondida da árvore de arquivos comum, já que a navegação por data é feita por aqui).

- Selecionar um dia abre a nota diária correspondente, criando-a automaticamente se ainda não
  existir.
- Dias com nota já criada aparecem marcados no calendário; passar o mouse/foco por um dia
  marcado mostra uma prévia com a contagem de tarefas pendentes.
- Ao criar a nota diária de **hoje**, qualquer tarefa não concluída (`- [ ] ...`) deixada na nota
  diária anterior mais recente é migrada automaticamente pra nota de hoje.
- Navegação inteiramente por teclado: setas movem entre dias, `Enter` seleciona.

## Paleta de comandos

`Mod+K` (ou o ícone de lupa "Abrir paleta de comandos" no cabeçalho) abre a paleta:

- Digite o nome de uma nota existente para ir até ela.
- Se o texto digitado não corresponder a nenhuma nota, aparece a opção "Criar nota" com esse
  nome.
- Digite uma data (ex.: "hoje", "ontem", "próxima sexta", `20/07/2026`) para a opção "Ir para
  data" aparecer — abre/cria a nota diária correspondente, usando o mesmo parser (`chrono-node`,
  em português) do Daily Desk.
- "Ir para Daily Desk" e "Buscar em notas" também estão disponíveis como itens da paleta.
- "Alternar tema" troca entre claro/escuro sem sair da paleta.

## Busca full-text

`Mod+Shift+F` (ou o ícone de lupa "Buscar em todas as notas" no cabeçalho) abre uma busca que
varre título **e** conteúdo de todas as notas (incluindo notas diárias). Resultados com match no
título aparecem primeiro; setas navegam a lista, `Enter` abre a nota selecionada.

## Tags e organização

O painel esquerdo tem uma aba "Tags" (ao lado de "Arquivos") listando todas as `#tag` usadas no
workspace, com contagem de notas por tag. Selecionar uma tag filtra a lista para as notas que a
usam; `Escape` volta pra lista de tags.

## Atalhos de teclado — resumo

| Atalho             | Ação                              |
| ------------------- | ---------------------------------- |
| `Mod+K`             | Abrir paleta de comandos            |
| `Mod+Shift+F`       | Buscar em todas as notas            |
| `Mod+J`             | Abrir Daily Desk                    |
| `Mod+F`             | Buscar dentro da nota aberta        |
| `Mod+Enter`         | Seguir o `[[link]]` sob o cursor    |
| `n` / `Shift+N`     | Nova nota / nova pasta (árvore)     |
| `F2`                | Renomear/mover item focado (árvore) |
| `Delete`            | Excluir item focado (árvore)        |
| `Delete`/`Backspace`| Fechar aba de nota focada           |

`Mod` é `⌘` no macOS e `Ctrl` no Windows/Linux.

## Tema

O botão de sol/lua no cabeçalho alterna entre tema claro e escuro; a preferência fica salva no
navegador entre sessões.

## Sobre sincronização e privacidade

O notinhas é **local-first**: nada é enviado a nenhum servidor. Não há sincronização entre
dispositivos (Git Sync é um recurso considerado só para depois do MVP) nem recursos de IA. Para
saber sobre uma edição feita em outro programa enquanto o notinhas está aberto, é preciso
recarregar a página ou trocar de aba do navegador e voltar — o navegador não permite observar
mudanças no disco em tempo real.
