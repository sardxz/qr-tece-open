import LegalDocument from "@/components/legal/LegalDocument";

const sections = [
  {
    title: "1. dados que coletamos",
    paragraphs: [
      "Coletamos os dados que você fornece ao criar e usar sua conta: nome de usuário, e-mail, gênero, ano de nascimento, cidade, estado, foto de perfil, frase e bio. Também são armazenados os conteúdos que você publica — posts, comentários e depoimentos — e suas interações dentro da plataforma, como curtidas e amizades.",
      "Para fins de segurança, registramos o endereço IP nas requisições de login e cadastro. Esse dado é usado exclusivamente para limitar tentativas de acesso abusivo e não é vinculado ao seu perfil público.",
    ],
  },
  {
    title: "2. como usamos seus dados",
    paragraphs: [
      "Seus dados são usados para: autenticar seu acesso, exibir seu perfil para outros membros da plataforma, permitir interações sociais (amizades, depoimentos, comunidades) e personalizar sua experiência (tema, configurações).",
      "A base legal para o tratamento é o consentimento que você deu ao aceitar estes termos no momento do cadastro (art. 7º, I, LGPD) e o legítimo interesse do qr.tecê para fins de segurança e prevenção de abuso (art. 7º, IX, LGPD). Não usamos seus dados para publicidade ou criação de perfis comportamentais.",
    ],
  },
  {
    title: "3. armazenamento e compartilhamento",
    paragraphs: [
      "Seus dados são armazenados em servidor localizado no Brasil. Não compartilhamos nenhuma informação pessoal com terceiros, exceto quando exigido por lei ou ordem judicial.",
      "Seus dados pessoais são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, e-mail, nome de usuário, foto e demais informações de perfil são anonimizados de forma irreversível. Conteúdos publicados (posts, comentários) podem ser mantidos de forma desvinculada da sua identidade para preservar a integridade das conversas na plataforma.",
    ],
  },
  {
    title: "4. seus direitos",
    paragraphs: [
      "Pela Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar os dados que temos sobre você, corrigir informações incorretas, solicitar a exclusão dos seus dados, revogar o consentimento e solicitar portabilidade. A maioria desses direitos pode ser exercida diretamente nas Configurações da sua conta.",
      "Para solicitações que não estejam disponíveis na plataforma — como exportação dos seus dados ou dúvidas sobre o tratamento —, entre em contato com o responsável pelo qr.qr.tecê pelo e-mail contato@exemplo.com. Responderemos em até 15 dias úteis.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <LegalDocument
      eyebrow="Privacidade"
      title="Política de Privacidade do qr.tecê"
      description="Explicamos aqui quais dados coletamos, como usamos e quais são os seus direitos."
      updatedAt="09 de maio de 2026"
      effectiveDate="09 de maio de 2026"
      sections={sections}
    />
  );
}
