// HydraHub — como conseguir a cópia certa do jogo, por console.
// O app nunca manda link de download: aqui só tem o caminho legal (tirar da sua própria cópia)
// e como conferir se o arquivo que a pessoa tem é exatamente o que o projeto pede.
// Textos em HTML fixo (sem dado de fora), usados na página do jogo.

const CART = {
  aparelho: 'Um leitor de cartucho USB: <b>Sanni Cart Reader</b> (open source, lê quase tudo), <b>Retrode 2</b> (com adaptador) ou, pra Game Boy, <b>GB Operator</b> / <b>GBxCart RW</b>.',
  passos: [
    'Encaixe o <b>seu cartucho</b> no leitor e ligue no PC pelo USB.',
    'Abra o programa do leitor e escolha <b>Dump ROM</b> (ou "Ler cartucho"). Ele salva um arquivo no PC.',
    'Repare no rótulo do cartucho e na caixa: lá diz a região (USA, Europa/PAL, Japão). A ficha acima diz qual região o jogo aceita.',
    'Se o projeto pede um nome de arquivo exato, renomeie (ou deixe o HydraHub fazer isso no Jogar).',
  ],
  conferir: 'Use o botão <b>Conferir minha ROM</b> (quando o projeto publica o hash) ou compare o SHA-1 com o banco <b>No-Intro</b> (datomatic.no-intro.org), que lista o nome exato de cada revisão, ex.: "Super Mario 64 (USA)".',
};
const ext = (e) => ({ ...CART, formato: e });

