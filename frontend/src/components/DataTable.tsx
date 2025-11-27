import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Loader from '../components/Loader';

type Column<T> = {
  header: React.ReactNode;
  render: (item: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type FetchParams = {
  offset: number;
  limit: number;
  search?: string;
};

type FetchResult<T> =
  | T[]
  | {
      data?: T[];
      hasMore?: boolean;
    };

type DataTableProps<T> = {
  columns: Column<T>[];
  data?: T[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  headerContent?: React.ReactNode;
  renderActions?: (item: T) => React.ReactNode;
  actionsHeader?: React.ReactNode;
  rowKey?: (item: T, index: number) => string;
  actionCellClassName?: string;
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearch?: (term: string) => void;
  searchFields?: (item: T) => string[];
  filterFunction?: (item: T, term: string) => boolean;
  fetchData?: (params: FetchParams) => Promise<FetchResult<T>>;
  limit?: number;
  initialData?: T[];
  reloadKey?: unknown;
};

const defaultHeaderClass =
  'px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider';
const defaultCellClass =
  'px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium';

function DataTable<T>({
  columns,
  data,
  loading,
  loadingMessage,
  emptyMessage,
  headerContent,
  renderActions,
  actionsHeader = 'Actions',
  rowKey,
  actionCellClassName,
  searchPlaceholder,
  searchTerm,
  onSearch,
  searchFields,
  filterFunction,
  fetchData,
  limit,
  initialData,
  reloadKey,
}: DataTableProps<T>) {
  const totalColumns = columns.length + (renderActions ? 1 : 0);
  const computeRowKey = rowKey || ((_: T, index: number) => `row-${index}`);
  const dataset = useMemo(() => data ?? [], [data]);

  const isControlled = searchTerm !== undefined;
  const [localTerm, setLocalTerm] = useState(searchTerm ?? '');

  useEffect(() => {
    if (isControlled) {
      setLocalTerm(searchTerm ?? '');
    }
  }, [isControlled, searchTerm]);

  const currentSearchTerm = isControlled ? searchTerm ?? '' : localTerm;
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(currentSearchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(currentSearchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [currentSearchTerm]);

  const handleSearchChange = (value: string) => {
    if (!isControlled) {
      setLocalTerm(value);
    }
    if (onSearch) {
      onSearch(value);
    }
  };

  const normalizedTerm = currentSearchTerm.trim().toLowerCase();
  const canFilter = Boolean(
    normalizedTerm && (searchFields || filterFunction),
  );

  const limitValue = limit ?? 20;
  const [itemsState, setItemsState] = useState<T[]>(initialData ?? []);
  const offsetRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(
    async (reset = false, search = '') => {
      if (!fetchData) return;
      setLocalLoading(true);
      const nextOffset = reset ? 0 : offsetRef.current;
      const trimmedSearch = search.trim();
      try {
        const fetchResult = await fetchData({
          offset: nextOffset,
          limit: limitValue,
          search: trimmedSearch || undefined,
        });
        const nextItems = Array.isArray(fetchResult)
          ? fetchResult
          : fetchResult.data ?? [];
        const derivedHasMore = Array.isArray(fetchResult)
          ? nextItems.length === limitValue
          : typeof fetchResult.hasMore === 'boolean'
          ? fetchResult.hasMore
          : nextItems.length === limitValue;
        setItemsState((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        setHasMore(derivedHasMore);
        offsetRef.current = nextOffset + nextItems.length;
      } catch (error) {
        console.error('DataTable fetch error:', error);
      } finally {
        setLocalLoading(false);
      }
    },
    [fetchData, limitValue],
  );

  useEffect(() => {
    if (!fetchData) return;
    offsetRef.current = 0;
    setHasMore(true);
    loadData(true, debouncedSearchTerm);
  }, [fetchData, debouncedSearchTerm, loadData, reloadKey]);

  useEffect(() => {
    if (!fetchData || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            hasMore &&
            !localLoading
          ) {
            loadData(false, debouncedSearchTerm);
          }
        });
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
      },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [fetchData, hasMore, localLoading, loadData, debouncedSearchTerm]);

  const filteredData = useMemo(() => {
    if (fetchData) {
      return itemsState;
    }
    if (!canFilter) return dataset;
    return dataset.filter((item) => {
      if (filterFunction) {
        return filterFunction(item, normalizedTerm);
      }
      if (!searchFields) {
        return true;
      }
      return searchFields(item).some(
        (value) => value?.toLowerCase().includes(normalizedTerm),
      );
    });
  }, [
    canFilter,
    dataset,
    filterFunction,
    normalizedTerm,
    searchFields,
    fetchData,
    itemsState,
  ]);

  const showSearchBar = Boolean(
    searchPlaceholder ||
      onSearch ||
      searchFields ||
      filterFunction ||
      searchTerm !== undefined,
  );

  const searchBar = showSearchBar ? (
    <div className="mb-3 flex justify-start">
      <div className="w-full max-w-[380px]">
        <input
          type="text"
          placeholder={searchPlaceholder || 'Rechercher...'}
          value={currentSearchTerm}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="w-full px-3 py-2 border border-purple/40 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:border-purple/40"
        />
      </div>
    </div>
  ) : null;

  const headerBlocks = [];
  if (searchBar) {
    headerBlocks.push(searchBar);
  }
  if (headerContent) {
    headerBlocks.push(headerContent);
  }

  const rows = fetchData ? filteredData : canFilter ? filteredData : dataset;
  const isLoading = fetchData ? localLoading : loading;
  const showLoaderRow = Boolean(isLoading && rows.length === 0);

  return (
    <div className="table-responsive">
      {headerBlocks.length > 0 && (
        <div className="px-4 py-3 border-b-2 border-purple/20 bg-white">
          {headerBlocks.map((block, index) => (
            <div key={`header-block-${index}`}>{block}</div>
          ))}
        </div>
      )}
      <table className="w-full border-collapse">
        <thead className="bg-linear-to-r from-purple to-purple-dark text-white">
          <tr>
            {columns.map((column, index) => (
              <th
                key={`header-${index}`}
                className={column.headerClassName || defaultHeaderClass}
              >
                {column.header}
              </th>
            ))}
            {renderActions && (
              <th className={defaultHeaderClass}>{actionsHeader}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {showLoaderRow ? (
            <tr>
              <td colSpan={totalColumns} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-600">
                  <Loader size="md" />
                  <span>{loadingMessage || 'Chargement...'}</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={totalColumns}
                className="px-6 py-16 text-center bg-gray-light text-gray-dark font-medium"
              >
                {emptyMessage || 'Aucune donnée à afficher'}
              </td>
            </tr>
          ) : (
            rows.map((item, index) => (
              <tr
                key={computeRowKey(item, index)}
                className={`transition-colors duration-200 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-light'
                } hover:bg-gray-hover`}
              >
                {columns.map((column, columnIndex) => (
                  <td
                    key={`cell-${columnIndex}`}
                    className={column.cellClassName || defaultCellClass}
                  >
                    {column.render(item)}
                  </td>
                ))}
                {renderActions && (
                  <td className={actionCellClassName || defaultCellClass}>
                    {renderActions(item)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {fetchData && rows.length > 0 && localLoading && (
        <div className="flex items-center justify-center gap-2 py-3 text-gray-600">
          <Loader size="sm" />
          <span>{loadingMessage || 'Chargement...'}</span>
        </div>
      )}
      {fetchData && hasMore && (
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      )}
    </div>
  );
}

export default DataTable;

