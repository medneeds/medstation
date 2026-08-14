# Numerus — Calculadoras interativas de beira de leito

O Numerus passa a ter duas abas no topo: **Calculadoras** e **Chat**. O chat atual continua exatamente igual; as calculadoras são uma nova tela, com cálculo feito no próprio navegador (instantâneo, sem IA, sem risco de variação).

## Como funciona na prática

Um único campo de **Peso (kg)** no topo, fixo enquanto rola a página. Todo cálculo da tela reage a ele na hora.

Cada calculadora é um cartão com:
- Faixa de dose recomendada (mín–máx) e a dose atual em destaque
- Um slider grande para varrer a dose; o mL/h muda em tempo real com animação suave do número
- A frase de prescrição pronta ("Noradrenalina (4 mg/4 mL) 4 mL + 96 mL SG 5% EV — 33 mL/h"), com botão copiar
- Marcadores de dose usual / dose alta no trilho do slider, mudando de cor conforme entra em faixa alta
- Diluições fixas já validadas (simples / concentrada), escolhidas por pílulas

Busca no topo para filtrar calculadoras pelo nome e navegação por categorias. Tudo otimizado para mobile (slider com área de toque maior, cartões empilhados) sem alterar o layout desktop.

## Calculadoras incluídas

Infusões contínuas (peso-dependentes, com slider):
- Drogas vasoativas: noradrenalina (simples e concentrada), adrenalina, vasopressina, dobutamina, dopamina, nitroglicerina, nitroprussiato
- Sedação contínua: midazolam, propofol, fentanil, dexmedetomidina, cetamina
- Bloqueio neuromuscular contínuo: rocurônio, cisatracúrio, succinilcolina (bolus)
- Heparinização venosa: bolus + manutenção UI/kg/h e ajuste por TTPa
- Controle glicêmico intensivo: insulina regular EV em bomba, com tabela de ajuste por glicemia

Protocolos por passos:
- Intubação orotraqueal (sequência rápida): pré-medicação, indução (etomidato, cetamina, propofol, midazolam), bloqueio (succinilcolina, rocurônio) e drogas de resgate — tudo em mg e mL já calculados pelo peso, com checklist de material e cânula
- Hidantalização: ataque 20 mg/kg, velocidade máxima de infusão, tempo estimado, dose de reforço e manutenção
- Hiponatremia: déficit de sódio, meta de correção segura (limite de 8–10 mEq/L em 24 h), velocidade de NaCl 3% e alerta de mielinólise
- Hipernatremia: déficit de água livre, velocidade de correção e volume por hora
- Cetoacidose diabética: hidratação, insulina EV, reposição de potássio por faixa, critérios de virada para SG
- Correção de eletrólitos: potássio, magnésio, cálcio e bicarbonato
- Ventilação e medidas corporais: peso predito, volume corrente 6/8 mL/kg, IMC, superfície corporal, clearance de creatinina
- Antibióticos com ajuste renal: doses por peso e por função renal para os principais antimicrobianos de UTI/emergência

## Segurança

Cada cartão traz faixa de referência e alertas quando a dose passa do usual. Rodapé fixo com o aviso de que os valores são apoio ao cálculo e a decisão final é do médico assistente.

## Técnico

- `src/lib/numerus/` — catálogo de calculadoras em dados (fórmulas puras + metadados de faixa, diluições, unidades) e funções de cálculo testáveis
- `src/components/numerus/CalculatorPanel.tsx` — grade de cartões, busca e campo de peso compartilhado
- `src/components/numerus/InfusionCard.tsx` — cartão de infusão com slider, número animado e copiar
- `src/components/numerus/ProtocolCard.tsx` — cartão de protocolo em passos (IOT, hidantalização, sódio, CAD, eletrólitos)
- `src/pages/Numerus.tsx` — abas Calculadoras / Chat, mantendo `AgentChat` intacto
- Testes unitários das fórmulas críticas (vasoativas, sódio, heparina, insulina) em `src/lib/numerus/__tests__`
- Sem mudanças em backend, banco ou nos demais assistentes
