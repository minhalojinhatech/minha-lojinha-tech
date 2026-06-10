import { PolicyBlock, PolicyPage } from "@/components/PolicyPage";

export default function Garantia() {
  return (
    <PolicyPage
      title="Garantia"
      description="Como a loja trata garantia em produtos novos, seminovos e usados de estoque próprio."
    >
      <PolicyBlock title="Como funciona">
        <p>
          A garantia da Minha Lojinha Tech cobre defeitos funcionais que não tenham sido informados no anúncio, no atendimento ou na confirmação da compra. O prazo e a forma de cobertura podem variar conforme o tipo de produto, a condição da unidade e as informações apresentadas antes da venda.
        </p>
        <p className="mt-3">
          Em produtos seminovos e usados, marcas de uso, desgaste natural, observações de bateria, detalhes estéticos e limitações descritas antes da compra fazem parte da condição do produto. Em produtos novos, a garantia pode seguir a cobertura do fabricante, da marca, do fornecedor ou da própria loja, conforme indicado no anúncio.
        </p>
      </PolicyBlock>

      <PolicyBlock title="Cobertura">
        <p>
          Quando o problema estiver dentro da garantia aplicável, a loja poderá realizar análise técnica e oferecer reparo, troca por item equivalente, abatimento proporcional ou reembolso, conforme a situação do produto e a disponibilidade de solução.
        </p>
        <p className="mt-3">
          A garantia não cobre queda, impacto, tela ou carcaça quebrada após a entrega, contato com líquido, oxidação, mau uso, abertura por terceiros, tentativa de reparo externa, bloqueios de conta, senhas, aplicativos, atualizações, perda de dados ou desgaste natural esperado pelo uso.
        </p>
      </PolicyBlock>
    </PolicyPage>
  );
}
