export type AgreementType = "sale" | "repair";

export const agreementVersions: Record<AgreementType, string> = {
  sale: "v1.0-2026-06-06",
  repair: "v1.0-2026-06-06"
};

export const agreementContent = {
  sale: {
    title: "Termo de venda de dispositivo",
    intro: "Este termo registra a unidade vendida, sua condição, os itens inclusos, a garantia e o aceite do cliente.",
    sections: [
      {
        title: "Condição e informações da compra",
        paragraphs: [
          "O cliente confirma que recebeu, antes da compra, as fotos, a descrição, a condição, as observações, os itens inclusos e as informações de garantia do dispositivo.",
          "Em produtos seminovos ou usados, marcas de uso, desgaste, bateria, detalhes estéticos e limitações informadas fazem parte da condição aceita."
        ]
      },
      {
        title: "Garantia",
        paragraphs: [
          "A garantia cobre defeitos funcionais não informados e relacionados ao produto vendido, conforme o prazo registrado e a legislação aplicável.",
          "Não são cobertos danos posteriores por queda, impacto, líquido, oxidação, mau uso, abertura ou reparo por terceiros; bloqueios de conta, senhas, aplicativos ou atualizações; desgaste natural e características previamente informadas."
        ]
      },
      {
        title: "Contas, dados e recebimento",
        paragraphs: [
          "O cliente é responsável por suas contas, senhas, aplicativos, backup e dados pessoais após o recebimento.",
          "O cliente deve comunicar rapidamente qualquer divergência visível, dano aparente ou item faltante e confirma que teve oportunidade de conferir o dispositivo quando possível."
        ]
      },
      {
        title: "Troca, devolução e direitos legais",
        paragraphs: [
          "Nas compras realizadas pela internet ou fora de estabelecimento físico, permanece assegurado o direito de arrependimento no prazo legal aplicável, contado do recebimento.",
          "Este termo não exclui nem reduz direitos previstos na legislação de proteção ao consumidor."
        ]
      }
    ],
    confirmations: [
      "Conferi o dispositivo, sua condição, observações e itens inclusos.",
      "Li e aceito as condições de garantia apresentadas.",
      "Recebi acesso ao conteúdo completo deste termo."
    ]
  },
  repair: {
    title: "Termo de autorização e conclusão de reparo",
    intro: "Este termo registra o dispositivo recebido, o problema informado, o serviço autorizado, os riscos técnicos e a garantia do reparo.",
    sections: [
      {
        title: "Autorização do serviço",
        paragraphs: [
          "O cliente autoriza a abertura, os testes e os procedimentos necessários ao diagnóstico e ao serviço descrito no reparo.",
          "Qualquer custo, peça ou serviço adicional depende de nova autorização do cliente."
        ]
      },
      {
        title: "Riscos técnicos e dados",
        paragraphs: [
          "Líquido, oxidação, queda, reparo anterior, dano de placa ou defeito oculto podem alterar o diagnóstico, o prazo e o resultado.",
          "O cliente deve realizar backup quando possível. Não há garantia de preservação ou recuperação de dados quando o estado do dispositivo ou o serviço impedir isso.",
          "O acesso ao aparelho será limitado aos testes necessários ao atendimento."
        ]
      },
      {
        title: "Garantia do reparo",
        paragraphs: [
          "A garantia cobre apenas o serviço realizado e as peças registradas no reparo, dentro do prazo informado.",
          "Não são cobertos dano posterior, mau uso, líquido, queda, abertura por terceiros, desgaste natural ou problema sem relação com o reparo executado."
        ]
      },
      {
        title: "Entrega e direitos legais",
        paragraphs: [
          "Na conclusão, o cliente terá oportunidade de conferir o estado físico, os acessórios devolvidos e o funcionamento aparente do dispositivo.",
          "Este termo não exclui nem reduz direitos previstos na legislação aplicável."
        ]
      }
    ],
    confirmations: [
      "Confirmei que o dispositivo e o problema registrados estão corretos.",
      "Autorizo os testes e o serviço descrito neste reparo.",
      "Li os riscos técnicos, as condições de dados e a garantia do reparo.",
      "Recebi acesso ao conteúdo completo deste termo."
    ]
  }
} as const;
