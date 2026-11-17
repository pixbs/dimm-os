// A list whose rows have two or three columns; in a compact window a row folds into its first cell as a title and the
// others as label and value, so the column labels stand beside each cell instead of above.
export function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="table" role="table">
      <div className="row table__row table__head" role="row">
        {columns.map((label, at) => (
          <span className="table__cell" key={at} role="columnheader">
            {label}
          </span>
        ))}
      </div>
      {rows.map((cells, at) => (
        <div className="row table__row" key={at} role="row">
          {cells.map((cell, index) => (
            <span className="table__cell" data-label={columns[index]} key={index} role="cell">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
