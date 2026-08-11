// Shared domain types for mobile app — declared locally to avoid missing package issues.
// The web package @urbanmind/shared-types may not have TypeScript declarations published.

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}