# Roteiro

## Estrutura padrão (36 s, 120 BPM, 18 compassos)

| Cena | Tempo | Função | Exemplo |
|---|---|---|---|
| 1. Gancho | 0 a 4 s | Uma imagem ou frase que cria curiosidade, sem falar do produto ainda | Um rabisco que vira estampa: "Toda marca começa com um rabisco." |
| 2. Título | 4 a 8 s | Círculo na cor de destaque toma a tela, nome cai letra por letra, selo "Nova", frase do que é | "Apresentando Agenda", "Sua semana num lugar só." |
| 3. Demonstração | 8 a 22 s | 3 ou 4 batidas de produto de verdade, cada uma com uma legenda | Digitar o endereço, abrir a tela, arrastar, publicar com confete |
| 4. Consequência | 22 a 28 s | O que acontece depois: venda, cliente, pedido, resultado | Notificação de pedido, contador subindo, status "Entregue" |
| 5. Rajada | 28 a 32 s | 8 recursos, um por batida, fundo alternando destaque, escuro e claro | Um recurso por batida, com ícone |
| 6. Fechamento | 32 a 36 s | Nome, frase final, logo, site e uma retomada do gancho; escurece | Logo, "Comece hoje.", site |

O `modelo/` junta 3 e 4 numa demonstração só (8 a 28 s). Para 30 s, corte a cena 4 e encurte a demonstração; para 40 s, dê mais uma batida à demonstração. Mude `T.dur` e mantenha os cortes em múltiplos da batida. A trilha acompanha pelo `tempos.js`.

Vídeo sem narração pode ir a 45 a 50 s. Ritmo que dá para ler: cada frase ou adesivo com pelo menos 1 s sozinho na tela, número grande com pelo menos 2 s, cena com muitos passos (produção, entrega) com 6 a 8 s.

## Como escrever

- **Gancho:** concreto e visual, nunca slogan. Um objeto que se transforma funciona melhor que uma frase sozinha.
- **Uma ideia por batida da demonstração.** Cada batida tem uma ação visível (digitar, clicar, arrastar, trocar) e uma legenda de 3 a 6 palavras que nomeia o benefício, com uma palavra em `[destaque]`.
- **Mostre, não afirme.** Se a novidade é rápida, mostre o antes e o depois no tempo do vídeo; não escreva "é rápido".
- **Rajada:** só recursos que existem hoje, nomeados como aparecem no produto. Ícones em `motor/icones.js`.
- **Fechamento:** o nome, uma frase que fica na cabeça, o logo e o site. Retome algo do gancho.
- **Tom:** o da marca com o cliente dela. Humor leve e concreto (uma marca fictícia com mascote, estampa que vira carimbo, confete no "tá no ar") funciona melhor que adjetivo.

## Regras de copy

- Promete só o que existe. Número em copy só entra se ajuda a decidir e se tem fonte.
- Marca, cliente e pedido de exemplo são fictícios. Nunca use nome, loja ou dado de cliente real.
- Frase curta, no vocabulário do produto (o nome do botão como está na tela).

## Checagem de fatos antes de renderizar

Monte uma lista com cada afirmação do vídeo e a fonte:

| Afirmação | Onde conferir |
|---|---|
| Nome de tela, botão, recurso | O código do produto ou o próprio produto no ar |
| Número (prazo, preço, quantidade) | A página pública da marca (landing, FAQ, planos) |
| Está no ar ou ainda em desenvolvimento | Quem cuida do produto; o que não está no ar sai do vídeo |
| Recurso de plano pago | A página de planos; diga no vídeo ("a partir do plano X") ou tire |

Na entrega, liste o que ficou incerto para a pessoa confirmar antes de publicar.
