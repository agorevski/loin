import React from 'react';
import styled from '@emotion/styled';
import { theme } from '../../../theme';

const Container = styled.div`
  margin-bottom: ${theme.spacing(4)};
`;

const Header = styled.h1``;

const Description = styled.p`
  ${theme.h3};
  color: ${theme.text.middle};
  max-width: 800px;
`;

export const HeaderBox = () => {
  return (
    <Container>
      <Header>Loin Partners</Header>
      <Description>
        Explore the ecosystem of partners that make Loin tick. Loin's protocol and DAO rely
        heavily on collaboration through neutral and decentralized technology to offer a secure,
        permissionless and trust-minimized service to the world. We would be nothing without our
        frens across the stack.
      </Description>
    </Container>
  );
};
