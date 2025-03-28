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
   * Table title
   */
  title: string;

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
}

/**
 * Component to display a paginated table with sorting and filtering
 * @param permission Permission required to view this table
 * @param dataUrl API endpoint URL for fetching data
 * @param title Table title
 * @param columns Column definitions
 * @param defaultPageSize Default page size
 * @param defaultSortField Default sort field
 * @param defaultSortOrder Default sort order
 * @example Custom column rendering
 * ```tsx
 * <PaginatedTable
 * dataUrl={`${import.meta.env.API_BASE_URL}/products`}
 * title="product-list"
 * permission={import.meta.env.ADMIN_PERMISSION}
 * columns={[
 *   { field: "name", label: "Product Name", sortable: true },
 *   { field: "price", label: "Price", sortable: true,
 *     render: (item) => `$${item.price.toFixed(2)}`
 *   },
 *   { field: "status", label: "Status",
 *     render: (item) => (
 *       <div className={`status-badge ${item.status}`}>
 *         {item.status.toUpperCase()}
 *       </div>
 *     )
 *   },
 *   { field: "actions", label: "Actions",
 *     render: (item) => (
 *       <div className="flex gap-2">
 *         <Button size="sm" color="primary" onPress={() => editProduct(item.uuid)}>
 *           Edit
 *         </Button>
 *         <Button size="sm" color="danger" onPress={() => deleteProduct(item.uuid)}>
 *           Delete
 *         </Button>
 *       </div>
 *     )
 *   }
 * ]}
 *   defaultSortField="name"
 *   defaultPageSize={20}
 * />
 * ```
 * @returns
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
        setItems(response[dataKey] || []);
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
  }, [page, limit, sort, order, isAuthenticated, dataUrl]);

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
        <h1 className={titleStyle()}>
          <Trans t={t}>{title}</Trans>
        </h1>
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
          aria-label={title}
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
          <TableBody emptyContent={t("no-data-available")} items={items}>
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
