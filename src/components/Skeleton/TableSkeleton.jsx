import React from 'react';
import './Skeleton.css';

/**
 * Shimmer placeholder rows for a loading table. Improves perceived performance
 * over a bare "Loading…" label. Renders its own mi-table-wrap so it can drop in
 * wherever a table would be.
 */
function TableSkeleton({ columns = 5, rows = 5 }) {
  return (
    <div className="mi-table-wrap" aria-busy="true" aria-label="Loading…">
      <table className="mi-tbl">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}>
                  <span className="mi-skel" style={{ width: c === 0 ? '70%' : '55%' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableSkeleton;
