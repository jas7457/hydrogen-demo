import clsx from 'clsx';
import {Image, Link, Money, useMoney} from '@shopify/hydrogen';

import {Text} from '~/components';
import {fixImageUrl, isDiscounted, isNewArrival} from '~/lib/utils';
import type {
  MoneyV2,
  Image as ImageType,
  Scalars,
} from '@shopify/hydrogen/storefront-api-types';

export type Resource = {
  id: string;
  title: string;
  url: string;
  publishedAt: Scalars['DateTime'];
  image?: ImageType | null;
  price?: MoneyV2;
  compareAtPrice?: MoneyV2;
};

export function ResourceCard({
  resource,
  label,
  className,
  loading,
  onClick,
}: {
  resource: Resource;
  label?: string;
  className?: string;
  loading?: HTMLImageElement['loading'];
  onClick?: () => void;
}) {
  const cardLabel = (() => {
    if (label) {
      return label;
    }

    if (
      typeof resource.price !== 'undefined' &&
      typeof resource.compareAtPrice !== 'undefined' &&
      isDiscounted(resource.price, resource.compareAtPrice)
    ) {
      return 'Sale';
    }

    if (isNewArrival(resource.publishedAt)) {
      return 'New';
    }

    return null;
  })();

  return (
    <Link onClick={onClick} to={resource.url}>
      <div className={clsx('grid gap-6', className)}>
        <div className="card-image aspect-[4/5] bg-primary/5">
          <Text
            as="label"
            size="fine"
            className="absolute top-0 right-0 m-4 text-right text-notice"
          >
            {cardLabel}
          </Text>
          {resource.image && (
            <Image
              className="aspect-[4/5] w-full object-cover fadeIn"
              widths={[320]}
              sizes="320px"
              loaderOptions={{
                crop: 'center',
                scale: 2,
                width: 320,
                height: 400,
              }}
              data={{...resource.image, url: fixImageUrl(resource.image.url)}}
              alt={resource.image.altText || `Picture of ${resource.title}`}
              loading={loading}
            />
          )}
        </div>
        <div className="grid gap-1">
          <Text
            className="w-full overflow-hidden whitespace-nowrap text-ellipsis "
            as="h3"
          >
            {resource.title}
          </Text>
          <div className="flex gap-4">
            <Text className="flex gap-4">
              {resource.price && (
                <Money withoutTrailingZeros data={resource.price} />
              )}

              {isDiscounted(
                resource.price as MoneyV2,
                resource.compareAtPrice as MoneyV2,
              ) && (
                <CompareAtPrice
                  className={'opacity-50'}
                  money={resource.compareAtPrice as MoneyV2}
                />
              )}
            </Text>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompareAtPrice({
  money,
  className,
}: {
  money: MoneyV2;
  className?: string;
}) {
  const {currencyNarrowSymbol, withoutTrailingZerosAndCurrency} =
    useMoney(money);

  const styles = clsx('strike', className);

  return (
    <span className={styles}>
      {currencyNarrowSymbol}
      {withoutTrailingZerosAndCurrency}
    </span>
  );
}
