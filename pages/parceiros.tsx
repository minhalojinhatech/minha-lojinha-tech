import { CalendarHeart, Handshake, Megaphone, MessagesSquare, Store, Wrench } from "lucide-react";
import { CollaborationPage } from "@/components/CollaborationPage";

export default function Parceiros() {
  return (
    <CollaborationPage
      kind="Parceria"
      canonicalPath="/parceiros"
      title="Parceiros | Minha Lojinha Tech"
      description="Proponha uma parceria com a Minha Lojinha Tech em conteúdo, assistência, divulgação, eventos, indicações e projetos de tecnologia."
      eyebrow="Parcerias que aproximam"
      heroTitle="Vamos construir algo juntos."
      heroDescription="A Minha Lojinha Tech está aberta para parcerias que agreguem valor aos clientes e à comunidade de tecnologia."
      heroButton="Quero ser parceiro"
      featureEyebrow="Possibilidades"
      featureTitle="Boas ideias podem começar de vários lugares."
      featureDescription="Não existe um formato único. O importante é a colaboração fazer sentido para os dois lados e entregar algo útil para quem acompanha a loja."
      features={[
        { title: "Criadores de Conteúdo", description: "Conteúdo honesto sobre tecnologia, aparelhos e experiências reais.", icon: MessagesSquare },
        { title: "Assistência Técnica", description: "Apoio técnico confiável para diagnóstico, reparo e cuidado pós-venda.", icon: Wrench },
        { title: "Lojas Parceiras", description: "Troca de oportunidades, indicações e soluções complementares.", icon: Store },
        { title: "Divulgação e Marketing", description: "Ações criativas que aproximem a marca de novos públicos.", icon: Megaphone },
        { title: "Eventos e Projetos", description: "Participação em iniciativas locais, digitais ou ligadas à tecnologia.", icon: CalendarHeart },
        { title: "Indicação de Clientes", description: "Uma rede de confiança para conectar pessoas às soluções certas.", icon: Handshake }
      ]}
      valuesEyebrow="Por que colaborar"
      valuesTitle="Parceria boa cresce junto."
      valuesDescription="A loja ainda é jovem, e isso abre espaço para construir relações próximas, testar ideias e criar oportunidades de forma transparente."
      values={["Crescimento conjunto", "Divulgação mútua", "Novas oportunidades", "Comunidade de tecnologia", "Projetos colaborativos"]}
      formEyebrow="Apresente sua ideia"
      formTitle="Vamos começar pela conversa."
      formDescription="Não precisa chegar com tudo pronto. Conte quem você é, o que faz e qual colaboração imagina."
      submitLabel="Enviar proposta"
      successLabel="Proposta enviada. Obrigado por pensar na Minha Lojinha Tech para essa parceria."
      categories={["Criadores de Conteúdo", "Assistência Técnica", "Lojas Parceiras", "Divulgação e Marketing", "Eventos e Projetos", "Indicação de Clientes", "Outra proposta"]}
    />
  );
}
