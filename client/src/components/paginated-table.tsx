/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { useEffect, useState, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Trans, useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  TableProps,
} from "@heroui/table";
import { Pagination, PaginationProps } from "@heroui/pagination";
import { Spinner } from "@heroui/spinner";

import { title as titleStyle } from "@/components/primitives";
import {
  AuthenticationGuardWithPermission,
  getJsonFromSecuredApi,
} from "@/components/auth0";
import { OrderCriteria } from "@/types/data";

export interface ColumnDefinition {
  /**
   * Field name from the data object
   */
  field: string;

  /**
   * Label to display in the table header
   */
  label: string;

  /**
   * Optional custom renderer for this column
   */
  render?: (item: any) => ReactNode;

  /**
   * Whether this column is sortable
   * @default false
   */
  sortable?: boolean;
}

export interface PaginatedTableProps {
  /**
   * Permission required to view this table
   */
  permission?: string;

  /**
   * API endpoint URL for fetching data
   */
  dataUrl: string;

  /**
   * Table title or a function that renders a custom title
   */
  title: string | (() => ReactNode);

  /**
   * Column definitions
   */
  columns: ColumnDefinition[];

  /**
   * Default page size
   * @default 10
   */
  defaultPageSize?: number;

  /**
   * Default sort field
   */
  defaultSortField?: string;

  /**
   * Default sort order
   * @default "asc"
   */
  defaultSortOrder?: OrderCriteria;

  /**
   * Optional props to pass to the HeroUI Table component
   */
  tableProps?: Partial<TableProps>;

  /**
   * Optional props to pass to the HeroUI Pagination component
   */
  paginationProps?: Partial<PaginationProps>;

  /**
   * Optional empty state content
   */
  emptyContent?: ReactNode;

  /**
   * Response key for data items
   * @default "data"
   */
  dataKey?: string;

  /**
   * Response key for total count
   * @default "total"
   */
  totalKey?: string;

  /**
   * Response key for current page
   * @default "page"
   */
  pageKey?: string;

  /**
   * Response key for page size
   * @default "limit"
   */
  limitKey?: string;

  /**
   * Function to check if the response is successful
   * @default (response) => response?.success === true
   */
  isSuccessfulResponse?: (response: any) => boolean;

  /**
   * Key to use as a unique identifier for rows
   * @default "uuid"
   */
  rowKey?: string;

  /**
   * Optional value that triggers a data refresh when changed
   * Useful for refreshing the table after external data modifications
   */
  refreshTrigger?: any;
}

