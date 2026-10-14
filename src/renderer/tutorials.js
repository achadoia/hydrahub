// Tutoriais do HydraHub (pt-BR). Imagens e vídeos vêm do catálogo vivo,
// então se atualizam junto com ele.
import { icon } from './icons.js';

const yt = (v) => (v ? `<div class="video" data-yt="${v.youtubeId}">
  <div class="poster-btn" style="background-image:url(https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg)">
    <div class="play">${icon('play')}</div>
    <div class="vt">${esc(v.title || 'Vídeo')}<small>${esc(v.author || 'YouTube')}</small></div>
  </div></div>` : '');
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shots = (games, n = 3) => {
  const imgs = games.flatMap((g) => g?.screenshots?.slice(0, 2) || []).slice(0, n);
  return imgs.length ? `<div class="shots">${imgs.map((u) => `<img src="${u}" loading="lazy" alt="">`).join('')}</div>` : '';
};
const callout = (kind, title, text) => `<div class="callout ${kind}">${icon(kind === 'warn' ? 'alert' : 'info')}<p><b>${title}</b> ${text}</p></div>`;
const ext = (url, label) => `<a href="${url}" data-ext>${label} ${icon('external', 'style="width:13px;height:13px;vertical-align:-2px"')}</a>`;
const gameLink = (g, label) => (g ? `<a href="#/jogo/${g.id}">${label || esc(g.title)}</a>` : esc(label || ''));

