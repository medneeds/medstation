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

export default function Reembolso() {
  return (
    <LegalLayout
      title="Política de Reembolso e Cancelamento"
      description="Garantia de 7 dias, como cancelar a assinatura e como funciona o reembolso na MedStation."
      path="/reembolso"
    >
      <h2>1. Garantia de 7 dias</h2>
      <p>
        Se você assinar e desistir em até <strong>7 dias corridos a partir da data do pagamento</strong>,
        devolvemos <strong>100% do valor pago</strong>, sem precisar justificar. Isso vale para o plano
        mensal, o anual e ofertas promocionais, e atende ao direito de arrependimento do art. 49 do Código de
        Defesa do Consumidor.
      </p>
      <p>
        Para pedir, fale com <Contact /> informando o e-mail da conta. Não é preciso explicar o motivo.
      </p>

      <h2>2. Como o valor é devolvido</h2>
      <ul>
        <li>
          <strong>Cartão de crédito:</strong> o estorno é solicitado à operadora em até 5 dias úteis após o
          pedido. O crédito aparece na fatura conforme o prazo do seu banco, normalmente em até 2 faturas.
        </li>
        <li>
          <strong>Boleto:</strong> devolvemos por PIX ou transferência para uma conta do titular do pagamento,
          em até 10 dias úteis após recebermos os dados bancários.
        </li>
      </ul>
      <p>
        Com o reembolso, o acesso pago e eventuais bônus vinculados à compra são encerrados.
      </p>

      <h2>3. Depois de 7 dias</h2>
      <h3>Plano mensal</h3>
      <ul>
        <li>Você pode cancelar quando quiser, sem multa e sem fidelidade, pela área de assinatura da conta.</li>
        <li>
          O cancelamento interrompe as próximas cobranças. Você continua com acesso até o fim do mês já pago.
        </li>
      </ul>
      <h3>Plano anual e ofertas anuais</h3>
      <ul>
        <li>
          É um pagamento único por 12 meses de acesso e não renova automaticamente — não há nada a cancelar
          para evitar novas cobranças.
        </li>
      </ul>
      <p>
        Após os 7 dias, não há reembolso proporcional do período em curso, exceto quando a lei exigir ou quando
        houver falha nossa que impeça o uso do serviço.
      </p>

      <h2>4. Teste grátis</h2>
      <p>
        O teste de 7 dias não pede cartão e não gera cobrança. Se você não assinar, o acesso aos recursos pagos
        termina ao fim do teste, sem nenhum valor a pagar.
      </p>

      <h2>5. Cobrança indevida</h2>
      <p>
        Se identificar uma cobrança que não reconhece ou em duplicidade, fale com <Contact />. Valores cobrados
        indevidamente são devolvidos nos termos do Código de Defesa do Consumidor.
      </p>

      <p>
        Veja também os <Link to="/termos">Termos de Uso</Link> e a{" "}
        <Link to="/privacidade">Política de Privacidade</Link>.
      </p>
    </LegalLayout>
  );
}
