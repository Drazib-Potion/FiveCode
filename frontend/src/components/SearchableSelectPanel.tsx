import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Loader from './Loader';

export type SearchableSelectItem<T> = {
  key: string;
  label: string | JSX.Element;
  value: T;
  disabled?: boolean;
};

export interface SearchableSelectPanelProps<T> {
  label: string;
  items?: SearchableSelectItem<T>[];
  selectedKeys?: string[];
  onToggle: (key: string) => void;
  placeholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  searchValue?: string;
  onSearchChange?: (term: string) => void;
  renderItem?: (item: SearchableSelectItem<T>, index: number) => JSX.Element;
  footer?: React.ReactNode;
  fetchOptions?: (params: {
    offset: number;
    limit: number;
    search?: string;
  }) => Promise<SearchableSelectItem<T>[]>;
  limit?: number;
  initialItems?: SearchableSelectItem<T>[];
  showSelectAll?: boolean;
  selectAllLabel?: string;
  onToggleAll?: (visibleKeys: string[]) => void;
  extraSlot?: React.ReactNode;
  mode?: 'single' | 'multiple';
}

export default function SearchableSelectPanel<T>({
  label,
  items,
  selectedKeys = [],
  onToggle,
  placeholder = 'Rechercher...',
  loading = false,
  emptyMessage = 'Aucun élément trouvé',
  className = '',
  searchValue = '',
  onSearchChange,
  renderItem,
  footer,
  fetchOptions,
  limit = 30,
  initialItems,
  showSelectAll = false,
  selectAllLabel = 'Tout cocher / Tout décocher',
  onToggleAll,
  extraSlot,
  mode = 'multiple',
}: SearchableSelectPanelProps<T>) {
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const [itemsState, setItemsState] = useState<SearchableSelectItem<T>[]>(
    initialItems ?? items ?? [],
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchValue);
  const offsetRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (reset = false, search: string = '') => {
      if (!fetchOptions) return;
      setLocalLoading(true);
      const nextOffset = reset ? 0 : offsetRef.current;
      try {
        const nextItems = await fetchOptions({
          offset: nextOffset,
          limit,
          search: search.trim() || undefined,
        });
        setItemsState((prev) => {
          if (reset) return nextItems;
          const merged = new Map(prev.map((item) => [item.key, item]));
          nextItems.forEach((item) => {
            if (!merged.has(item.key)) {
              merged.set(item.key, item);
            }
          });
          return Array.from(merged.values());
        });
        setHasMore(nextItems.length === limit);
        offsetRef.current = nextOffset + nextItems.length;
      } finally {
        setLocalLoading(false);
      }
    },
    [fetchOptions, limit],
  );

  useEffect(() => {
    setInternalSearch(searchValue);
    setDebouncedSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(internalSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [internalSearch]);

  useEffect(() => {
    if (!fetchOptions) {
      setItemsState(items ?? []);
      return;
    }
    offsetRef.current = 0;
    setHasMore(true);
    load(true, debouncedSearch);
  }, [fetchOptions, debouncedSearch, load, items]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !fetchOptions) return;
      const handler = () => {
        if (!hasMore || localLoading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
          load(false, debouncedSearch);
        }
      };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [fetchOptions, hasMore, localLoading, load]);

  const filteredItems = useMemo(() => {
    if (fetchOptions) return itemsState;
    if (!internalSearch.trim()) return items ?? [];
    const term = internalSearch.trim().toLowerCase();
    return (items ?? []).filter((item) =>
      String(item.label).toLowerCase().includes(term),
    );
  }, [items, internalSearch, fetchOptions, itemsState]);

  const handleInputChange = (value: string) => {
    setInternalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-purple/20 shadow-lg p-5 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-dark uppercase tracking-wider">
          {label}
        </h3>
        {(loading || localLoading) && <Loader size="sm" className="ml-2" />}
      </div>
      <input
        type="text"
        value={internalSearch}
        onChange={(event) => handleInputChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
      />
      {extraSlot}
      <div
        ref={containerRef}
        className="border border-gray-200 rounded p-3 max-h-[240px] overflow-y-auto bg-gray-50"
      >
        {filteredItems.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8 m-0">
            {emptyMessage}
          </p>
        ) : (
          filteredItems.map((item, index) => {
            if (renderItem) {
              return renderItem(item, index);
            }
            return (
              <label
                key={item.key}
                className={`flex items-center px-3 py-2 mb-2 rounded cursor-pointer transition-colors duration-200 ${
                  selectedKeys.includes(item.key)
                    ? 'bg-purple/10 text-purple'
                    : 'hover:bg-gray-100'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type={mode === 'single' ? 'radio' : 'checkbox'}
                  checked={selectedKeys.includes(item.key)}
                  disabled={item.disabled}
                  onChange={() => !item.disabled && onToggle(item.key)}
                  className="mr-2 cursor-pointer"
                />
                <span className="text-sm text-gray-800">{item.label}</span>
              </label>
            );
          })
        )}
        {fetchOptions && localLoading && (
          <div className="flex items-center justify-center mt-2">
            <Loader size="sm" />
          </div>
        )}
      </div>
      {showSelectAll && (
        <label className="flex items-center gap-2 text-xs text-purple uppercase tracking-wider">
          <input
            type="checkbox"
            checked={
              filteredItems.length > 0 &&
              filteredItems.every((item) => selectedKeys.includes(item.key))
            }
            onChange={() => onToggleAll?.(filteredItems.map((item) => item.key))}
            className="h-4 w-4 cursor-pointer"
          />
          <span>{selectAllLabel}</span>
        </label>
      )}
      {footer && <div>{footer}</div>}
    </div>
  );
}