export const TUTORIALS = [
  {
    id: 'o-que-e-recomp',
    title: 'O que é um jogo recompilado (e por que ele roda melhor)',
    summary: 'Recompilação, decompilação, port e emulação: entenda a diferença em 5 minutos.',
    level: 'Básico', minutes: 5, icon: 'chip', cover: ['star-fox-64', 'sonic-unleashed'],
    body: ({ g }) => {
      const mm = g('legend-zelda-majoras-mask'), su = g('sonic-unleashed'), oot = g('legend-zelda-ocarina-time');
      return `
      <p class="lead">Um recomp é o jogo original transformado em um programa nativo de PC. Ele não "finge" ser o console como um emulador: o código do jogo é traduzido para rodar direto no seu processador.</p>
      <h2><span class="num">1</span> As quatro formas de jogar um clássico no PC</h2>
      <table class="t">
        <tr><th>Forma</th><th>Como funciona</th><th>Exemplo</th></tr>
        <tr><td><b>Recompilação estática</b></td><td>Uma ferramenta lê o código de máquina do jogo (MIPS do N64, PowerPC do Xbox 360…) e o converte em código C, que é compilado para PC.</td><td>${gameLink(mm, 'Zelda 64: Recompiled')}, ${gameLink(su, 'Unleashed Recompiled')}</td></tr>
        <tr><td><b>Decompilação</b></td><td>Pessoas reescrevem o jogo em C até ele gerar exatamente o mesmo binário. Depois disso, dá pra criar ports nativos.</td><td>${gameLink(oot, 'Ship of Harkinian')} (Ocarina of Time)</td></tr>
        <tr><td><b>Port / source port</b></td><td>Um motor reescrito ou liberado que roda o jogo com os arquivos originais.</td><td>OpenRA, re3, Perfect Dark port</td></tr>
        <tr><td><b>Emulação</b></td><td>Um programa imita o hardware do console inteiro. Funciona com quase tudo, mas gasta mais e tem menos recursos extras.</td><td>RetroArch, Dolphin, PCSX2</td></tr>
      </table>
      ${shots([mm, su, oot])}
      <h2><span class="num">2</span> O que você ganha com um recomp</h2>
      <ul class="steps">
        <li><b>Desempenho nativo:</b> 60, 120 ou 240 FPS e baixa latência, sem precisar de um PC forte.</li>
        <li><b>Widescreen e ultrawide de verdade</b>, sem esticar a imagem.</li>
        <li><b>Mods:</b> vários recomps têm um sistema próprio de mods e pacotes de textura.</li>
        <li><b>Controle e configurações modernas:</b> remapear botões, giroscópio, modo de qualidade, Steam Deck.</li>
      </ul>
      ${callout('', 'Importante:', 'quase todo recomp ou port <b>não inclui o jogo</b>. O projeto entrega só o "motor"; você fornece a sua cópia (ROM ou arquivos do disco). Isso mantém o projeto legal e é por isso que o HydraHub nunca baixa ROMs.')}
      ${yt(mm?.videos?.[0])}
      <h2><span class="num">3</span> E os ports de navegador?</h2>
      <p>Alguns jogos foram compilados para WebAssembly e rodam numa aba do navegador. No HydraHub eles aparecem com o selo <span class="tag cyan">${icon('browser')} Navegador</span>. Basta clicar em <b>Jogar no navegador</b>.</p>
      <p>Quer se aprofundar? Os guias do ${ext('https://allrecomps.com/guides/what-is-a-recompilation/', 'AllRecomps')} e o ${ext('https://github.com/N64Recomp/N64Recomp', 'repositório do N64Recomp')} explicam a técnica em detalhes.</p>`;
    },
  },
  {
    id: 'primeiro-recomp',
    title: 'Instalando seu primeiro recomp pelo HydraHub',
    summary: 'Do clique em Instalar até jogar: passo a passo usando Zelda: Majora\'s Mask como exemplo.',
    level: 'Básico', minutes: 6, icon: 'download', cover: ['legend-zelda-majoras-mask'],
    body: ({ g }) => {
      const mm = g('legend-zelda-majoras-mask');
      return `
      <p class="lead">O HydraHub baixa direto da página oficial do projeto no GitHub, extrai e cria o atalho de jogar. Você só precisa ter a sua cópia do jogo.</p>
      ${shots([mm])}
      <h2><span class="num">1</span> Encontre o jogo</h2>
      <ul class="steps">
        <li>Abra <a href="#/jogos">Jogos Recompilados</a> ou use a busca no topo (<code>Ctrl K</code>).</li>
        <li>Os jogos com o selo <span class="tag cyan">${icon('download')} Instalar</span> têm download direto. Os com <span class="tag">${icon('browser')} Navegador</span> rodam numa aba.</li>
        <li>Abra a página do jogo, por exemplo ${gameLink(mm, "The Legend of Zelda: Majora's Mask")}.</li>
      </ul>
      <h2><span class="num">2</span> Instale</h2>
      <ul class="steps">
        <li>Clique em <b>Instalar</b>. O HydraHub consulta a última versão no GitHub e escolhe o arquivo do seu sistema (Windows, Linux ou macOS).</li>
        <li>Acompanhe o progresso no botão de downloads (${icon('download', 'style="width:14px;height:14px;vertical-align:-2px"')}) do topo.</li>
        <li>Quando terminar, o jogo vai para <code>Documentos\\HydraHub\\Jogos</code> (dá pra mudar em <a href="#/config">Configurações</a>).</li>
      </ul>
      <h2><span class="num">3</span> Jogue</h2>
      <ul class="steps">
        <li>Clique em <b>Jogar</b>. Na primeira vez, o recomp pede a ROM: aponte para o arquivo da sua cópia (veja <a href="#/tutorial/dump-rom">como fazer o dump</a>).</li>
        <li>Confira a região/versão pedida na página do jogo. O Majora's Mask, por exemplo, aceita só a versão norte-americana.</li>
        <li>Se o Windows mostrar "O Windows protegeu o computador", clique em <b>Mais informações → Executar assim mesmo</b>. Projetos novos ainda não têm assinatura digital.</li>
      </ul>
      ${callout('', 'Atualizações:', 'quando sair versão nova, o botão vira <b>Atualizar</b>. Seus saves ficam guardados; mesmo assim, faça backup da pasta antes de atualizar.')}
      ${yt(mm?.videos?.[0])}`;
    },
  },
  {
    id: 'dump-rom',
    title: 'Como fazer o dump legal do seu cartucho ou disco',
    summary: 'Cart readers, GB Operator, ImgBurn e CleanRip: como tirar a ROM do jogo que você tem.',
    level: 'Intermediário', minutes: 8, icon: 'cartridge', cover: ['banjo-kazooie', 'super-mario-64'],
    body: ({ g }) => `
      <p class="lead">Recomps pedem a <b>sua</b> cópia do jogo. Fazer o dump do seu próprio cartucho ou disco é o caminho correto, e o HydraHub não fornece ROMs.</p>
      ${callout('warn', 'Atenção:', 'baixar ROM de site de terceiros é pirataria na maioria dos países. Além disso, arquivos de origem duvidosa costumam ser de outra região ou estar corrompidos, e aí o recomp não aceita.')}
      <h2><span class="num">1</span> Cartuchos (N64, SNES, Game Boy, GBA)</h2>
      <table class="t">
        <tr><th>Console</th><th>Aparelho</th><th>Observação</th></tr>
        <tr><td>Nintendo 64</td><td>${ext('https://github.com/sanni/cartreader', 'Sanni Cart Reader')} (open source) ou Retrode 2 + adaptador N64</td><td>Gera <code>.z64</code>. Também salva o save do cartucho.</td></tr>
        <tr><td>Game Boy / GBC / GBA</td><td>GB Operator ou GBxCart RW</td><td>Plug-and-play pelo USB, com programa próprio.</td></tr>
        <tr><td>SNES / Mega Drive</td><td>Sanni Cart Reader ou Retrode 2</td><td>Cuidado com cartuchos com chip especial (SA-1, Super FX).</td></tr>
      </table>
      ${shots([g('banjo-kazooie'), g('super-mario-64')])}
      <h2><span class="num">2</span> Discos (PS1, PS2, GameCube, Wii, Xbox 360)</h2>
      <ul class="steps">
        <li><b>PS1 / PS2:</b> num PC com leitor de DVD, use o ${ext('https://www.imgburn.com/', 'ImgBurn')} em <i>Create image file from disc</i>. PS1 sai em <code>.bin/.cue</code>, PS2 em <code>.iso</code>.</li>
        <li><b>GameCube / Wii:</b> num Wii desbloqueado, o ${ext('https://github.com/emukidid/cleanrip', 'CleanRip')} copia o disco para um pendrive/SD.</li>
        <li><b>Xbox 360:</b> recomps como o Unleashed Recompiled pedem os arquivos do jogo (e DLCs) extraídos do seu console ou disco. Siga o instalador do projeto, que ele mostra o que falta.</li>
      </ul>
      <h2><span class="num">3</span> Confira se o dump está certo</h2>
      <ul class="steps">
        <li>Compare o hash (SHA-1/MD5) do arquivo com os bancos ${ext('https://datomatic.no-intro.org/', 'No-Intro')} (cartuchos) e ${ext('http://redump.org/', 'Redump')} (discos).</li>
        <li>No N64, a ordem de bytes muda conforme a extensão: <code>.z64</code> (padrão), <code>.v64</code> e <code>.n64</code>. Vários recomps convertem sozinhos; se não converter, use uma ferramenta como o Tool64.</li>
        <li>Veja na página de cada jogo a <b>região exata</b> exigida (NTSC-U, PAL, JP).</li>
      </ul>`,
  },
  {
    id: 'requisitos',
    title: 'Requisitos e preparação do PC',
    summary: 'Placa de vídeo, Vulkan/DX12, Visual C++ e drivers: deixe tudo pronto antes de jogar.',
    level: 'Básico', minutes: 4, icon: 'wrench', cover: ['sonic-unleashed'],
    body: ({ g }) => `
      <p class="lead">A maioria dos recomps roda em PCs modestos, mas precisa de alguns componentes instalados.</p>
      <h2><span class="num">1</span> Mínimo recomendado</h2>
      <table class="t">
        <tr><th>Item</th><th>Requisito comum</th></tr>
        <tr><td>Sistema</td><td>Windows 10/11 64 bits, Linux (x86-64) ou macOS recente</td></tr>
        <tr><td>Placa de vídeo</td><td>Suporte a <b>Direct3D 12</b> ou <b>Vulkan 1.2</b> (praticamente qualquer GPU de 2016 pra cá)</td></tr>
        <tr><td>Processador</td><td>x86-64 com <b>SSE4.1</b> (qualquer CPU dos últimos 12 anos)</td></tr>
        <tr><td>Bibliotecas</td><td>Microsoft Visual C++ Redistributable 2015–2022 (x64)</td></tr>
      </table>
      <h2><span class="num">2</span> Instale o que falta</h2>
      <ul class="steps">
        <li>Baixe o ${ext('https://aka.ms/vs/17/release/vc_redist.x64.exe', 'Visual C++ Redistributable x64')} (resolve erros de <code>MSVCP140.dll</code> e <code>VCRUNTIME140.dll</code>).</li>
        <li>Atualize o driver de vídeo: ${ext('https://www.amd.com/pt/support/download/drivers.html', 'AMD')}, ${ext('https://www.nvidia.com/pt-br/drivers/', 'NVIDIA')} ou ${ext('https://www.intel.com.br/content/www/br/pt/download-center/home.html', 'Intel')}.</li>
        <li>Alguns ports pedem .NET ou bibliotecas próprias. Leia o passo a passo na página do jogo.</li>
      </ul>
      ${callout('', 'Dica:', 'se o jogo abrir com tela preta, troque a API de vídeo nas configurações dele (Vulkan ↔ D3D12). Isso resolve a maioria dos casos.')}
      ${shots([g('sonic-unleashed')], 3)}`,
  },
  {
    id: 'mods',
    title: 'Instalando mods e pacotes de textura',
    summary: 'Como os recomps carregam mods e onde encontrar os melhores.',
    level: 'Intermediário', minutes: 5, icon: 'puzzle', cover: ['mario-kart-64', 'legend-zelda-majoras-mask'],
    body: ({ g }) => {
      const mm = g('legend-zelda-majoras-mask');
      return `
      <p class="lead">Um dos grandes atrativos dos recomps é o suporte nativo a mods, de melhorias de câmera a modelos novos.</p>
      <h2><span class="num">1</span> Recomps do N64 (Zelda, Banjo, Star Fox…)</h2>
      <ul class="steps">
        <li>Baixe o mod (arquivo <code>.nrm</code> ou <code>.zip</code>).</li>
        <li>Abra o jogo pelo HydraHub e, <b>antes de iniciar uma partida</b>, arraste o arquivo para a janela, ou use <b>Install Mods</b> no menu de mods.</li>
        <li>Ative/desative cada mod no próprio menu. Pacotes de textura HD funcionam do mesmo jeito.</li>
      </ul>
      ${yt(mm?.videos?.find((v) => /mod/i.test(v.title)) || mm?.videos?.[1])}
      <h2><span class="num">2</span> Onde achar mods</h2>
      <ul class="steps">
        <li>${ext('https://thunderstore.io/c/zelda-64-recompiled/', 'Thunderstore: Zelda 64 Recompiled')}, a maior coleção de mods de recomps do N64.</li>
        <li>Página de releases e Discord de cada projeto (links na página do jogo, em <b>Links do projeto</b>).</li>
      </ul>
      ${callout('warn', 'Cuidado:', 'mods rodam código no seu PC. Prefira os que têm código aberto ou muitas avaliações, e baixe de fontes conhecidas.')}`;
    },
  },
  {
    id: 'steam-deck',
    title: 'Recomps no Steam Deck e no Linux',
    summary: 'Build Linux, Modo Desktop e "Adicionar à Steam" pra jogar no modo Jogo.',
    level: 'Intermediário', minutes: 5, icon: 'deck', cover: ['legend-zelda-ocarina-time'],
    body: ({ g }) => `
      <p class="lead">Quase todos os recomps têm build nativa para Linux, e o Steam Deck roda muito bem.</p>
      <h2><span class="num">1</span> Instalando</h2>
      <ul class="steps">
        <li>No Steam Deck, entre no <b>Modo Desktop</b> (botão Steam → Ligar/Desligar → Modo Desktop).</li>
        <li>Baixe a build <b>Linux</b> do jogo (o HydraHub escolhe sozinho quando roda no Linux) e extraia numa pasta fixa.</li>
        <li>Se o arquivo for <code>.AppImage</code>, clique com o direito → Propriedades → Permissões → <b>Permitir executar</b>.</li>
        <li>Alguns recomps também estão no Flathub; procure pelo nome no app <b>Discover</b>.</li>
      </ul>
      <h2><span class="num">2</span> Jogando no Modo Jogo</h2>
      <ul class="steps">
        <li>Clique com o direito no executável → <b>Add to Steam</b>.</li>
        <li>Volte ao Modo Jogo: o recomp aparece em <i>Não Steam</i> na biblioteca.</li>
        <li>Use a capa da página do jogo no HydraHub (botão direito → salvar) para deixar a biblioteca bonita.</li>
      </ul>
      ${shots([g('legend-zelda-ocarina-time')])}`,
  },
  {
    id: 'problemas',
    title: 'Problemas comuns e como resolver',
    summary: 'SmartScreen, antivírus, DLL faltando, ROM recusada, tela preta e limite do GitHub.',
    level: 'Básico', minutes: 6, icon: 'alert', cover: ['perfect-dark', 'diablo'],
    body: () => `
      <table class="t">
        <tr><th>Problema</th><th>Solução</th></tr>
        <tr><td>"O Windows protegeu o computador"</td><td>Clique em <b>Mais informações → Executar assim mesmo</b>. Acontece com programas sem assinatura paga.</td></tr>
        <tr><td>Antivírus apagou o .exe</td><td>Recomps às vezes geram falso positivo. Confirme que baixou do GitHub oficial (o HydraHub sempre baixa de lá) e adicione a pasta às exceções.</td></tr>
        <tr><td>Erro de <code>MSVCP140.dll</code> / <code>VCRUNTIME140.dll</code></td><td>Instale o <a href="#/tutorial/requisitos">Visual C++ Redistributable</a>.</td></tr>
        <tr><td>"ROM inválida" / não aceita o arquivo</td><td>Região ou versão errada. Veja a exigida na página do jogo e confira o hash (<a href="#/tutorial/dump-rom">guia de dump</a>).</td></tr>
        <tr><td>Tela preta ou travando</td><td>Atualize o driver de vídeo e troque Vulkan ↔ D3D12 nas configurações do jogo.</td></tr>
        <tr><td>HydraHub diz "limite do GitHub"</td><td>Sem login, o GitHub libera 60 consultas por hora. Crie um token sem permissões e cole em <a href="#/config">Configurações</a>.</td></tr>
        <tr><td>Botão Jogar não abre nada</td><td>Na página do jogo, use <b>Escolher executável</b> e aponte o .exe certo.</td></tr>
      </table>
      ${callout('', 'Ainda com problema?', 'abra uma issue no repositório do projeto (link na página do jogo) com a versão, o sistema e o erro.')}`,
  },
  {
    id: 'navegador',
    title: 'Jogando direto no navegador',
    summary: 'Ports em WebAssembly que rodam numa aba, sem instalar nada.',
    level: 'Básico', minutes: 3, icon: 'browser', cover: ['diablo', 'quake-3-arena'],
    body: ({ games }) => {
      const web = games.filter((x) => x.kinds?.includes('browser')).slice(0, 6);
      return `
      <p class="lead">Vários clássicos foram compilados para WebAssembly e rodam numa aba do navegador, inclusive no celular.</p>
      <ul class="steps">
        <li>No catálogo, filtre por <span class="tag">${icon('browser')} Navegador</span>.</li>
        <li>Na página do jogo, clique em <b>Jogar no navegador</b>. O jogo abre no seu navegador padrão.</li>
        <li>Alguns pedem que você carregue seus arquivos do jogo; outros são versões shareware/demo liberadas.</li>
      </ul>
      ${callout('warn', 'Segurança:', 'um port de navegador roda na aba. Desconfie de qualquer página que peça para instalar launcher ou instalador.')}
      <h3>Alguns pra começar</h3>
      <div class="link-list">${web.map((x) => `<a href="#/jogo/${x.id}">${icon('play')}<span>${esc(x.title)}</span></a>`).join('')}</div>`;
    },
  },
];

export function tutorialCover(t, g) {
  for (const id of t.cover || []) {
    const game = g(id);
    const img = game?.backdrop || game?.screenshots?.[0] || game?.cover;
    if (img) return img;
  }
  return null;
}
