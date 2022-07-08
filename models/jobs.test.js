"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./jobs.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "newJob",
    salary: 100,
    equity: 1.0,
    company_handle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle
             FROM jobs
             WHERE company_handle = 'c1'`
    );
    expect(result.rows).toEqual([
      {
        title: "newJob",
        salary: 100,
        equity: 1.0,
        company_handle: "c1",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      throw new Error("Fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 1,
        equity: 0.01,
        company_handle: "c1",
      },
      {
        title: "j2",
        salary: 2,
        equity: 0.02,
        company_handle: "c2",
      },
      {
        title: "j3",
        salary: 3,
        equity: 0.03,
        company_handle: "c3",
      },
    ]);
  });
});

/************************************** remove */

describe("remove", function () {
    test("works", async function () {
      await Job.remove("j1");
      const res = await db.query(
        "SELECT title FROM jobs WHERE title='j1'"
      );
      expect(res.rows.length).toEqual(0);
    });
  
    test("not found if no such Job", async function () {
      try {
        await Job.remove("nope");
        fail();
      } catch (err) {
        expect(err instanceof NotFoundError).toBeTruthy();
      }
    });
  });

/************************************** get */

describe("get", function () {
    test("works", async function () {
      let job = await Job.get("c1");
      expect(job).toEqual({
        title: "j1",
        salary: 1,
        equity: 0.01,
        company_handle: "c1",
      });
    });
  
    test("not found if no such Job", async function () {
      try {
        await Job.get("nope");
        fail();
      } catch (err) {
        expect(err instanceof NotFoundError).toBeTruthy();
      }
    });
  });