/**
 * Component to display a paginated table with sorting and filtering capabilities
 *
 * Features:
 * - Pagination with customizable page size
 * - Column sorting (ascending/descending)
 * - Custom column rendering
 * - Custom title rendering
 * - Authentication and permission checks
 * - Loading states and error handling
 * - Empty state customization
 *
 * @param permission - Permission required to view this table
 * @param dataUrl - API endpoint URL for fetching data
 * @param title - Table title (string) or a function that renders a custom title
 * @param columns - Column definitions
 * @param defaultPageSize - Default number of items per page (default: 10)
 * @param defaultSortField - Default field to sort by
 * @param defaultSortOrder - Default sort order ("asc" or "desc")
 * @param tableProps - Additional props to pass to the Table component
 * @param paginationProps - Additional props to pass to the Pagination component
 * @param emptyContent - Custom content to display when no data is available
 * @param dataKey - Response key for data items (default: "data")
 * @param totalKey - Response key for total count (default: "total")
 * @param pageKey - Response key for current page (default: "page")
 * @param limitKey - Response key for page size (default: "limit")
 * @param isSuccessfulResponse - Function to check if the response is successful
 * @param rowKey - Key to use as a unique identifier for rows (default: "uuid")
 * @param refreshTrigger - Optional value that triggers a data refresh when changed
 *
 * @example Basic Usage
 * ```tsx
 * <PaginatedTable
 *   dataUrl="/api/users"
 *   title="Users"
 *   columns={[
 *     { field: "name", label: "Name", sortable: true },
 *     { field: "email", label: "Email" },
 *     { field: "role", label: "Role" }
 *   ]}
 * />
 * ```
 *
 * @example With Pagination and Sorting
 * ```tsx
 * <PaginatedTable
 *   dataUrl="/api/products"
 *   title="Products"
 *   columns={[
 *     { field: "name", label: "Name", sortable: true },
 *     { field: "category", label: "Category", sortable: true },
 *     { field: "price", label: "Price", sortable: true }
 *   ]}
 *   defaultPageSize={20}
 *   defaultSortField="name"
 *   defaultSortOrder="asc"
 * />
 * ```
 *
 * @example With Custom Column Rendering
 * ```tsx
 * <PaginatedTable
 *   dataUrl="/api/orders"
 *   title="Orders"
 *   columns={[
 *     { field: "id", label: "Order ID" },
 *     {
 *       field: "status",
 *       label: "Status",
 *       render: (item) => (
 *         <Badge
 *           color={item.status === 'completed' ? 'success' :
 *                  item.status === 'pending' ? 'warning' : 'danger'}
 *         >
 *           {item.status.toUpperCase()}
 *         </Badge>
 *       )
 *     },
 *     {
 *       field: "total",
 *       label: "Total",
 *       render: (item) => `$${item.total.toFixed(2)}`
 *     },
 *     {
 *       field: "actions",
 *       label: "Actions",
 *       render: (item) => (
 *         <div className="flex gap-2">
 *           <Button size="sm" onPress={() => viewOrder(item.id)}>View</Button>
 *           <Button size="sm" color="danger" onPress={() => cancelOrder(item.id)}>Cancel</Button>
 *         </div>
 *       )
 *     }
 *   ]}
 *   rowKey="id"
 * />
 * ```
 *
 * @example With Custom Title Rendering and Required Permission
 * ```tsx
 * <PaginatedTable
 *   permission="admin:access"
 *   dataUrl="/api/inventory"
 *   title={() => (
 *     <div className="flex flex-col gap-2">
 *       <div className="flex items-center justify-center gap-2">
 *         <InventoryIcon className="w-6 h-6 text-primary" />
 *         <h1 className="text-2xl font-bold">{t("inventory-management")}</h1>
 *       </div>
 *       <div className="flex justify-center gap-2">
 *         <Button size="sm" startContent={<DownloadIcon />} onPress={exportInventory}>
 *           {t("export")}
 *         </Button>
 *         <Button size="sm" startContent={<PlusIcon />} onPress={openAddProductModal}>
 *           {t("add-product")}
 *         </Button>
 *       </div>
 *     </div>
 *   )}
 *   columns={[
 *     { field: "sku", label: "SKU", sortable: true },
 *     { field: "name", label: "Product", sortable: true },
 *     {
 *       field: "stock",
 *       label: "Stock Level",
 *       sortable: true,
 *       render: (item) => (
 *         <div className="flex items-center gap-2">
 *           <div className={`w-3 h-3 rounded-full ${
 *             item.stock > 20 ? "bg-success" :
 *             item.stock > 5 ? "bg-warning" : "bg-danger"
 *           }`} />
 *           <span>{item.stock} units</span>
 *         </div>
 *       )
 *     },
 *     {
 *       field: "lastUpdated",
 *       label: "Last Updated",
 *       sortable: true,
 *       render: (item) => new Date(item.lastUpdated).toLocaleDateString()
 *     }
 *   ]}
 *   emptyContent={
 *     <div className="p-6 text-center">
 *       <NoDataIcon className="w-12 h-12 mx-auto text-muted-foreground" />
 *       <p className="mt-2">{t("no-inventory-items")}</p>
 *       <Button className="mt-4" onPress={openAddProductModal}>
 *         {t("add-first-product")}
 *       </Button>
 *     </div>
 *   }
 * />
 * ```
 *
 * @returns A paginated table component with the specified configuration
 */
