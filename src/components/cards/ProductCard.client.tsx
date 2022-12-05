import {ResourceCard} from '~/components';
import {getProductPlaceholder} from '~/lib/placeholders';
import type {Product} from '@shopify/hydrogen/storefront-api-types';

export function ProductCard({
  product,
  ...rest
}: {
  product: Product;
  label?: string;
  className?: string;
  loading?: HTMLImageElement['loading'];
  onClick?: () => void;
}) {
  const cardData = product?.variants ? product : getProductPlaceholder();

  const {
    image,
    priceV2: price,
    compareAtPriceV2: compareAtPrice,
  } = cardData?.variants?.nodes?.[0] || {};

  return (
    <ResourceCard
      resource={{
        id: product.id,
        title: product.title,
        publishedAt: product.publishedAt,
        url: `/products/${product.handle}`,
        image,
        price,
        compareAtPrice: compareAtPrice ?? undefined,
      }}
      {...rest}
    />
  );
}
