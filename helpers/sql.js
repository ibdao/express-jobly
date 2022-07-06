const { BadRequestError } = require("../expressError");

/**  sqlForPartialUpdate: takes in an object with values to be updated
 * returns an oject containing columns for
 * sql SET clause and the updated values.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/** Builds the SQL WHERE clause based on the given search terms passed through
 *  the query string. 
 *   
 *  Takes: {
 *     name: Anderson,
 *     minEmployees: 10,
 *     maxEmployees: 500
 *  }
 * 
 *  Returns {
 *     whereCondition: 'name ILIKE %Anderson% AND minEmployees = $1 AND maxEmployees = $2',
 *     values: [10, 500]
 *  }
 */
 function sqlForWhereClause(queries) {

  const keys = Object.keys(queries);
  const searchTerm = keys.map(
    (searchTerm, idx) => {
      if (searchTerm !== "name") {
        if (searchTerm.startsWith("min")){
          return `num_employees >= $${idx + 1}`;
        } else if (searchTerm.startsWith("max")){
          return `num_employees <= $${idx + 1}`;
        }
      }else{
        return `${searchTerm} ILIKE '%${queries[searchTerm]}%'`;
      }
    }
  );
  delete queries.name;

  return {
    whereCondition: searchTerm.join(" AND "),
    values: Object.values(queries),
  };
}

module.exports = { sqlForPartialUpdate, sqlForWhereClause  };
