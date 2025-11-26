import Loader from '../components/Loader';

type Column<T> = {
  header: React.ReactNode;
  render: (item: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  headerContent?: React.ReactNode;
  renderActions?: (item: T) => React.ReactNode;
  actionsHeader?: React.ReactNode;
  rowKey?: (item: T, index: number) => string;
  actionCellClassName?: string;
};

const defaultHeaderClass =
  'px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider';
const defaultCellClass = 'px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium';

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
}: DataTableProps<T>) {
  const totalColumns = columns.length + (renderActions ? 1 : 0);
  const computeRowKey = rowKey || ((_: T, index: number) => `row-${index}`);

  return (
    <div className="table-responsive">
      {headerContent && (
        <div className="px-4 py-3 border-b-2 border-purple/20 bg-white">{headerContent}</div>
      )}
      <table className="w-full border-collapse">
        <thead className="bg-gradient-to-r from-purple to-purple-dark text-white">
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
          {loading ? (
            <tr>
              <td colSpan={totalColumns} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-600">
                  <Loader size="md" />
                  <span>{loadingMessage || 'Chargement...'}</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={totalColumns}
                className="px-6 py-16 text-center bg-gray-light text-gray-dark font-medium"
              >
                {emptyMessage || 'Aucune donnée à afficher'}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
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
    </div>
  );
}

export default DataTable;

