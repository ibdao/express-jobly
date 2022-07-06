"use strict";
function sqlFilterClause(queries) {
  const keys = Object.keys(queries);

  const cols = keys.map(
    // max = $1      // name ILIKE $2  // name %name%
    (colName, idx) => {
      if (colName !== "name") {
        `"${colName}"=$${idx + 1}`;
      }
      `"${colName}" ILIKE %${queries[colName]}%`;
    }
  );
  delete queries.name;
  return {
    setCols: cols.join(" AND "),
    values: Object.values(queries),
  };
}

module.exports = { sqlFilterClause };
