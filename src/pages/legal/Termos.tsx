import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY, contactLabel } from "@/config/company";

function Contact() {
  return COMPANY.contactEmail ? (
    <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>
  ) : (
    <>{contactLabel()}</>
  );
}

export default function Termos() {
  return (
    <LegalLayout
      title="Termos de Uso"
      description="Regras de uso da MedStation: conta, assinatura, responsabilidades e limites da inteligência artificial."
      path="/termos"
    >
      <p>
        Estes Termos regulam o uso da {COMPANY.brand}, plataforma oferecida por {COMPANY.legalName}
        {COMPANY.cnpj ? `, CNPJ ${COMPANY.cnpj}` : ""}
        {COMPANY.address ? `, com sede em ${COMPANY.address}` : ""} ("nós"). Ao criar uma conta, iniciar um
        teste ou assinar, você declara que leu e concorda com estes Termos e com a{" "}
        <Link to="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. O que é a MedStation</h2>
      <p>
        A {COMPANY.brand} é um software de apoio à produtividade médica, com assistentes de inteligência
        artificial para documentação clínica, consulta a referências, cálculos e organização da rotina. Ela é
        uma ferramenta de apoio: <strong>não presta serviço médico, não faz diagnóstico e não substitui o
        julgamento clínico do profissional</strong>.
      </p>

      <h2>2. Quem pode usar</h2>
      <ul>
        <li>Médicos com registro ativo no CRM e estudantes de medicina, maiores de 18 anos.</li>
        <li>Você deve informar dados verdadeiros e mantê-los atualizados.</li>
        <li>
          A conta é pessoal e intransferível. Por segurança, ela admite um acesso ativo por vez e pode pedir
          verificação ao entrar por um aparelho novo.
        </li>
        <li>Você é responsável por manter sua senha e seu e-mail em segurança.</li>
      </ul>

      <h2>3. Uso de inteligência artificial e responsabilidade clínica</h2>
      <ul>
        <li>
          As respostas são geradas por modelos de inteligência artificial e <strong>podem conter erros,
          omissões ou informações desatualizadas</strong>, inclusive em doses, interações, códigos e escores.
        </li>
        <li>
          Todo conteúdo gerado deve ser revisado pelo médico antes de qualquer uso. A decisão clínica, a
          prescrição, os documentos emitidos e a conduta com o paciente são de responsabilidade exclusiva do
          médico, conforme o Código de Ética Médica.
        </li>
        <li>
          Não use a plataforma em situações em que a demora na revisão humana possa causar dano ao paciente sem
          que você esteja em condições de conferir o resultado.
        </li>
      </ul>

      <h2>4. Dados de pacientes</h2>
      <p>
        Ao inserir dados de pacientes, você é o controlador desses dados e declara ter base legal para
        tratá-los, observando a LGPD e o sigilo profissional. Nós atuamos como operadores, tratando esses dados
        somente para executar as funções que você aciona, conforme a{" "}
        <Link to="/privacidade">Política de Privacidade</Link>. Insira apenas os dados necessários para a
        tarefa.
      </p>

      <h2>5. Teste grátis, planos e pagamento</h2>
      <ul>
        <li>
          O teste grátis dura 7 dias, não exige cartão e não vira cobrança automaticamente. Ao fim do teste, o
          acesso pago depende de você assinar.
        </li>
        <li>
          Os planos, preços e condições vigentes são os exibidos na página de assinatura no momento da compra.
          Preços promocionais valem apenas no período indicado na oferta.
        </li>
        <li>
          <strong>Plano mensal:</strong> assinatura que renova automaticamente a cada mês, pelo mesmo meio de
          pagamento, até que você cancele. Antes de alterar o preço de uma assinatura ativa, avisaremos com
          antecedência.
        </li>
        <li>
          <strong>Plano anual e ofertas anuais:</strong> pagamento único no cartão de crédito
          que dá acesso por 12 meses, <strong>sem renovação automática</strong>. Ao fim do período, você escolhe
          se quer contratar de novo.
        </li>
        <li>O pagamento é processado pela Stripe, nos meios exibidos no momento da compra.</li>
      </ul>

      <h2>6. Cancelamento e reembolso</h2>
      <p>
        Você pode cancelar o plano mensal quando quiser, pela área de assinatura da conta. O direito de arrependimento de 7
        dias e as regras de reembolso estão na{" "}
        <Link to="/reembolso">Política de Reembolso e Cancelamento</Link>.
      </p>

      <h2>7. Uso proibido</h2>
      <p>Não é permitido:</p>
      <ul>
        <li>compartilhar a conta, revender o acesso ou permitir o uso por terceiros;</li>
        <li>usar a plataforma para fins ilícitos ou contrários à ética médica;</li>
        <li>
          tentar acessar dados de outros usuários, burlar limites, fazer engenharia reversa ou extrair conteúdo
          em massa por meios automatizados;
        </li>
        <li>enviar conteúdo malicioso ou que viole direitos de terceiros.</li>
      </ul>
      <p>
        O descumprimento pode levar à suspensão ou ao encerramento da conta, após aviso quando possível.
      </p>

      <h2>8. Propriedade intelectual</h2>
      <p>
        A plataforma, a marca, os textos e o software da {COMPANY.brand} pertencem a {COMPANY.legalName}. O
        conteúdo que você insere continua seu, e os documentos gerados para você podem ser usados livremente
        na sua prática profissional.
      </p>

      <h2>9. Disponibilidade</h2>
      <p>
        Trabalhamos para manter a plataforma disponível, mas ela pode passar por manutenções, falhas de
        fornecedores ou interrupções. Não garantimos funcionamento ininterrupto. Mantenha meios alternativos
        para registrar sua prática.
      </p>

      <h2>10. Responsabilidade</h2>
      <p>
        Respondemos pelos danos que causarmos nos termos da lei, incluindo o Código de Defesa do Consumidor
        quando aplicável. Não respondemos por decisões clínicas tomadas sem a revisão médica prevista no item 3,
        nem por falhas causadas por uso em desacordo com estes Termos.
      </p>

      <h2>11. Alterações dos Termos</h2>
      <p>
        Podemos atualizar estes Termos. Mudanças relevantes serão avisadas com antecedência no site ou por
        e-mail. Se não concordar, você pode cancelar a assinatura.
      </p>

      <h2>12. Contato e foro</h2>
      <p>
        Dúvidas e solicitações: <Contact />. Suporte por WhatsApp:{" "}
        <a href={COMPANY.supportWhatsappUrl} target="_blank" rel="noopener noreferrer">
          {COMPANY.supportWhatsapp}
        </a>
        . Fica eleito o foro da comarca da sede da empresa, ressalvado ao consumidor o direito de propor ação no
        foro do seu domicílio. Estes Termos seguem as leis do Brasil.
      </p>
    </LegalLayout>
  );
}
