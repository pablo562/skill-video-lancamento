# Acabamento premium (framework Apple)

Fonte: artigo "Make your product videos look expensive (Apple Framework)", de @leomeethewoo (https://x.com/leomeethewoo/status/2103529310208606701). A equipe do autor produziu mais de 50 vídeos de produto. Abaixo, cada ideia do artigo resumida e como aplicar neste pipeline.

## 1. Intenção em tudo (a base de todo o resto)

- Nada é feito por acaso. Fonte, fundo, música e cores precisam de um motivo. Para o público, parece que foi decidido que tinha que ser assim.
- Parecer premium também é deixar de fazer o que barateia: efeitos demais, som que não precisa estar ali, rap.
- Regras fixas por marca e por tipo de vídeo: 3 cores para o mesmo tipo de vídeo, a mesma família de fundos, música parecida para o mesmo tipo de projeto.

**Como aplicar**
- Antes do roteiro, preencha o kit da marca no projeto: `marca.css` com 3 cores (fundo claro, fundo escuro, destaque) e um par de fontes, `marca.js` com nome, site e logo. Escolha também uma família de fundo (liso, pontilhado, brilho radial) e o estilo e o BPM da trilha. Tudo o que entra no vídeo sai desse kit.
- Escolha o registro antes de animar:
  - **Divertido** (marca jovem, varejo, criadores): adesivos com recorte branco, tranco forte, confete, mascote.
  - **Premium** (saúde, finanças, B2B, institucional): pílulas no lugar de adesivos, tranco pequeno ou nenhum, faíscas discretas no lugar de confete, menos efeitos sonoros.
- O nível de trabalho (tomadas variadas, transições com ideia) vale para os dois registros. A quantidade de efeitos, não.

## 2. Design primeiro

- Todo vídeo bom começa num design bom. A Apple segue o mesmo guia visual de vídeo para vídeo, e a equipe do autor desenha o storyboard quadro a quadro antes de animar.
- Os princípios:
  - uma tomada = uma ideia;
  - toda cena tem espaço para respirar;
  - o objeto principal fica no centro do quadro;
  - o fundo segue o guia e nunca disputa com o objeto principal.

**Como aplicar**
- Monte cada tomada primeiro no quadro de repouso, o instante em que tudo já entrou e nada se move. Confira com `--previa` antes de escrever as entradas e as transições. Se o quadro parado não fica bonito, a animação não salva.
- Na folha de contato, passe por quatro perguntas:
  1. Tem uma ideia por quadro?
  2. Tem respiro (margem, espaço vazio)?
  3. O objeto principal está no centro?
  4. Algo no fundo compete com ele (faixa, brilho, granulado forte)?
- Nada importante nos cantos. Além de sair da zona segura do Reels e do TikTok, sai do centro de atenção.

## 3. Animação

- **Suavidade:** todo movimento com easing e com as chaves sobrepostas, ou seja, um elemento começa antes de o anterior terminar. Movimento linear parece barato.
- **Transições dinâmicas:** quando uma cena passa para a outra de forma contínua, a gente sente que ela pertence ali. Corte seco só quando a mensagem pede.
- **Ritmo adaptável:** o vídeo acelera, desacelera ou mantém o passo conforme a parte.

**Como aplicar**
- `M.E.lin` só em movimento contínuo: faixa correndo, rotação lenta, contador. Entrada e saída sempre com `outCubic`, `outBack`, `inOutCubic` ou `inOutSine`.
- Entradas em grupo com defasagem de 0,05 a 0,1 s (`palavras()` em `tecnicas.md`).
- Transições que ligam as cenas por um objeto (código em `tecnicas.md`):
  - o botão que vira a próxima cena (círculo saindo do botão);
  - o objeto que encolhe e vira a logo no mesmo lugar;
  - o card que cresce até virar a tela do celular;
  - a notificação que gira no eixo X e vira o pedido da cena seguinte;
  - o ponto final de uma frase que vira portal para a próxima cena.
- O corte seco fica para depois de um respiro ou para um impacto.
- Ritmo que muda:
  - rajadas e listas rápidas, uma batida por item;
  - a mensagem principal devagar, meio compasso por linha;
  - número grande com 2 s.

  Não deixe o vídeo inteiro no mesmo passo.

## 4. Música

- A trilha controla a energia do vídeo, inclusive a sensação de caro.
- Tabela de BPM do autor:

| BPM | Sensação |
|---|---|
| 60 a 80 | Régio, cinematográfico, tradição |
| 90 a 110 | Suave, tranquilo, sem esforço |
| 115 a 123 | Elite, cinético, sofisticado |
| Acima de 123 | Pressão e hype; serve a alguns projetos e destrói outros |

- Depois do BPM, escolha o gênero pelo público.

**Como aplicar**

O que se viu na prática com este pipeline bate com a tabela:

| Tipo de vídeo | Estilo e BPM | Resultado |
|---|---|---|
| Institucional, apresentação de serviço | House a 118-120 | Aprovado |
| Vitrine de produtos novos | Lo-fi a 90 | Aprovado |
| Institucional em trap | Trap a 140 | Recusado: rápido demais para ler e com cara de hype |
| Lançamento de marca nova | 128 | Hype, de propósito |

- Vídeo premium ou institucional: fique entre 115 e 123.
- Vídeo cinematográfico (marca, manifesto): teste 70 a 80 BPM com `S.pad` longo e `S.sub`, sem bateria no começo.
- Na dúvida entre duas trilhas, entregue as duas sobre a mesma imagem: mesmo BPM, e o ffmpeg troca o áudio com `-c:v copy`, sem novo render.

## 5. Desenho de som

- É o acabamento do vídeo. Vale a mesma lógica do item 1: evite efeitos que chamam atenção para si mesmos.
- No fim, ouça tudo e pergunte o que soa estranho. Efeito alto demais, fora do lugar ou que não ajuda a entender o produto sai.

**Como aplicar**
- Cada efeito no `trilha.js` precisa de um motivo visível na tela: um toque, um objeto que bate, uma troca de cena. Efeito sem motivo sai.
- Densidade: conte os efeitos por trecho no `trilha.js` e compare com os picos da `onda.png`. Em trecho premium, no máximo um efeito de destaque por batida, e pops e cliques com ganho baixo (0,2 a 0,4).
- Se quem monta o vídeo não puder ouvir (um agente, por exemplo), liste os efeitos de cada trecho na entrega e peça para alguém ouvir procurando o que está alto ou fora do lugar.
