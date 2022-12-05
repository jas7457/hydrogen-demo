import {
  gql,
  HydrogenRouteProps,
  type HydrogenApiRouteOptions,
  type HydrogenRequest,
  useLocalization,
  useShopQuery,
  useUrl,
  ShopifyAnalyticsConstants,
  useServerAnalytics,
} from '@shopify/hydrogen';

import {
  ARTICLE_CARD_FRAGMENT,
  PAGE_CARD_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
} from '~/lib/fragments';
import {Filters, ProductGrid, Section, Text} from '~/components';
import {NoResultRecommendations, SearchPage} from '~/components/index.server';
import {PAGINATION_SIZE} from '~/lib/const';
import {Suspense} from 'react';

export default function Search({
  params,
}: {
  params: HydrogenRouteProps['params'];
}) {
  const {
    language: {isoCode: languageCode},
    country: {isoCode: countryCode},
  } = useLocalization();

  const {handle} = params;
  const {searchParams} = useUrl();

  const searchTerm = searchParams.get('q');

  const {data} = useShopQuery<any>({
    query: SEARCH_QUERY,
    variables: getSearchVariables(searchParams, {
      handle,
      countryCode,
      languageCode,
    }),
    preload: true,
  });

  useServerAnalytics({
    shopify: {
      canonicalPath: '/search',
      pageType: ShopifyAnalyticsConstants.pageType.search,
      searchTerm,
    },
  });

  const resourceConnection = data?.search;
  const noResults = (resourceConnection?.nodes ?? []).length === 0;

  if (!searchTerm || noResults) {
    return (
      <SearchPage searchTerm={searchTerm ? decodeURI(searchTerm) : null}>
        <Filters filters={resourceConnection?.productFilters ?? []} />
        {noResults && (
          <Section padding="x">
            <Text className="opacity-50">No results, try something else.</Text>
          </Section>
        )}
        <Suspense>
          <NoResultRecommendations
            country={countryCode}
            language={languageCode}
          />
        </Suspense>
      </SearchPage>
    );
  }

  return (
    <SearchPage searchTerm={decodeURI(searchTerm)}>
      <Section>
        <Filters filters={resourceConnection.productFilters} />
        <ProductGrid
          key="search"
          url={`/search?country=${countryCode}&language=${languageCode}&q=${searchTerm}`}
          collectionType="search"
          resourceConnection={resourceConnection}
        />
      </Section>
    </SearchPage>
  );
}

function getSearchVariables(
  searchParams: URLSearchParams,
  {
    handle,
    countryCode,
    languageCode,
  }: {handle: string; countryCode: string | null; languageCode: string | null},
) {
  const searchTerm = searchParams.get('q');
  const cursor = searchParams.get('cursor');
  const sortKey = searchParams.get('sort.key');
  const sortReverse = searchParams.get('sort.reverse') === 'true';
  const filterEntriesWithValues = [...searchParams.entries()]
    .filter(([key]) => key.startsWith('filter.'))
    .map(([key, value]) => [key.replace(/^filter\./, ''), JSON.parse(value)]);

  const formattedFilters = filterEntriesWithValues.map(([key, val]) => ({
    [key]: val,
  }));

  return {
    handle,
    country: countryCode,
    language: languageCode,
    pageBy: PAGINATION_SIZE,
    searchTerm,
    productFilters: formattedFilters,
    sortKey,
    sortReverse,
    after: cursor,
  };
}

// API to paginate the results of the search query.
// @see templates/demo-store/src/components/product/ProductGrid.client.tsx
export async function api(
  request: HydrogenRequest,
  {params, queryShop}: HydrogenApiRouteOptions,
) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {Allow: 'POST'},
    });
  }

  const url = new URL(request.url);
  const countryCode = url.searchParams.get('country');
  const languageCode = url.searchParams.get('language');
  const {handle} = params;

  return await queryShop({
    query: SEARCH_QUERY,
    variables: getSearchVariables(url.searchParams, {
      handle,
      countryCode,
      languageCode,
    }),
  });
}

const SEARCH_QUERY = gql`
  ${PRODUCT_CARD_FRAGMENT}
  ${ARTICLE_CARD_FRAGMENT}
  ${PAGE_CARD_FRAGMENT}
  query search(
    $searchTerm: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $after: String
    $productFilters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $sortReverse: Boolean
  ) @inContext(country: $country, language: $language) {
    search(
      first: $pageBy
      query: $searchTerm
      after: $after
      types: [PRODUCT, ARTICLE, PAGE]
      productFilters: $productFilters
      sortKey: $sortKey
      reverse: $sortReverse
    ) {
      productFilters {
        id
        label
        type
        values {
          id
          count
          label
          input
        }
      }
      nodes {
        ...ProductCard
        ...ArticleCard
        ...PageCard
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;
