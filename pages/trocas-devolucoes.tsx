import { PolicyBlock, PolicyPage } from "@/components/PolicyPage";

export default function TrocasDevolucoes() {
  return (
    <PolicyPage
      title="Trocas e devoluções"
      description="Regras para arrependimento, devolução e análise de produtos vendidos pela loja."
    >
      <PolicyBlock title="Arrependimento e devolução">
        <p>
          Em compras realizadas pela internet, o cliente pode solicitar arrependimento em até 7 dias corridos a partir do recebimento do produto, conforme regra aplicada a compras feitas fora de estabelecimento físico. Para que a devolução seja aceita, o produto precisa retornar nas mesmas condições em que foi entregue, com acessórios e itens inclusos.
        </p>
        <p className="mt-3">
          A devolução pode ser recusada ou analisada com ressalvas se houver sinais de mau uso, queda, contato com líquido, abertura por terceiros, dano causado após o recebimento, troca de peça, senha desconhecida, bloqueio de conta ou ausência de item que acompanhava o produto.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Como solicitar">
        <p>
          Para solicitar troca, devolução, garantia ou análise, entre em contato pelo canal de atendimento da loja e informe o número do pedido, produto e motivo da solicitação. A loja poderá pedir fotos, vídeos ou uma análise presencial para entender o caso antes de combinar retirada, entrega, reparo, troca ou reembolso.
        </p>
        <p className="mt-3">
          Quando o problema for um defeito funcional não informado no anúncio, a loja pode realizar análise técnica e oferecer uma solução compatível com o caso, considerando a condição do produto, disponibilidade de peça, possibilidade de reparo e prazo de garantia aplicável.
        </p>
      </PolicyBlock>
    </PolicyPage>
  );
}
