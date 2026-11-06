import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';

// D4: template de exemplo da fundação; os fluxos das próximas changes criam os seus neste formato.

type ExampleEmailProps = {
  name: string;
};

export function ExampleEmail({ name }: ExampleEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Body>
        <Preview>Mensagem de exemplo do sistema de autenticação</Preview>
        <Container>
          <Heading as="h1">{`Olá, ${name}`}</Heading>
          <Text>Este é um e-mail de exemplo do sistema de autenticação.</Text>
          <Text>Se você não esperava esta mensagem, ignore-a.</Text>
        </Container>
      </Body>
    </Html>
  );
}
