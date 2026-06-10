import { PolicyBlock, PolicyPage } from "@/components/PolicyPage";

export default function Privacidade() {
  return (
    <PolicyPage
      title="Privacidade"
      description="Como a loja trata dados usados para atendimento, compra, entrega e conta do cliente."
    >
      <PolicyBlock title="Dados usados pela loja">
        <p>
          A loja pode solicitar nome, e-mail, telefone, dados de entrega ou retirada e informações necessárias para processar pedidos, atendimento, suporte, garantia e solicitações do cliente. Esses dados ajudam a identificar a compra, combinar entrega local ou motoboy, organizar retirada e manter o histórico de atendimento.
        </p>
        <p className="mt-3">
          Dados sensíveis de pagamento são tratados pelo serviço de pagamento usado no checkout. A Minha Lojinha Tech não armazena dados completos de cartão e usa apenas as informações necessárias para confirmar o pedido e prestar atendimento.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Compartilhamento e segurança">
        <p>
          Dados podem ser compartilhados apenas quando necessário para concluir entrega, pagamento, suporte, garantia ou cumprimento de obrigações legais. Em entregas por motoboy ou serviços relacionados ao pedido, somente as informações necessárias para aquela finalidade devem ser utilizadas.
        </p>
        <p className="mt-3">
          O acesso aos dados dos clientes é restrito ao atendimento, pedidos, entrega, suporte e organização da loja. O cliente pode atualizar dados da conta, sair da sessão ou solicitar exclusão do cadastro pela área de conta, respeitando registros que precisem ser mantidos por segurança, atendimento ou obrigação legal.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Assinatura eletrônica de termos">
        <p>
          Para registrar o aceite de termos vinculados a pedidos e reparos, a loja pode tratar nome, CPF, assinatura digitada, conta autenticada, data e hora, versão do termo, dados do pedido ou reparo e evidências técnicas de segurança, como navegador e um identificador protegido da conexão.
        </p>
        <p className="mt-3">
          Essas informações são usadas para comprovar o conteúdo aceito, preservar a integridade do registro, prevenir fraude e atender obrigações legais ou de defesa de direitos. O registro não inclui dados completos de cartão nem substitui os direitos assegurados ao consumidor.
        </p>
      </PolicyBlock>
    </PolicyPage>
  );
}
