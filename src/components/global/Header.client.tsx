import {Link, useUrl, useCart, useLocalization, Image} from '@shopify/hydrogen';
import {useState} from 'react';
import {useDebounce, useWindowScroll} from 'react-use';

import {
  Heading,
  IconAccount,
  IconBag,
  IconMenu,
  IconSearch,
  Input,
} from '~/components';

import {CartDrawer} from './CartDrawer.client';
import {MenuDrawer} from './MenuDrawer.client';
import {useDrawer} from './Drawer.client';

import {EnhancedMenu, fixImageUrl} from '~/lib/utils';

/**
 * A client component that specifies the content of the header on the website
 */
export function Header({title, menu}: {title: string; menu?: EnhancedMenu}) {
  const {pathname} = useUrl();

  const localeMatch = /^\/([a-z]{2})(\/|$)/i.exec(pathname);
  const countryCode = localeMatch ? localeMatch[1] : undefined;

  const isHome = pathname === `/${countryCode ? countryCode + '/' : ''}`;

  const {
    isOpen: isCartOpen,
    openDrawer: openCart,
    closeDrawer: closeCart,
  } = useDrawer();

  const {
    isOpen: isMenuOpen,
    openDrawer: openMenu,
    closeDrawer: closeMenu,
  } = useDrawer();

  return (
    <>
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} menu={menu!} />
      <DesktopHeader
        countryCode={countryCode}
        isHome={isHome}
        title={title}
        menu={menu}
        openCart={openCart}
      />
      <MobileHeader
        countryCode={countryCode}
        isHome={isHome}
        title={title}
        openCart={openCart}
        openMenu={openMenu}
      />
    </>
  );
}

function MobileHeader({
  countryCode,
  title,
  isHome,
  openCart,
  openMenu,
}: {
  countryCode?: string | null;
  title: string;
  isHome: boolean;
  openCart: () => void;
  openMenu: () => void;
}) {
  const {y} = useWindowScroll();

  const styles = {
    button: 'relative flex items-center justify-center w-8 h-8',
    container: `${
      isHome
        ? 'bg-primary/80 dark:bg-contrast/60 text-contrast dark:text-primary shadow-darkHeader'
        : 'bg-contrast/80 text-primary'
    } ${
      y > 50 && !isHome ? 'shadow-lightHeader ' : ''
    }flex lg:hidden items-center h-nav sticky backdrop-blur-lg z-40 top-0 justify-between w-full leading-none gap-4 px-4 md:px-8`,
  };

  return (
    <header role="banner" className={styles.container}>
      <div className="flex items-center justify-start w-full gap-4">
        <button onClick={openMenu} className={styles.button}>
          <IconMenu />
        </button>
        <form
          action={`/${countryCode ? countryCode + '/' : ''}search`}
          className="items-center gap-2 sm:flex"
        >
          <button type="submit" className={styles.button}>
            <IconSearch />
          </button>
          <Input
            className={
              isHome
                ? 'focus:border-contrast/20 dark:focus:border-primary/20'
                : 'focus:border-primary/20'
            }
            type="search"
            variant="minisearch"
            placeholder="Search"
            name="q"
          />
        </form>
      </div>

      <Link
        className="flex items-center self-stretch leading-[3rem] md:leading-[4rem] justify-center flex-grow w-full h-full"
        to="/"
      >
        <Heading className="font-bold text-center" as={isHome ? 'h1' : 'h2'}>
          {title}
        </Heading>
      </Link>

      <div className="flex items-center justify-end w-full gap-4">
        <Link to={'/account'} className={styles.button}>
          <IconAccount />
        </Link>
        <button onClick={openCart} className={styles.button}>
          <IconBag />
          <CartBadge dark={isHome} />
        </button>
      </div>
    </header>
  );
}

