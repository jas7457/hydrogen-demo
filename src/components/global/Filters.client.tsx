import {useUrl, useNavigate} from '@shopify/hydrogen';
import React, {useEffect, useState} from 'react';
import {useDebounce} from 'react-use';
import clsx from 'clsx';
// @ts-expect-error @headlessui/react incompatibility with node16 resolution
import {Menu} from '@headlessui/react';
import {IconCaret, IconClose} from '../index';

interface FiltersProps {
  filters: {
    id: string;
    label: string;
    type: 'LIST' | 'PRICE_RANGE' | 'BOOLEAN';
    values: {
      id: string;
      count: number;
      label: string;
      input: string;
    }[];
  }[];
}
type Filter = FiltersProps['filters'][number];
type ValueProps = Filter['values'][number];

const FILTER_QUERY_PREFIX = 'filter';

export function Filters({filters = []}: FiltersProps) {
  const {pathname, searchParams} = useUrl();
  const navigate = useNavigate();
  const {isFilterValueActive, removeFilterValue, removeFilterValues} =
    useFilters();

  if (filters.length === 0) {
    return null;
  }

  const activeValuesWithFilters = filters.flatMap((filter) =>
    filter.values
      .filter((value) => isFilterValueActive(filter, value))
      .map((value) => ({filter, value})),
  );

  return (
    <>
      <div className="grid grid-cols-[1fr_max-content]">
        <div className="flex gap-4 flex-wrap">
          <div>Filters:</div>
          <ul className="contents">
            {filters.map((filter) => (
              <li key={filter.id}>
                <Menu>
                  {({open}) => (
                    <>
                      <Menu.Button as={React.Fragment}>
                        <button className="flex gap-2">
                          {filter.label}
                          <IconCaret direction={open ? 'up' : 'down'} />
                        </button>
                      </Menu.Button>
                      <Menu.Items>
                        <div className="absolute w-72 bg-white text-black p-2 z-20 flex flex-col divide-y-2 space-y-2 border-black">
                          {filter.type !== 'PRICE_RANGE' && (
                            <div className="flex justify-between">
                              <div>
                                {
                                  filter.values.filter((value) =>
                                    isFilterValueActive(filter, value),
                                  ).length
                                }{' '}
                                Selected
                              </div>
                              <button
                                onClick={() => {
                                  navigate(
                                    `${pathname}?${removeFilterValues(
                                      filter,
                                      filter.values,
                                    )}`,
                                  );
                                }}
                              >
                                Reset
                              </button>
                            </div>
                          )}

                          <ul className="py-2">
                            {filter.values.map((value) => {
                              switch (filter.type) {
                                case 'PRICE_RANGE': {
                                  return (
                                    <PriceRangeFilterItem key={value.id} />
                                  );
                                }
                                case 'LIST':
                                case 'BOOLEAN': {
                                  return (
                                    <DefaultFilterItem
                                      key={value.id}
                                      value={value}
                                      filter={filter}
                                    />
                                  );
                                }
                                // unexpected filter type
                                default: {
                                  return null;
                                }
                              }
                            })}
                          </ul>
                        </div>
                      </Menu.Items>
                    </>
                  )}
                </Menu>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-shrink-0">
          <Sort />
        </div>
      </div>

      {activeValuesWithFilters.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <ul className="contents">
            {activeValuesWithFilters.map(({value, filter}) => {
              const buttonValue = (() => {
                switch (filter.type) {
                  case 'PRICE_RANGE': {
                    const {price} = JSON.parse(value.input);
                    return [price.min, price.max].join('-');
                  }
                  case 'LIST':
                  case 'BOOLEAN': {
                    return value.label;
                  }
                }
              })();

              return (
                <button
                  key={value.id}
                  className="flex items-center gap-1 border-2 p-2 rounded-full"
                  onClick={() => {
                    const {newSearchParams} = removeFilterValue(filter, value);
                    navigate(`${pathname}?${newSearchParams.toString()}`);
                  }}
                >
                  {filter.label}: {buttonValue}
                  <IconClose />
                </button>
              );
            })}
          </ul>
          <button
            onClick={() => {
              const newSearchParams = activeValuesWithFilters.reduce(
                (currentSearchParams, {filter, value}) => {
                  return removeFilterValue(filter, value, currentSearchParams)
                    .newSearchParams;
                },
                new URLSearchParams(searchParams),
              );

              navigate(`${pathname}?${newSearchParams.toString()}`);
            }}
          >
            Remove all
          </button>
        </div>
      )}
    </>
  );
}

function useFilters() {
  const {searchParams} = useUrl();

  const isFilterValueActive = (filter: Filter, value: ValueProps) => {
    switch (filter.type) {
      case 'PRICE_RANGE': {
        return searchParams.has(`${FILTER_QUERY_PREFIX}.price`);
      }
      case 'LIST':
      case 'BOOLEAN': {
        return [...searchParams.entries()].some(([key, val]) => {
          const valToCheck = (() => {
            try {
              return JSON.parse(val);
            } catch {
              return val;
            }
          })();
          return (
            value.input ===
            JSON.stringify({
              [key.replace(/^filter\./, '')]: valToCheck,
            })
          );
        });
      }
      default: {
        return false;
      }
    }
  };

  const removeFilterValue = (
    filter: Filter,
    value: ValueProps,
    fromSearchParams = searchParams,
  ) => {
    const newSearchParams = new URLSearchParams(fromSearchParams);

    const [queryKey, queryValue] = Object.entries(JSON.parse(value.input))[0];
    const formattedQueryKey = `${FILTER_QUERY_PREFIX}.${queryKey}`;
    const formattedQueryValue = JSON.stringify(queryValue);

    switch (filter.type) {
      case 'PRICE_RANGE': {
        newSearchParams.delete(formattedQueryKey);
        break;
      }
      case 'LIST':
      case 'BOOLEAN': {
        const currentValues = newSearchParams.getAll(formattedQueryKey);

        if (currentValues.length > 0) {
          newSearchParams.delete(formattedQueryKey);
          for (const currentValue of currentValues) {
            if (currentValue !== formattedQueryValue) {
              newSearchParams.append(formattedQueryKey, currentValue);
            }
          }
        }
        break;
      }
    }
    return {newSearchParams, formattedQueryKey, formattedQueryValue};
  };

  const removeFilterValues = (filter: Filter, values: ValueProps[]) => {
    return values.reduce((currentSearchParams, value) => {
      return removeFilterValue(filter, value, currentSearchParams)
        .newSearchParams;
    }, new URLSearchParams(searchParams));
  };

  return {
    isFilterValueActive,
    removeFilterValue,
    removeFilterValues,
  };
}

function DefaultFilterItem({
  value,
  filter,
}: {
  value: ValueProps;
  filter: Filter;
}) {
  const navigate = useNavigate();
  const {pathname} = useUrl();
  const {isFilterValueActive, removeFilterValue} = useFilters();

  return (
    <li>
      <label
        className={clsx('flex gap-2 items-center', {
          'opacity-20 pointer-events-none select-none': value.count === 0,
          'cursor-pointer': value.count > 0,
        })}
      >
        <input
          type="checkbox"
          name={value.id}
          value={value.label}
          disabled={value.count === 0}
          checked={isFilterValueActive(filter, value)}
          onChange={(event) => {
            const {newSearchParams, formattedQueryKey, formattedQueryValue} =
              removeFilterValue(filter, value);

            if (event.target.checked) {
              newSearchParams.append(formattedQueryKey, formattedQueryValue);
            }

            return navigate(`${pathname}?${newSearchParams.toString()}`);
          }}
        />
        {value.label} ({value.count})
      </label>
    </li>
  );
}

// TODO: handle other price ranges if there are any
function PriceRangeFilterItem() {
  const navigate = useNavigate();
  const {pathname, searchParams} = useUrl();
  const queryParamKey = `${FILTER_QUERY_PREFIX}.price`;

  const urlValues = (() => {
    try {
      return JSON.parse(searchParams.get(queryParamKey) ?? '');
    } catch {
      return {min: '', max: ''};
    }
  })();
  const [minNumber, setMinNumber] = useState<number | ''>(urlValues?.min ?? '');
  const [maxNumber, setMaxNumber] = useState<number | ''>(urlValues?.max ?? '');

  useDebounce(
    () => {
      const newSearchParams = new URLSearchParams(searchParams);

      if (minNumber === '' && maxNumber === '') {
        newSearchParams.delete(queryParamKey);
      } else {
        newSearchParams.set(
          queryParamKey,
          JSON.stringify({
            ...(minNumber !== '' ? {min: minNumber} : {}),
            ...(maxNumber !== '' ? {max: maxNumber} : {}),
          }),
        );
      }

      navigate(`${pathname}?${newSearchParams.toString()}`);
    },
    1000,
    [minNumber, maxNumber],
  );

  return (
    <li>
      <div className="flex gap-4 w-full">
        <input
          type="number"
          placeholder="From"
          className="w-1/2 text-black"
          value={minNumber}
          onChange={(event) => setMinNumber(Number(event.target.value))}
        />
        <input
          type="number"
          placeholder="To"
          className="w-1/2 text-black"
          value={maxNumber}
          onChange={(event) => setMaxNumber(Number(event.target.value))}
        />
      </div>

      <button
        onClick={() => {
          setMinNumber('');
          setMaxNumber('');
        }}
      >
        Clear
      </button>
    </li>
  );
}

function Sort() {
  const {pathname, searchParams} = useUrl();
  const navigate = useNavigate();

  const options = [
    {
      value: 'relevance-normal',
      label: 'Relevance',
      key: 'RELEVANCE',
      reverse: false,
    },
    {
      value: 'price-normal',
      label: 'Price: Low to High',
      key: 'PRICE',
      reverse: false,
    },
    {
      value: 'price-reverse',
      label: 'Price: High to Low',
      key: 'PRICE',
      reverse: true,
    },
  ];

  // get the sort option STRICTLY based on query params
  const currentSortValue = (() => {
    const foundOption = options.find((option) => {
      return (
        option.key === searchParams.get('sort.key') &&
        option.reverse === (searchParams.get('sort.reverse') === 'true')
      );
    });

    return foundOption?.value ?? 'relevance-normal';
  })();

  return (
    <div className="flex gap-4 items-center">
      <div>Sort:</div>
      <select
        className="text-black"
        value={currentSortValue}
        onChange={(event) => {
          const foundOption = options.find(
            (opt) => opt.value === event.target.value,
          );
          if (!foundOption) {
            return;
          }
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set('sort.key', foundOption.key);
          newSearchParams.set('sort.reverse', foundOption.reverse.toString());
          navigate(`${pathname}?${newSearchParams.toString()}`);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
