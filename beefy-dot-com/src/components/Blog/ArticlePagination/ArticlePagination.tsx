import React, { memo } from 'react';
import styled from '@emotion/styled';
import { PrimaryLink } from '../../Common/Buttons';
import { theme } from '../../../theme';

const Pages = styled.div`
  display: flex;
`;

const PageLink = styled(PrimaryLink)`
  display: flex;
  align-items: center;
`;

const PrevLink = styled(PageLink)`
  margin-right: auto;

  &::before {
    content: '➔';
    display: block;
    transform: scaleX(-1);
    margin-right: ${theme.spacing()};
  }
`;

const NextLink = styled(PageLink)`
  margin-left: auto;

  &::after {
    content: '➔';
    display: block;
    margin-left: ${theme.spacing()};
  }
`;

export type ArticlePaginationProps = {
  currentPage: number;
  numPages: number;
  tag?: string;
  className?: string;
};

export const ArticlePagination = memo<ArticlePaginationProps>(function ArticlePagination({
  currentPage,
  numPages,
  tag,
  className,
}) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < numPages;

  if (numPages <= 1) {
    return null;
  }

  const basePath = tag ? `/articles/tag/${tag}` : '/articles';
  const prevPage = currentPage > 2 ? `${basePath}/page/${currentPage - 1}` : `${basePath}`;
  const nextPage = `${basePath}/page/${currentPage + 1}`;

  return (
    <Pages className={className}>
      {hasPrevious ? (
        <PrevLink to={prevPage} rel="prev">
          Previous
        </PrevLink>
      ) : null}
      {hasNext ? (
        <NextLink to={nextPage} rel="next">
          Next
        </NextLink>
      ) : null}
    </Pages>
  );
});