export default function PaginatedTable({
  permission,
  dataUrl,
  title,
  columns,
  defaultPageSize = 10,
  defaultSortField,
  defaultSortOrder = "asc",
  tableProps = {},
  paginationProps = {},
  emptyContent,
  dataKey = "data",
  totalKey = "total",
  pageKey = "page",
  limitKey = "limit",
  isSuccessfulResponse = (response) => response?.success === true,
  rowKey = "uuid",
  refreshTrigger,
}: PaginatedTableProps) {
  const { t } = useTranslation();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(defaultPageSize);
  const [sort, setSort] = useState(defaultSortField || columns[0]?.field || "");
  const [order, setOrder] = useState(defaultSortOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch data from the API
   */
  const fetchData = async (
    page: number,
    limit: number,
    sort: string,
    order: OrderCriteria,
  ) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      // Construct the URL with query parameters
      const url = new URL(dataUrl);

      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", limit.toString());

      if (sort) {
        url.searchParams.append("sort", sort);
        url.searchParams.append("order", order);
      }

      const response = await getJsonFromSecuredApi(
        url.toString(),
        getAccessTokenSilently,
      );

      if (isSuccessfulResponse(response)) {
        // Vérifier que chaque élément a une propriété correspondant à rowKey
        const data = response[dataKey] || [];

        // Vérifier si au moins un élément existe et n'a pas la clé requise
        if (data.length > 0 && data.some((item: any) => !item[rowKey])) {
          // eslint-disable-next-line no-console
          console.warn(
            `Warning: Some items don't have the required unique key '${rowKey} did you defined a rowKey (uuid is the default one)'.`,
          );

          setError(t("error-missing-unique-key", { key: rowKey }));
          setItems([]);
        } else {
          // Tout est en ordre
          setItems(data);
        }

        setPage(response[pageKey] || page);
        setTotal(response[totalKey] || 0);
        setLimit(response[limitKey] || limit);
      } else {
        setError(t("error-fetching-data"));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : t("error-unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    fetchData(page, limit, sort, order);
  }, [page, limit, sort, order, isAuthenticated, dataUrl, refreshTrigger]);

  /**
   * Handle sort change
   */
  const handleSortChange = (columnField: string) => {
    // If clicking the same column, toggle the order
    if (columnField === sort) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      // If clicking a different column, set it as the sort column with "asc" order
      setSort(columnField);
      setOrder("asc");
    }
    // Reset to page 1 when sort changes
    setPage(1);
  };

  /**
   * Render the content
   */
  const renderContent = () => (
    <div className="w-full">
      <div className="text-center mb-6">
        {typeof title === "function" ? (
          // If title is a function, call it to render custom content
          title()
        ) : (
          // If title is a string, render it as before
          <h1 className={titleStyle()}>
            <Trans t={t}>{title}</Trans>
          </h1>
        )}
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-danger text-center p-4 border border-danger-200 rounded-md bg-danger-50">
          {error}
        </div>
      ) : items.length === 0 ? (
        emptyContent || (
          <div className="text-center text-muted-foreground p-4">
            {t("no-data-available")}
          </div>
        )
      ) : (
        <Table
          aria-label={typeof title === "string" ? title : "Paginated Table"}
          bottomContent={
            total > limit && (
              <div className="flex justify-center">
                <Pagination
                  isCompact
                  showControls
                  showShadow
                  color="secondary"
                  page={page}
                  total={Math.ceil(total / limit)}
                  onChange={(newPage) => setPage(newPage)}
                  {...paginationProps}
                />
              </div>
            )
          }
          className="my-4"
          {...tableProps}
        >
          <TableHeader>
            {columns.map((column) => (
              <TableColumn
                key={column.field}
                className={column.sortable ? "cursor-pointer select-none" : ""}
                onClick={
                  column.sortable
                    ? () => handleSortChange(column.field)
                    : undefined
                }
              >
                <div className="flex items-center gap-1">
                  {t(column.label)}
                  {column.sortable && sort === column.field && (
                    <span>{order === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            key={rowKey}
            emptyContent={t("no-data-available")}
            items={items}
          >
            {(item) => (
              <TableRow key={item[rowKey]}>
                {columns.map((column) => (
                  <TableCell key={`${item[rowKey]}-${column.field}`}>
                    {column.render
                      ? column.render(item)
                      : renderCellValue(item, column.field)}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );

  /**
   * Helper to render a cell value based on the field path
   */
  const renderCellValue = (item: any, field: string) => {
    // Handle nested properties using dot notation (e.g., "user.name")
    if (field.includes(".")) {
      return field.split(".").reduce((obj, key) => obj?.[key], item);
    }

    // Handle arrays (e.g., for the ids joining)
    if (Array.isArray(item[field])) {
      return item[field].join(", ");
    }
    // Handle boolean values
    if (typeof item[field] === "boolean") {
      return item[field] ? t("yes") : t("no");
    }
    // Handle numbers
    if (typeof item[field] === "number") {
      return item[field].toLocaleString();
    }
    // Handle dates
    if (item[field] instanceof Date) {
      return item[field].toLocaleDateString();
    }

    return item[field];
  };

  // Wrap with authentication guard if permission is provided
  if (permission) {
    return (
      <AuthenticationGuardWithPermission permission={permission}>
        {renderContent()}
      </AuthenticationGuardWithPermission>
    );
  }

  return renderContent();
}
