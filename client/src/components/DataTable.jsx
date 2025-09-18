import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const DataTable = ({ 
  data = [], 
  columns = [], 
  searchable = true,
  filterable = true,
  sortable = true,
  pagination = true,
  pageSize = 10,
  className = "",
  onRowClick = null,
  emptyMessage = "No data available"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Get filterable columns
  const filterableColumns = columns.filter(col => col.filterable !== false);

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchableText = columns
          .filter(col => col.searchable !== false)
          .map(col => {
            const value = col.accessor ? 
              (typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor]) : 
              '';
            return String(value).toLowerCase();
          })
          .join(' ');
        
        if (!searchableText.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Column filters
      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== '') {
          const column = columns.find(col => col.key === key);
          if (column) {
            const itemValue = column.accessor ? 
              (typeof column.accessor === 'function' ? column.accessor(item) : item[column.accessor]) : 
              '';
            const stringValue = String(itemValue).toLowerCase();
            if (!stringValue.includes(String(value).toLowerCase())) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [data, searchTerm, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const column = columns.find(col => col.key === sortConfig.key);
      if (!column) return 0;

      const aValue = column.accessor ? 
        (typeof column.accessor === 'function' ? column.accessor(a) : a[column.accessor]) : 
        '';
      const bValue = column.accessor ? 
        (typeof column.accessor === 'function' ? column.accessor(b) : b[column.accessor]) : 
        '';

      if (column.sortType === 'number') {
        const aNum = parseFloat(aValue) || 0;
        const bNum = parseFloat(bValue) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (column.sortType === 'date') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-primary-600" /> : 
      <ArrowDown className="h-4 w-4 text-primary-600" />;
  };

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item);
    }
    
    const value = column.accessor ? 
      (typeof column.accessor === 'function' ? column.accessor(item) : item[column.accessor]) : 
      '';
    
    return value;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Controls */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            {searchable && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            )}

            {/* Filter Toggle */}
            {filterable && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
              >
                <Filter className="h-4 w-4" />
                Filters
                {Object.values(filters).some(f => f && f !== '') && (
                  <span className="bg-danger-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {Object.values(filters).filter(f => f && f !== '').length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Clear Filters */}
          {(searchTerm || Object.values(filters).some(f => f && f !== '')) && (
            <button
              onClick={clearFilters}
              className="btn btn-ghost text-sm flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && filterable && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterableColumns.map(column => (
              <div key={column.key}>
                <label className="label">{column.header}</label>
                <input
                  type="text"
                  placeholder={`Filter by ${column.header.toLowerCase()}...`}
                  value={filters[column.key] || ''}
                  onChange={(e) => handleFilterChange(column.key, e.target.value)}
                  className="input"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className={`${sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''} select-none`}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.header}</span>
                      {sortable && column.sortable !== false && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    onClick={() => onRowClick && onRowClick(item)}
                  >
                    {columns.map(column => (
                      <td key={column.key}>
                        {renderCell(item, column)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`btn btn-sm ${
                      currentPage === pageNum ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  <span className="text-gray-400">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`btn btn-sm ${
                      currentPage === totalPages ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;

