import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY, contactLabel } from "@/config/company";
import { openCookiePreferences } from "@/lib/consent";

function Contact() {
  return COMPANY.contactEmail ? (
    <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
  ) : (
    <>{contactLabel()}</>
  );
}

export default function Privacidade() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      description="Como a MedStation coleta, usa, compartilha e protege dados pessoais, em conformidade com a LGPD."
      path="/privacidade"
    >
      <p>
        Esta política explica como a {COMPANY.brand}, operada por {COMPANY.legalName}
        {COMPANY.cnpj ? `, CNPJ ${COMPANY.cnpj}` : ""}
        {COMPANY.address ? `, com sede em ${COMPANY.address}` : ""}, trata dados pessoais de quem visita o site
        e de quem usa a plataforma, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018, "LGPD") e
        do Marco Civil da Internet (Lei 12.965/2014).
      </p>

      <h2>1. Quem é responsável pelos dados</h2>
      <p>Há dois papéis diferentes, e eles mudam o que fazemos com cada tipo de dado:</p>
      <ul>
        <li>
          <strong>Dados da sua conta, cadastro, pagamento e navegação:</strong> {COMPANY.legalName} é a{" "}
          <em>controladora</em>, ou seja, decide como esses dados são tratados.
        </li>
        <li>
          <strong>Dados de pacientes que você insere na plataforma</strong> (nomes, dados clínicos, áudios de
          consulta, documentos): <em>você, médico, é o controlador</em>, e a {COMPANY.brand} atua como{" "}
          <em>operadora</em>, tratando esses dados apenas para executar as funções que você aciona. Cabe ao
          médico ter base legal para tratá-los (em regra, a tutela da saúde prevista no art. 11, II, "f", da
          LGPD) e observar o sigilo profissional.
        </li>
      </ul>
      <p>
        Encarregado pelo tratamento de dados pessoais (DPO): {COMPANY.dpoName}. Contato: <Contact />.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <h3>Quando você visita o site</h3>
      <ul>
        <li>Páginas acessadas, tipo de aparelho e origem da visita (como parâmetros de campanha "utm").</li>
        <li>
          Dados de cookies e tecnologias semelhantes, conforme as categorias que você aceitar (veja a seção 7).
        </li>
      </ul>
      <h3>Quando você se cadastra, testa ou assina</h3>
      <ul>
        <li>E-mail e, quando você informa, nome, telefone/WhatsApp e CRM com UF.</li>
        <li>
          Dados profissionais que você preenche no perfil para emitir documentos: CRM, RQE, especialidade,
          dados do consultório, endereço e timbrado. CPF e data de nascimento só quando você os informa para
          documentos que exigem esses dados.
        </li>
        <li>
          Na campanha para internos: nome, e-mail, WhatsApp, faculdade, período, ano de formatura, cidade e UF,
          usados para verificar elegibilidade e a ordem das vagas.
        </li>
        <li>
          Dados de pagamento: o pagamento é processado pela Stripe. Não recebemos nem armazenamos o número
          completo do seu cartão.
        </li>
      </ul>
      <h3>Quando você usa a plataforma</h3>
      <ul>
        <li>
          Conteúdo que você envia aos assistentes: textos, áudios ditados ou de consulta, arquivos e imagens
          (como exames), e as respostas geradas.
        </li>
        <li>Cadastro de pacientes, prescrições, solicitações de exame, documentos e anotações que você cria.</li>
        <li>
          Dados de segurança: identificador do aparelho (em forma de código, não reversível), datas de acesso e,
          em eventos de segurança, endereço IP.
        </li>
        <li>Registros de uso dos assistentes (qual assistente, quando e volume de uso), para cobrança, limites e
          melhoria do serviço.</li>
      </ul>

      <h2>3. Para que usamos e com qual base legal</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Finalidade</th>
            <th scope="col">Base legal (LGPD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Criar sua conta, liberar o teste, prestar o serviço e dar suporte</td>
            <td>Execução de contrato (art. 7º, V)</td>
          </tr>
          <tr>
            <td>Processar dados de pacientes nas funções que você aciona</td>
            <td>Como operadora, segundo as instruções do médico controlador (art. 39)</td>
          </tr>
          <tr>
            <td>Cobrança, emissão fiscal e guarda de registros exigidos por lei</td>
            <td>Cumprimento de obrigação legal (art. 7º, II)</td>
          </tr>
          <tr>
            <td>Guardar registros de acesso por 6 meses</td>
            <td>Obrigação legal (Marco Civil, art. 15)</td>
          </tr>
          <tr>
            <td>Segurança da conta, verificação de aparelho e prevenção a fraudes</td>
            <td>Legítimo interesse (art. 7º, IX) e proteção do titular</td>
          </tr>
          <tr>
            <td>
              E-mails sobre sua conta e lembretes de cadastro ou compra não concluídos; contagem própria de visitas
              ao site, sem identificar você
            </td>
            <td>Legítimo interesse (art. 7º, IX). Você pode se opor a qualquer momento</td>
          </tr>
          <tr>
            <td>Análise de uso com ferramenta de terceiros (PostHog) e anúncios (Meta Pixel)</td>
            <td>Consentimento (art. 7º, I), revogável a qualquer momento</td>
          </tr>
        </tbody>
      </table>
      <p>
        A {COMPANY.brand} não vende dados pessoais e não usa seus dados nem os de seus pacientes para treinar
        modelos de inteligência artificial próprios.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Compartilhamos dados somente com fornecedores necessários para o serviço funcionar, cada um limitado à
        sua função:
      </p>
      <ul>
        <li>
          <strong>Hospedagem e banco de dados:</strong> Lovable Cloud (infraestrutura Supabase).
        </li>
        <li>
          <strong>Inteligência artificial:</strong> o conteúdo que você envia aos assistentes passa pelo gateway de
          IA da Lovable e é processado por modelos de terceiros, como Google (Gemini) e OpenAI, para gerar a
          resposta.
        </li>
        <li>
          <strong>Transcrição de voz:</strong> ElevenLabs, OpenAI e o serviço de transcrição da Lovable.
        </li>
        <li>
          <strong>Pagamentos:</strong> Stripe.
        </li>
        <li>
          <strong>E-mails transacionais:</strong> serviço de e-mail da Lovable.
        </li>
        <li>
          <strong>Somente com seu consentimento:</strong> PostHog (análise de uso, servidores nos Estados
          Unidos) e Meta Platforms (Meta Pixel, medição de anúncios).
        </li>
        <li>Autoridades públicas, quando houver obrigação legal ou ordem judicial.</li>
      </ul>

      <h2>5. Transferência internacional</h2>
      <p>
        Alguns desses fornecedores processam dados fora do Brasil (por exemplo, Estados Unidos e União
        Europeia). Essas transferências ocorrem para executar o contrato com você e com garantias contratuais de
        proteção, nos termos do art. 33 da LGPD.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados da conta e conteúdo da plataforma: enquanto a conta estiver ativa.</li>
        <li>
          Após o pedido de exclusão ou o encerramento da conta: apagamos ou anonimizamos, exceto o que a lei
          obriga a guardar.
        </li>
        <li>Registros de acesso: pelo menos 6 meses, como exige o Marco Civil da Internet.</li>
        <li>Dados fiscais e de pagamento: pelo prazo exigido pela legislação tributária (em regra, 5 anos).</li>
        <li>Cadastros de interesse que não viraram conta: até você pedir a exclusão ou se opor ao contato.</li>
      </ul>

      <h2 id="cookies">7. Cookies e tecnologias semelhantes</h2>
      <p>
        Usamos cookies e armazenamento local do navegador. No primeiro acesso, você escolhe o que aceita. Só os
        necessários funcionam sem a sua escolha.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            <th scope="col">Para que serve</th>
            <th scope="col">Base</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Necessários</td>
            <td>Manter você conectado, verificar o aparelho, lembrar tema, preferências e sua escolha sobre cookies</td>
            <td>Execução de contrato e legítimo interesse</td>
          </tr>
          <tr>
            <td>Medição própria</td>
            <td>
              Guardar só no seu navegador a origem da visita (campanha) e o botão clicado, para vincular o cadastro à
              campanha. Nada disso é enviado a terceiros
            </td>
            <td>Legítimo interesse; você pode se opor pelo contato do encarregado</td>
          </tr>
          <tr>
            <td>Análise</td>
            <td>Entender como o site e a plataforma são usados (PostHog), sem gravação de tela</td>
            <td>Consentimento</td>
          </tr>
          <tr>
            <td>Marketing</td>
            <td>Medir resultados de anúncios (Meta Pixel)</td>
            <td>Consentimento</td>
          </tr>
        </tbody>
      </table>
      <p>
        Sem consentimento de análise, contamos visitas ao site apenas de forma anônima, sem guardar
        identificador no seu aparelho. Nenhum dado clínico, nome, e-mail, telefone ou CRM é enviado a
        ferramentas de análise ou anúncios.
      </p>
      <p>
        Você pode mudar sua escolha quando quiser:{" "}
        <button type="button" onClick={openCookiePreferences} className="text-primary underline underline-offset-4">
          abrir preferências de cookies
        </button>
        .
      </p>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e administrativas para proteger os dados, como conexão criptografada (HTTPS),
        controle de acesso por conta, regras que restringem cada registro ao seu dono e verificação de aparelho
        no login. Nenhum sistema é totalmente imune a incidentes; se ocorrer um incidente que possa trazer risco
        relevante, comunicaremos os afetados e a ANPD, conforme o art. 48 da LGPD.
      </p>

      <h2>9. Seus direitos</h2>
      <p>Conforme o art. 18 da LGPD, você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
        <li>pedir a portabilidade dos seus dados;</li>
        <li>pedir a eliminação dos dados tratados com base no consentimento e revogar esse consentimento;</li>
        <li>saber com quem compartilhamos seus dados;</li>
        <li>opor-se a tratamentos feitos com base no legítimo interesse;</li>
        <li>apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>
      <p>
        Para exercer seus direitos, fale com o encarregado: <Contact />. Respondemos em até 15 dias. Pedidos
        sobre dados de pacientes devem ser feitos ao médico responsável, que é o controlador; nós o apoiaremos no
        atendimento.
      </p>

      <h2>10. Idade mínima</h2>
      <p>
        A {COMPANY.brand} é destinada a médicos e estudantes de medicina maiores de 18 anos. Não coletamos
        intencionalmente dados de menores como usuários.
      </p>

      <h2>11. Alterações</h2>
      <p>
        Podemos atualizar esta política. Mudanças relevantes serão avisadas no site ou por e-mail, e a data no
        topo indica a versão em vigor. Veja também os <Link to="/termos">Termos de Uso</Link> e a{" "}
        <Link to="/reembolso">Política de Reembolso e Cancelamento</Link>.
      </p>
    </LegalLayout>
  );
}
