"use strict";
const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate, sqlForWhereClause } = require("./sql");

describe("partial update", function () {
  const data = {
    firstName: "Benji",
    lastName: "Mac",
  };

  test("works", function () {
    let result = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
    });
    expect(result).toEqual({
      setCols: '"first_name"=$1, "last_name"=$2',
      values: ["Benji", "Mac"],
    });
  });

  test("not working", function () {
    expect(() => {
      sqlForPartialUpdate({}, {});
    }).toThrowError(new BadRequestError("No data"));
  });
});

describe("creates WHERE clause for filtering", function () {
  test("returns correct object if all three criteria are passed", function () {
    const queries = {
      name: "gree",
      minEmployees: "10",
      maxEmployees: "200",
    };

    const results = sqlForWhereClause(queries);
    expect(results.whereCondition).toContain("%gree%");
    expect(results.values).toEqual(["10", "200"]);
  });

  test("returns correct object if only name is passed", function () {
    const queries = {
      name: "gree",
    };

    const results = sqlForWhereClause(queries);
    expect(results.whereCondition).toContain("%gree%");
    expect(results.values).toEqual([]);
  });

  test("returns correct object if only minEmployees and maxEmployees", function () {
    const queries = {
      minEmployees: "10",
      maxEmployees: "200",
    };

    const results = sqlForWhereClause(queries);
    expect(results.whereCondition).toEqual(
      "num_employees >= $1 AND num_employees <= $2"
    );
    expect(results.values).toEqual(["10", "200"]);
  });
});
