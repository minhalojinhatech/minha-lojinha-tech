import { Camera, Handshake, Headphones, MapPin, PenTool, Wrench } from "lucide-react";
import { CollaborationPage } from "@/components/CollaborationPage";

export default function FacaParteDaEquipe() {
  return (
    <CollaborationPage
      kind="Candidatura"
      canonicalPath="/faca-parte-da-equipe"
      title="Faça parte da Minha Lojinha Tech"
      description="Conheça formas de contribuir com a Minha Lojinha Tech e envie seu interesse em futuras oportunidades de colaboração."
      eyebrow="Crescer com gente boa"
      heroTitle="Faça parte da Minha Lojinha Tech"
      heroDescription="Estamos sempre em busca de pessoas apaixonadas por tecnologia e que queiram crescer junto com a gente."
      heroButton="Quero participar"
      featureEyebrow="Como contribuir"
      featureTitle="Existem muitas formas de fazer parte."
      featureDescription="Esta não é uma lista fechada de vagas. É um espaço para conhecer pessoas, habilidades e possibilidades que podem fazer sentido agora ou no futuro."
      features={[
        { title: "Assistência Técnica", description: "Diagnóstico e cuidado com aparelhos, sempre com clareza para o cliente.", icon: Wrench },
        { title: "Pontos de Retirada", description: "Locais parceiros que tornem entregas e retiradas mais convenientes.", icon: MapPin },
        { title: "Atendimento ao Cliente", description: "Conversas atenciosas para orientar, resolver dúvidas e acompanhar pedidos.", icon: Headphones },
        { title: "Fotografia de Produtos", description: "Imagens reais e bem cuidadas que mostrem cada aparelho com transparência.", icon: Camera },
        { title: "Criação de Conteúdo", description: "Ideias, vídeos e materiais que tornem tecnologia mais simples e próxima.", icon: PenTool },
        { title: "Parcerias Comerciais", description: "Novas conexões, fornecedores e oportunidades para a loja crescer.", icon: Handshake }
      ]}
      valuesEyebrow="O que valorizamos"
      valuesTitle="Mais importante que parecer pronto é querer construir bem."
      valuesDescription="Buscamos relações responsáveis, humanas e organizadas. Técnica pode ser desenvolvida; postura e vontade fazem toda diferença."
      values={["Transparência", "Compromisso", "Boa comunicação", "Organização", "Paixão por tecnologia", "Vontade de aprender"]}
      formEyebrow="Conte sobre você"
      formTitle="Onde você gostaria de contribuir?"
      formDescription="Envie uma apresentação simples. Quando surgir uma oportunidade compatível, a loja já saberá como encontrar você."
      submitLabel="Enviar candidatura"
      successLabel="Candidatura enviada. Seu contato ficou disponível para futuras oportunidades."
      categories={["Assistência Técnica", "Pontos de Retirada", "Atendimento ao Cliente", "Fotografia de Produtos", "Criação de Conteúdo", "Parcerias Comerciais", "Outra área"]}
    />
  );
}