export const COPY_GUIDE = {
  n64: { ...ext('.z64 (também .n64/.v64, que o HydraHub converte)'), extra: 'Cartuchos com <b>Rev 1</b> ou "Player\'s Choice" às vezes são outra revisão: confira o hash.' },
  snes: { ...ext('.sfc / .smc'), extra: 'Arquivos .smc às vezes têm um cabeçalho extra de 512 bytes que muda o hash. Se não bater, tente remover o cabeçalho.' },
  nes: ext('.nes'),
  'game-boy': ext('.gb'),
  'game-boy-color': ext('.gbc'),
  'game-boy-advance': ext('.gba'),
  'virtual-boy': ext('.vb'),
  genesis: ext('.md / .bin / .gen'),
  '32x': ext('.32x'),
  'master-system': ext('.sms'),
  'game-gear': ext('.gg'),
  ps1: {
    aparelho: 'Um PC com leitor de CD/DVD e o programa gratuito <b>ImgBurn</b>.',
    passos: [
      'Coloque o <b>seu disco</b> no leitor do PC.',
      'No ImgBurn, clique em <b>Create image file from disc</b> e escolha onde salvar. Sai um par de arquivos <code>.bin</code> + <code>.cue</code> (o .cue é o "índice" do disco; mantenha os dois juntos).',
      'O código na lombada/disco diz a região: <code>SLUS-</code>/<code>SCUS-</code> = EUA, <code>SLES-</code>/<code>SCES-</code> = Europa, <code>SLPS-</code>/<code>SCPS-</code> = Japão.',
      'Jogos com vários discos: faça um dump de cada disco.',
    ],
    conferir: 'Compare o hash do .bin com o banco <b>Redump</b> (redump.org), que mostra o código do disco e a versão exata de cada lançamento.',
  },
  ps2: {
    aparelho: 'Um PC com leitor de DVD e o <b>ImgBurn</b> (ou um PS2 desbloqueado com OPL, que copia o disco pro HD/USB).',
    passos: [
      'Coloque o <b>seu disco</b> no leitor do PC.',
      'No ImgBurn, <b>Create image file from disc</b> → salva um <code>.iso</code>.',
      'O código no disco diz a região: <code>SLUS-</code>/<code>SCUS-</code> = EUA, <code>SLES-</code>/<code>SCES-</code> = Europa, <code>SLPM-</code>/<code>SCPS-</code> = Japão. Relançamentos "Greatest Hits"/"Platinum" podem ser outra versão.',
    ],
    conferir: 'Compare o hash do .iso com o <b>Redump</b> (redump.org).',
  },
  ps3: {
    aparelho: 'Um PS3 desbloqueado (CFW ou PS3HEN) com <b>multiMAN</b> ou <b>IRISMAN</b>, ou um leitor de Blu-ray compatível no PC.',
    passos: [
      'Com o <b>seu disco</b> no console, use o multiMAN/IRISMAN pra copiar o jogo pro HD interno ou um HD externo (sai uma pasta com <code>PS3_GAME</code> dentro).',
      'Se o projeto pede uma <b>atualização</b> específica, baixe o update no próprio console (pela PSN) e copie também a pasta <code>dev_hdd0/game/&lt;ID do jogo&gt;</code>.',
      'Passe tudo pro PC por FTP (o multiMAN tem servidor FTP; use o FileZilla no PC).',
      'O ID do jogo diz a região: <code>BLUS</code>/<code>BCUS</code>/<code>NPUB</code> = EUA, <code>BLES</code>/<code>BCES</code>/<code>NPEB</code> = Europa, <code>BLJM</code>/<code>BCJS</code> = Japão.',
    ],
    conferir: 'A versão instalada aparece no XMB: selecione o jogo → triângulo → <b>Informações</b>.',
  },
  ps4: {
    aparelho: 'Um PS4 com firmware desbloqueável e o <b>GoldHEN</b> ativo, mais um HD/pendrive USB formatado em exFAT.',
    passos: [
      'Instale o jogo pelo <b>seu disco</b> ou da sua conta da PSN no console.',
      'Baixe no próprio console a <b>atualização exata</b> que a ficha pede (a versão aparece em: jogo → Options → <b>Informações</b>). Se o console instalou uma versão mais nova que a pedida, o projeto pode recusar.',
      'Abra o dumper (o <b>Game Dumper</b> do GoldHEN ou o <b>Itemzflow</b>) e faça o dump do jogo base <b>e</b> da atualização pro USB. No Itemzflow existe a opção de juntar base + atualização numa pasta só.',
      'No PC, a pasta sai com o nome do ID do jogo (ex.: <code>CUSA00900</code>) e o <code>eboot.bin</code> já descriptografado pelo dumper.',
      'O ID diz a região: <code>CUSA</code> com número de EUA ou Europa (confira na ficha), <code>PLJM</code>/<code>PCJS</code> = Japão.',
    ],
    conferir: 'Dentro da pasta, o arquivo <code>sce_sys/param.sfo</code> guarda o ID (TITLE_ID) e a versão (APP_VER). Programas como o "PS4 PKG Tool" ou "SFO Editor" mostram esses valores: eles têm que bater com a ficha.',
  },
  psp: {
    aparelho: 'Um PSP desbloqueado (CFW ou ARK-4) e o cabo USB.',
    passos: [
      'Com o <b>seu UMD</b> no PSP, abra o menu do CFW (botão Select) → <b>USB Device: UMD Disc</b>.',
      'Ligue o USB no PC: aparece um arquivo <code>.iso</code> do disco. Copie pro PC.',
      'Jogos comprados na PSN ficam em <code>PSP/GAME</code> no cartão de memória.',
      'O ID diz a região: <code>ULUS</code>/<code>UCUS</code> = EUA, <code>ULES</code>/<code>UCES</code> = Europa, <code>ULJM</code>/<code>UCJS</code> = Japão.',
    ],
    conferir: 'Compare o hash do .iso com o <b>Redump</b> (redump.org).',
  },
  gamecube: {
    aparelho: 'Um Wii (com entrada de GameCube) desbloqueado com o Homebrew Channel e o <b>CleanRip</b>, mais um pendrive ou cartão SD.',
    passos: [
      'Abra o CleanRip pelo Homebrew Channel e escolha salvar no pendrive/SD.',
      'Coloque o <b>seu disco</b> quando ele pedir. Ele cria um <code>.iso</code> e confere o resultado no banco Redump na hora.',
      'O ID de 6 letras do disco diz a região pela 4ª letra: <b>E</b> = EUA, <b>P</b> = Europa, <b>J</b> = Japão (ex.: <code>GALE01</code> = Smash Melee EUA).',
    ],
    conferir: 'O CleanRip mostra se o dump bateu com o Redump. No PC, o Dolphin mostra o ID do jogo e a revisão (botão direito → Propriedades).',
  },
  wii: {
    aparelho: 'Um Wii desbloqueado com o Homebrew Channel e o <b>CleanRip</b>, mais um pendrive ou cartão SD.',
    passos: [
      'Abra o CleanRip pelo Homebrew Channel e escolha salvar no pendrive/SD (pendrive em FAT32 divide o arquivo em partes; o CleanRip avisa).',
      'Coloque o <b>seu disco</b>. Ele cria o <code>.iso</code> e confere com o Redump.',
      'Se quiser, converta pra <code>.rvz</code> no Dolphin (botão direito → Converter) pra ocupar menos, se o projeto aceitar.',
      'O ID de 6 letras diz a região pela 4ª letra: <b>E</b> = EUA, <b>P</b> = Europa, <b>J</b> = Japão (ex.: <code>RMCP01</code> = Mario Kart Wii europeu).',
    ],
    conferir: 'No Dolphin, o jogo mostra o ID de 6 letras e a revisão: tem que bater com a ficha.',
  },
  'wii-u': {
    aparelho: 'Um Wii U desbloqueado (Aroma ou Tiramisu) com o <b>Dumpling</b>, mais um cartão SD ou HD USB.',
    passos: [
      'Abra o Dumpling e escolha <b>Dump a game</b>. Marque o jogo base, a <b>atualização</b> e as DLCs, se o projeto pedir.',
      'Ele salva pastas com <code>code</code>, <code>content</code> e <code>meta</code>. Copie pro PC.',
    ],
    conferir: 'No Cemu, a lista de jogos mostra a versão da atualização instalada e a região.',
  },
  ds: {
    aparelho: 'Um 3DS desbloqueado (Luma3DS) com o <b>GodMode9</b>.',
    passos: [
      'Coloque o <b>seu cartucho</b> de DS no 3DS e abra o GodMode9.',
      'Entre em <code>[C:] GAMECART</code> e copie o arquivo <code>.nds</code> pro cartão SD (pasta <code>gm9/out</code>).',
    ],
    conferir: 'Compare o SHA-1 com o banco <b>No-Intro</b>; o código no cartucho (ex.: <code>NTR-AMCE-USA</code>) mostra a região.',
  },
  '3ds': {
    aparelho: 'Um 3DS desbloqueado (Luma3DS) com o <b>GodMode9</b>.',
    passos: [
      'Cartucho: no GodMode9 entre em <code>[C:] GAMECART</code> e copie o <code>.3ds</code> (ou gere um <code>.cia</code>).',
      'Jogo instalado e <b>atualização</b>: no GodMode9, abra o título instalado e use <b>Build CIA from file</b> pro jogo e pro update.',
      'Os arquivos saem em <code>gm9/out</code> no cartão SD.',
    ],
    conferir: 'O código no cartucho (ex.: <code>CTR-P-AREE</code>) mostra a região; a versão da atualização aparece no menu do 3DS (Gerenciamento de dados).',
  },
  switch: {
    aparelho: 'Um Switch que roda custom firmware (Atmosphère) com o <b>nxdumptool</b>, e o <b>Lockpick_RCM</b> pras chaves do seu console.',
    passos: [
      'Rode o Lockpick_RCM uma vez: ele salva o <code>prod.keys</code> do <b>seu</b> console (muitos projetos pedem esse arquivo).',
      'Cartucho: no nxdumptool, <b>Dump gamecard content</b> → gera um <code>.xci</code>.',
      'Jogo da eShop e <b>atualização</b>: <b>Dump installed SD card / eMMC content</b> → gera um <code>.nsp</code> do jogo base e outro da atualização.',
      'Se o projeto pede uma versão específica, confira antes de dumpar: o nxdumptool mostra a versão de cada update.',
    ],
    conferir: 'O nxdumptool mostra o Title ID e a versão (ex.: <code>v1.2.0</code>). No console: jogo → + → <b>Atualização de software</b> mostra a versão.',
  },
  'xbox-360': {
    aparelho: 'Um Xbox 360 desbloqueado (RGH ou JTAG) com o <b>Aurora</b> ou <b>XeXMenu</b>, e o FileZilla no PC. Alguns projetos aceitam também o <code>.iso</code> do disco.',
    passos: [
      'Disco: no Aurora/XeXMenu, copie o <b>seu disco</b> pro HD do console (ou faça um .iso, se o projeto aceitar ISO).',
      'Jogo de Arcade/loja digital: ele fica em <code>Content/0000000000000000/&lt;Title ID&gt;/000D0000</code>.',
      '<b>Atualização (Title Update, "TU")</b>: fica em <code>.../&lt;Title ID&gt;/000B0000</code>. Se a ficha pede um TU específico, é esse arquivo.',
      'DLCs ficam em <code>.../&lt;Title ID&gt;/00000002</code>.',
      'Passe tudo pro PC pelo FTP do Aurora (FileZilla, usuário e senha <code>xboxftp</code>). O instalador do projeto (ex.: Unleashed Recompiled) pede essas pastas/arquivos e avisa o que falta.',
    ],
    conferir: 'O Aurora mostra o Title ID (8 caracteres, ex.: <code>4D5307E6</code>) e qual TU está ativo. O ID tem que bater com a ficha.',
  },
  xbox: {
    aparelho: 'Um Xbox clássico desbloqueado (softmod) com dashboard alternativa e FTP.',
    passos: [
      'Copie o <b>seu disco</b> pro HD do console pela dashboard (ex.: "Copy DVD to HDD").',
      'Passe a pasta do jogo (com o <code>default.xbe</code>) pro PC por FTP.',
    ],
    conferir: 'O título e a região aparecem nas propriedades do <code>default.xbe</code> (programas como xbeexplorer).',
  },
  dreamcast: {
    aparelho: 'Um Dreamcast com adaptador de cartão SD e um programa homebrew de dump (ex.: SD Rip).',
    passos: [
      'Rode o programa de dump e coloque o <b>seu GD-ROM</b>. Ele grava um <code>.gdi</code> + faixas no cartão SD.',
      'O código no disco diz a região: <code>T-</code>/<code>MK-</code> com sufixo <code>N</code> = EUA, <code>50</code> = Europa, <code>HDR-</code> = Japão.',
    ],
    conferir: 'Compare as faixas com o <b>Redump</b> (redump.org).',
  },
  saturn: {
    aparelho: 'Um PC com leitor de CD e o <b>ImgBurn</b>.',
    passos: ['No ImgBurn, <b>Create image file from disc</b> com o <b>seu disco</b> → <code>.bin</code> + <code>.cue</code>.'],
    conferir: 'Compare com o <b>Redump</b> (redump.org).',
  },
  arcade: {
    aparelho: 'ROMs de arcade são o conteúdo dos chips da placa original. O caminho legal é ter a placa (ou um relançamento oficial que traga as ROMs, como coletâneas da Capcom/SNK/Arcade1Up).',
    passos: [
      'O projeto pede um <b>romset de uma versão específica do MAME</b> (a ficha diz qual, quando o README informa). ROMs de outra versão do MAME costumam ter nomes/arquivos diferentes.',
      'Coletâneas oficiais de PC às vezes trazem as ROMs dentro da pasta do jogo (Steam → Procurar arquivos locais).',
    ],
    conferir: 'O <b>ClrMamePro</b> ou o próprio MAME (<code>mame -verifyroms nome</code>) diz se o seu zip está completo e na versão certa.',
  },
  pc: {
    aparelho: 'O jogo de PC original comprado (Steam, GOG, EA/Ubisoft, ou o CD/DVD antigo).',
    passos: [
      'Instale o jogo normalmente pela loja onde você comprou.',
      '<b>Steam:</b> botão direito no jogo → Gerenciar → <b>Procurar arquivos locais</b>. <b>GOG Galaxy:</b> jogo → Gerenciar instalação → <b>Mostrar pasta</b>.',
      'Se a ficha pede uma <b>versão</b> específica (ex.: 1.0, GOTY, versão da GOG), confira a versão nas propriedades do .exe (botão direito → Propriedades → Detalhes). Na Steam, versões antigas às vezes ficam em Propriedades → <b>Betas</b>.',
      'CD/DVD antigo: copie o conteúdo do disco pra uma pasta, ou crie um .iso com o ImgBurn.',
      'Copie os arquivos que a ficha pede (ex.: <code>.pak</code>, <code>.dat</code>, <code>.wad</code>) pra pasta indicada em "Como usar".',
    ],
    conferir: 'Compare o nome e o tamanho dos arquivos com o que o README do projeto lista; quando ele traz hash, o botão Conferir minha ROM serve pra qualquer arquivo.',
  },
  dos: {
    aparelho: 'O jogo original (disquete/CD antigo ou a versão vendida hoje na GOG/Steam, que já traz os arquivos do DOS).',
    passos: [
      'GOG/Steam: abra a pasta do jogo (Steam → Gerenciar → Procurar arquivos locais; GOG → Gerenciar instalação → Mostrar pasta). Os arquivos de dados do DOS ficam ali dentro (às vezes numa subpasta ou dentro de um <code>.gog</code>/<code>.ins</code>, que é um .iso renomeado).',
      'Disquete/CD: copie o conteúdo pra uma pasta no PC.',
      'Copie os arquivos que a ficha pede (ex.: <code>.wad</code>, <code>.dat</code>, <code>.grp</code>) pra pasta indicada em "Como usar".',
    ],
    conferir: 'Versões (shareware x completa, 1.0 x 1.9) mudam os arquivos: compare nome, tamanho e hash com o README do projeto.',
  },
};
COPY_GUIDE.mac = COPY_GUIDE.pc;

export const COPY_FALLBACK = {
  aparelho: 'O jogo original que você tem (cartucho, disco ou versão digital) e o equipamento de dump adequado ao console.',
  passos: [
    'Faça o dump da <b>sua</b> cópia com uma ferramenta do próprio console ou um leitor ligado no PC.',
    'Confira a região e a versão no rótulo/caixa ou no menu do console: elas têm que bater com a ficha acima.',
  ],
  conferir: 'Compare o hash com os bancos <b>No-Intro</b> (cartuchos) ou <b>Redump</b> (discos).',
};
