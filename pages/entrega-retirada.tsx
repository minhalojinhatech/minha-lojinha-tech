import { PolicyBlock, PolicyPage } from "@/components/PolicyPage";

export default function EntregaRetirada() {
  return (
    <PolicyPage
      title="Entrega e retirada"
      description="Opções de retirada, entrega local e motoboy para clientes de São Paulo e regiões de fácil acesso."
    >
      <PolicyBlock title="Área e formas de entrega">
        <p>
          A loja atende principalmente São Paulo capital, com foco em regiões próximas ao Capão Redondo, Jardim Guarujá, Parque Independência e locais de fácil acesso por transporte público. As opções disponíveis podem incluir retirada em ponto combinado, entrega local ou motoboy, conforme produto, endereço e disponibilidade no momento do pedido.
        </p>
        <p className="mt-3">
          Os pontos de retirada aparecem no checkout e o atendimento acontece no local combinado, sem entrada na residência. A retirada é organizada para que o cliente possa conferir o produto com tranquilidade e segurança antes de finalizar, especialmente quando o pagamento for feito pessoalmente.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Frete e cuidado no transporte">
        <p>
          A Minha Lojinha Tech prioriza retirada, entrega local e motoboy porque eletrônicos exigem mais cuidado no transporte. Correios e transportadora não são a forma principal de envio da loja, mas podem ser avaliados em casos específicos, se fizer sentido para o produto e para a região.
        </p>
        <p className="mt-3">
          O frete pode variar conforme produto, região e forma de entrega. Produtos seminovos podem ter entrega subsidiada pela loja em alguns casos, enquanto produtos novos ou entregas mais distantes podem ter custo combinado antes da finalização da compra.
        </p>
      </PolicyBlock>
    </PolicyPage>
  );
}
