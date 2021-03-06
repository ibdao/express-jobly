"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
          RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`
    );
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
          handle,
          name,
          description,
          num_employees AS "numEmployees",
          logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
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
 *     whereCondition: 'name ILIKE $1 AND num_employees >= $2 AND num_employees <= $3',
 *     values: ['%Anderson%', '10', '500']
 *  }
 */
  static _sqlForWhereClause(queries) {
  const keys = Object.keys(queries);
  const conditions = keys.map((searchTerm, idx) => {
    if (searchTerm !== "name") {
      if (searchTerm.startsWith("min")) {
        return `num_employees >= $${idx + 1}`;
      } else if (searchTerm.startsWith("max")) {
        return `num_employees <= $${idx + 1}`;
      }
    } else {
      return `name ILIKE $${idx + 1}`;
    }
  });

  if (queries.name) {
    queries["name"] = "%" + queries["name"] + "%";
  }

  return {
    whereCondition: conditions.join(" AND "),
    values: Object.values(queries),
  };
}

  /** Filters companies based on searched terms: name, minEmployees, maxEmployees.
   *
   *  Throws BadRequestError if searched max employees is less than min employees.
   *  Returns empty array if no companies match the search criteria.
   */

  static async filter(queries) {
    if (Number(queries.maxEmployees) < Number(queries.minEmployees)) {
      throw new BadRequestError(
        "Max employees cannot be less than min employees"
      );
    }

    const { whereCondition, values } = this._sqlForWhereClause(queries);
    const querySql = `
      SELECT
          handle,
          name,
          description,
          num_employees AS "numEmployees",
          logo_url AS "logoUrl"
        FROM companies
        WHERE ${whereCondition}
        ORDER BY name`;
    const result = await db.query(querySql, [...values]);
    const companies = result.rows;

    return companies;
  }

}

module.exports = Company;
