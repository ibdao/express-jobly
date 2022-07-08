"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {
  /** Create a Job (from data), update db, return new Job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws BadRequestError if Job already in database.
   * */

  static async create({ title, salary, equity, company_handle }) {
    const duplicateCheck = await db.query(
      `SELECT title
           FROM jobs
           WHERE title = $1`,
      [title]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate Job: ${title}`);

    const result = await db.query(
      `INSERT INTO jobs(
          title,
          salary,
          equity,
          company_handle)
           VALUES
             ($1, $2, $3, $4)
          RETURNING
          title,
          salary,
          equity,
          company_handle`,
      [title, salary, equity, company_handle]
    );
    const Job = result.rows[0];

    return Job;
  }

  /** Find all companies.
   *
   * Returns [{ title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT title,
      salary,
      equity,
      company_handle
           FROM jobs
           ORDER BY title`
    );
    return jobsRes.rows;
  }

  /** Given a Job handle, return data about Job.
   *
   * Returns { title, salary, equity, company_handle, jobs }
   *   where jobs is [{ id, title, salary, equity, company_handle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title) {
    const jobRes = await db.query(
      `SELECT title,
      salary,
      equity,
      company_handle
           FROM jobs
           WHERE title = $1`,
      [title]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No Job: ${title}`);

    return job;
  }

  /** Update Job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {title, salary, equity, company_handle}
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
    const Job = result.rows[0];

    if (!Job) throw new NotFoundError(`No Job: ${handle}`);

    return Job;
  }

  /** Delete given Job from database; returns undefined.
   *
   * Throws NotFoundError if Job not found.
   **/

  static async remove(title) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE title = $1
           RETURNING title`,
      [title]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No Job: ${title}`);
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

module.exports = Job;
