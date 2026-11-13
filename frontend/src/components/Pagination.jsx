/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";

export function usePagedList(items, defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pageCount = Math.max(
    1,
    Math.ceil((items ? items.length : 0) / pageSize),
  );

  const safePage = Math.min(page, pageCount);

  const pageItems = (items || []).slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return {
    page: safePage,
    pageCount,
    pageSize,
    total: (items || []).length,
    setPage,
    setPageSize,
    pageItems,
    absoluteIndex: (index) => (safePage - 1) * pageSize + index + 1,
  };
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  setPage,
  setPageSize,
}) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = [];

  for (let number = 1; number <= pageCount; number++) {
    if (
      number === 1 ||
      number === pageCount ||
      Math.abs(number - page) <= 2
    ) {
      pages.push(number);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="table-pager">
      <button
        type="button"
        className="btn btn-clear"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Prev
      </button>

      <div className="table-pager-pages">
        {pages.map((number, index) =>
          number === "…" ? (
            <span key={`dots-${index}`} className="table-pager-dots">
              …
            </span>
          ) : (
            <button
              key={number}
              type="button"
              className={`table-pager-page ${
                number === page ? "active" : ""
              }`}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ),
        )}
      </div>

      <span className="table-pager-info">
        Page {page} of {pageCount} ({total} items)
      </span>

      <button
        type="button"
        className="btn btn-clear"
        disabled={page >= pageCount}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>

      <select
        className="table-pager-size"
        value={String(pageSize)}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(1);
        }}
      >
        <option value="5">5 / page</option>
        <option value="10">10 / page</option>
        <option value="25">25 / page</option>
        <option value="50">50 / page</option>
      </select>
    </div>
  );
}

export default Pagination;