function DesktopHeader({
  countryCode,
  isHome,
  menu,
  openCart,
  title,
}: {
  countryCode?: string | null;
  isHome: boolean;
  openCart: () => void;
  menu?: EnhancedMenu;
  title: string;
}) {
  const {y} = useWindowScroll();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<
    Record<
      'products' | 'pages' | 'articles',
      {
        id: string;
        title: string;
        image: {url: string; altText?: string} | undefined;
        url: string;
      }[]
    >
  >({
    products: [],
    pages: [],
    articles: [],
  });
  const [inputFocused, setInputFocused] = useState(false);

  const {
    language: {isoCode: languageCode},
  } = useLocalization();

  useDebounce(
    () => {
      if (!search) {
        setSearchResults({
          products: [],
          articles: [],
          pages: [],
        });
        return;
      }

      const controller = new AbortController();
      const fetchData = async () => {
        try {
          const postUrl = `/predictiveSearch?query=${search}&language=${languageCode}&country=${
            countryCode ?? 'US'
          }`;

          const response = await fetch(postUrl, {
            method: 'POST',
            signal: controller.signal,
          });

          // TODO: type this
          const {data} = await response.json();

          const getQueryParams = (resource: any) => {
            return resource.searchTrackingParameters
              ? `?${resource.searchTrackingParameters}`
              : '';
          };

          setSearchResults({
            products: data.predictiveSearch.products.map((product: any) => {
              return {
                title: product.title,
                image: product.variants?.nodes?.[0]?.image,
                url: `/products/${product.handle}${getQueryParams(product)}`,
              };
            }),
            articles: data.predictiveSearch.articles.map((article: any) => {
              return {
                title: article.title,
                image: article.image,
                url: `/journal/${article.handle}${getQueryParams(article)}`,
              };
            }),
            pages: data.predictiveSearch.pages.map((page: any) => {
              return {
                title: page.title,
                image: undefined,
                url: `/pages/${page.handle}${getQueryParams(page)}`,
              };
            }),
          });
        } catch {
          /* empty */
        }
      };

      fetchData();
      return () => {
        controller.abort();
      };
    },
    500,
    [countryCode, languageCode, search],
  );

  const styles = {
    button:
      'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5',
    container: `${
      isHome
        ? 'bg-primary/80 dark:bg-contrast/60 text-contrast dark:text-primary shadow-darkHeader'
        : 'bg-contrast/80 text-primary'
    } ${
      y > 50 && !isHome ? 'shadow-lightHeader ' : ''
    }hidden h-nav lg:flex items-center sticky transition duration-300 backdrop-blur-lg z-40 top-0 justify-between w-full leading-none gap-8 px-12 py-8`,
  };

  return (
    <header role="banner" className={styles.container}>
      <div className="flex gap-12">
        <Link className={`font-bold`} to="/">
          {title}
        </Link>
        <nav className="flex gap-8">
          {/* Top level menu items */}
          {(menu?.items || []).map((item) => (
            <Link key={item.id} to={item.to} target={item.target}>
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <form
            action={`/${countryCode ? countryCode + '/' : ''}search`}
            className="flex items-center gap-2"
            onSubmit={(e) => {
              if (!search) {
                e.preventDefault();
              }
            }}
          >
            <Input
              className={
                isHome
                  ? 'focus:border-contrast/20 dark:focus:border-primary/20'
                  : 'focus:border-primary/20'
              }
              type="search"
              variant="minisearch"
              placeholder="Search"
              name="q"
              value={search}
              onFocus={() => setInputFocused(true)}
              onBlur={() => {
                setTimeout(() => setInputFocused(false), 200);
              }}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
            <button type="submit" className={styles.button}>
              <IconSearch />
            </button>
          </form>

          {inputFocused && search.length > 0 && (
            <div className="absolute top-full mt-2 w-full">
              <div className="bg-white text-gray-800 p-4 flex flex-col gap-8">
                {Object.values(searchResults).some(
                  (items) => items.length > 0,
                ) && (
                  <div className="flex flex-col gap-4">
                    {Object.entries(searchResults)
                      .filter(([_key, items]) => items.length > 0)
                      .map(([key, items]) => {
                        const categoryName = {
                          products: 'Products',
                          articles: 'Articles',
                          pages: 'Pages',
                        }[key];

                        return (
                          <div key={key} className="grid gap-1">
                            <div className="font-light text-sm underline">
                              {categoryName}
                            </div>

                            <ol className="grid gap-2">
                              {items.map((item) => (
                                <li key={item.id}>
                                  <Link
                                    className="flex items-center gap-x-2"
                                    to={item.url}
                                  >
                                    {item.image?.url && (
                                      <Image
                                        width={24}
                                        height={24}
                                        src={fixImageUrl(item.image.url)}
                                        className="w-6 h-6 object-cover"
                                        alt={item.image.altText ?? ''}
                                      />
                                    )}

                                    <div className="truncate flex-grow">
                                      {item.title}
                                    </div>
                                  </Link>
                                </li>
                              ))}
                            </ol>
                          </div>
                        );
                      })}
                  </div>
                )}

                <Link
                  className="flex gap-1 items-center"
                  to={`/search?q=${search}`}
                >
                  <div>
                    <IconSearch />
                  </div>
                  <div>
                    Search for <q>{search}</q>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
        <Link to={'/account'} className={styles.button}>
          <IconAccount />
        </Link>
        <button onClick={openCart} className={styles.button}>
          <IconBag />
          <CartBadge dark={isHome} />
        </button>
      </div>
    </header>
  );
}

function CartBadge({dark}: {dark: boolean}) {
  const {totalQuantity} = useCart();

  if (totalQuantity < 1) {
    return null;
  }
  return (
    <div
      className={`${
        dark
          ? 'text-primary bg-contrast dark:text-contrast dark:bg-primary'
          : 'text-contrast bg-primary'
      } absolute bottom-1 right-1 text-[0.625rem] font-medium subpixel-antialiased h-3 min-w-[0.75rem] flex items-center justify-center leading-none text-center rounded-full w-auto px-[0.125rem] pb-px`}
    >
      <span>{totalQuantity}</span>
    </div>
  );
}
