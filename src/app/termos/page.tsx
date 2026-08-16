import LegalDocument from "@/components/legal/LegalDocument";

const sections = [
  {
    title: "1. o que é o qr.tecê e quem pode usar",
    paragraphs: [
      "O qr.qr.tecê é uma rede social por convite, criada para conexões genuínas entre pessoas. O acesso é restrito a quem receber um convite de um membro ativo da plataforma.",
      "Ao criar uma conta, você declara que tem pelo menos 21 anos de idade, que as informações fornecidas são verdadeiras e que leu e aceita estes Termos de Uso. O uso continuado da plataforma após atualizações dos Termos implica concordância com a versão vigente.",
    ],
  },
  {
    title: "2. regras de uso",
    paragraphs: [
      "Você é responsável por tudo o que publica e por manter suas credenciais em segurança. É proibido publicar conteúdo que seja ofensivo, discriminatório, ilegal, que viole direitos autorais ou que represente assédio a outras pessoas.",
      "Também é proibido criar contas falsas, usar a plataforma para fins comerciais não autorizados ou tentar comprometer a segurança e o funcionamento do serviço. O descumprimento dessas regras pode resultar em suspensão ou encerramento da conta.",
    ],
  },
  {
    title: "3. conteúdo e responsabilidades",
    paragraphs: [
      "Você mantém a autoria sobre o conteúdo que publica. Ao publicar, você concede ao qr.tecê uma licença limitada para exibir esse conteúdo dentro da plataforma, exclusivamente para seu funcionamento.",
      "O qr.tecê não se responsabiliza por conteúdo publicado por usuários, mas reserva o direito de remover publicações que violem estas regras. O serviço é oferecido sem garantia de disponibilidade ininterrupta e pode passar por manutenções programadas.",
    ],
  },
  {
    title: "4. segurança infantil",
    paragraphs: [
      "O qr.tecê proíbe qualquer conteúdo que explore, abuse ou prejudique menores de idade. É vedado publicar, compartilhar ou solicitar material de abuso sexual infantil (CSAI) sob qualquer circunstância. O descumprimento dessa regra resulta em suspensão imediata e permanente da conta.",
      "Usuários que identificarem esse tipo de conteúdo podem e devem denunciá-lo diretamente pelo app. O qr.tecê coopera integralmente com autoridades regionais e nacionais em investigações relacionadas à segurança infantil e encaminha as denúncias cabíveis aos órgãos competentes.",
    ],
  },
  {
    title: "5. encerramento e contato",
    paragraphs: [
      "Você pode excluir sua conta a qualquer momento nas Configurações. Ao excluir, seus dados pessoais são anonimizados conforme descrito na nossa Política de Privacidade.",
      "Dúvidas, solicitações ou notificações podem ser enviadas para contato@exemplo.com. Estes Termos são regidos pela legislação brasileira e eventuais disputas serão resolvidas no foro da comarca de São Luís/MA.",
    ],
  },
];

export default function TermosPage() {
  return (
    <LegalDocument
      eyebrow="Termos"
      title="Termos de Uso do qr.tecê"
      description="Ao criar uma conta no qr.tecê, você concorda com as regras descritas abaixo."
      updatedAt="22 de maio de 2026"
      effectiveDate="22 de maio de 2026"
      sections={sections}
    />
  );
}
