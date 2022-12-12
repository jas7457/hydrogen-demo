import {useState, useRef, useEffect, useCallback} from 'react';
import {Link, flattenConnection, useUrl} from '@shopify/hydrogen';

import {Button, Grid, type Resource, ResourceCard} from '~/components';
import {getImageLoadingPriority} from '~/lib/const';
import type {
  ProductConnection,
  Product,
  ProductVariant,
  ProductVariantConnection,
  Article,
  ArticleConnection,
  Page,
  PageConnection,
} from '@shopify/hydrogen/storefront-api-types';
import {getProductPlaceholder} from '~/lib/placeholders';

type AllowedResource = Product | Article | Page;

/**
 * Just hacking here - really, there should be a "ResourceGrid" instead of "ProductGrid" as this now supports things like articles
 */
export function ProductGrid({
  url,
  resourceConnection,
  collectionType,
}: {
  url: string;
  resourceConnection: ProductConnection | ArticleConnection | PageConnection;
  collectionType: 'products' | 'collections' | 'search';
}) {
  const {searchParams} = useUrl();
  const nextButtonRef = useRef(null);
  const [pending, setPending] = useState(false);

  const initialResources = resourceConnection.nodes;
  const {hasNextPage, endCursor} = resourceConnection.pageInfo;
  const [{resources, nextPage, cursor}, setResourceInfo] = useState({
    resources: resourceConnection.nodes as AllowedResource[],
    nextPage: hasNextPage,
    cursor: endCursor ?? '',
  });

  // if the nodes or page info changes, we need to reset our resources. this can happen when the user changes filters
  useEffect(() => {
    const nodes = resourceConnection.nodes;
    const {hasNextPage, endCursor} = resourceConnection.pageInfo;
    setResourceInfo({
      resources: nodes,
      nextPage: hasNextPage,
      cursor: endCursor ?? '',
    });
  }, [resourceConnection.nodes, resourceConnection.pageInfo]);

  const fetchResources = useCallback(async () => {
    setPending(true);
    const postUrl = new URL(window.location.origin + url);
    postUrl.searchParams.set('cursor', cursor);
    const currentParams = new URLSearchParams(searchParams);
    [...currentParams.entries()].forEach(([key, value]) => {
      postUrl.searchParams.append(key, value);
    });

    const response = await fetch(postUrl, {
      method: 'POST',
    });
    const {data} = await response.json();

    // ProductGrid can paginate collection, products and search routes
    const resourceConnection = (() => {
      switch (collectionType) {
        case 'collections':
          return data?.collection.products;
        case 'products':
          return data?.products;
        case 'search':
          return data?.search;
        default:
          throw new Error('Invalid collection type');
      }
    })();

    // @ts-ignore TODO: Fix types
    const newResources: AllowedResource[] =
      flattenConnection(resourceConnection);
    const {endCursor, hasNextPage} = resourceConnection.pageInfo;

    setResourceInfo((currentInfo) => ({
      resources: [...currentInfo.resources, ...newResources],
      nextPage: hasNextPage,
      cursor: endCursor,
    }));
    setPending(false);
  }, [url, cursor, searchParams, collectionType]);

  useEffect(() => {
    const nextButton = nextButtonRef.current;
    if (!nextButton) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchResources();
        }
      },
      {
        rootMargin: '100%',
      },
    );

    observer.observe(nextButton);
    return () => observer.unobserve(nextButton);
  }, [fetchResources]);

  if (initialResources.length === 0) {
    return (
      <>
        <p>No products found on this collection</p>
        <Link to="/products">
          <p className="underline">Browse catalog</p>
        </Link>
      </>
    );
  }

  return (
    <>
      <Grid layout="products">
        {resources.map((resource, index) => {
          const convertedResource: Resource = (() => {
            const queryParams =
              collectionType === 'search' && resource.searchTrackingParameters
                ? `?${resource.searchTrackingParameters}`
                : '';
            switch (resource.__typename) {
              case 'Product': {
                const cardData = resource?.variants
                  ? resource
                  : getProductPlaceholder();

                const {
                  image,
                  priceV2: price,
                  compareAtPriceV2: compareAtPrice,
                } = flattenConnection<ProductVariant>(
                  cardData?.variants as ProductVariantConnection,
                )[0] || {};

                return {
                  id: resource.id,
                  title: resource.title,
                  url: `/products/${resource.handle}${queryParams}`,
                  publishedAt: resource.publishedAt,
                  image,
                  price,
                  compareAtPrice,
                };
              }

              case 'Article': {
                return {
                  id: resource.id,
                  title: resource.title,
                  url: `/journal/${resource.handle}${queryParams}`,
                  publishedAt: resource.publishedAt,
                  image: resource.image,
                };
              }

              case 'Page': {
                return {
                  id: resource.id,
                  title: resource.title,
                  url: `/pages/${resource.handle}${queryParams}`,
                  publishedAt: resource.createdAt,
                };
              }

              default: {
                throw new Error(
                  `Invalid resource type: ${resource.__typename}`,
                );
              }
            }
          })() as any;
          return (
            <ResourceCard
              key={resource.id}
              resource={convertedResource}
              loading={getImageLoadingPriority(index)}
            />
          );
        })}
      </Grid>

      {nextPage && (
        <div
          className="flex items-center justify-center mt-6"
          ref={nextButtonRef}
        >
          <Button
            variant="secondary"
            disabled={pending}
            onClick={fetchResources}
            width="full"
          >
            {pending ? 'Loading...' : 'Load more products'}
          </Button>
        </div>
      )}
    </>
  );
}
