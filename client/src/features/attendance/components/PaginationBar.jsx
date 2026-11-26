import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import './PaginationBar.css';

const PaginationBar = ({
  currentPage,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  if (totalRecords === 0) return null;

  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRecords);

  // Generate page numbers with ellipsis window
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // how many pages to show around current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className="pagination-bar">
      {/* Left side: Rows per page & counter */}
      <div className="pagination-info">
        <span className="records-range">
          Showing <strong>{startRecord}</strong>–<strong>{endRecord}</strong> of{' '}
          <strong>{totalRecords.toLocaleString()}</strong>
        </span>

        <label className="limit-selector">
          <span className="limit-label">Rows:</span>
          <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>

      {/* Right side: Stepper controls */}
      <div className="pagination-controls">
        <button
          className="step-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          className="step-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="page-numbers">
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`dots-${idx}`} className="dots">
                ...
              </span>
            ) : (
              <button
                key={page}
                className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          className="step-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>

        <button
          className="step-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
