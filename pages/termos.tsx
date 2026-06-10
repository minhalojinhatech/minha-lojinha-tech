import { PolicyBlock, PolicyPage } from "@/components/PolicyPage";

export default function Termos() {
  return (
    <PolicyPage
      title="Termos de compra"
      description="Condições gerais para compra, pagamento, estoque e atendimento na loja."
    >
      <PolicyBlock title="Sobre a compra">
        <p>
          A Minha Lojinha Tech é uma loja online independente, com atendimento direto e foco em smartphones. Os anúncios apresentam fotos, condição, armazenamento, cor, bateria quando aplicável, garantia, itens inclusos e observações relevantes para ajudar o cliente a decidir com mais segurança.
        </p>
        <p className="mt-3">
          Muitos produtos seminovos e usados são unidades únicas. Quando um item é vendido, reservado ou fica indisponível, ele pode sair do catálogo para evitar que outra pessoa compre o mesmo produto.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Pagamento e atendimento">
        <p>
          O pagamento pode ser feito online pelo checkout. Para retirada em ponto combinado, também pode haver opção de pagamento pessoalmente, permitindo que o cliente confira o produto antes de pagar quando essa modalidade estiver disponível.
        </p>
        <p className="mt-3">
          O atendimento pode ser usado para tirar dúvidas antes da compra, combinar retirada, confirmar entrega local, acompanhar pedido ou solicitar suporte depois da entrega. Sempre que houver diferença entre informação do anúncio e informação combinada diretamente com o cliente, a loja buscará registrar a orientação mais recente de forma clara.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Termos vinculados a pedidos e reparos">
        <p>
          Depois que um pedido ou reparo é registrado, a loja pode disponibilizar um termo eletrônico já preenchido com seu número, cliente, dispositivo, valores, serviços, garantia e demais informações aplicáveis.
        </p>
        <p className="mt-3">
          O aceite é concluído pela conta do cliente mediante conferência das declarações, identificação e assinatura digitada. O sistema registra a versão apresentada, a data do servidor e uma impressão digital de integridade. O conteúdo assinado permanece vinculado ao pedido ou reparo correspondente e não reduz direitos previstos em lei.
        </p>
      </PolicyBlock>
    </PolicyPage>
  );
}
