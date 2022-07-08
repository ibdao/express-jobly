"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const { authenticateJWT, ensureLoggedIn, ensureAdmin, ensureUserOrAdmin } = require("./auth");

const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");
const adminJwt = jwt.sign({ username: "admin", isAdmin: true }, SECRET_KEY);

describe("authenticateJWT", function () {
  test("works: via header", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    expect.assertions(2);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});

describe("ensureLoggedIn", function () {
  test("works", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test" } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureLoggedIn(req, res, next);
  });
});

describe("ensureAdmin", function () {
  test("works", function () {
    //TODO: write a test that will fail bc isAdmin is set to undefined
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureAdmin(req, res, next);
  });

  test("when not an admin", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "u1", isAdmin: false } } };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureAdmin(req, res, next);
  });

  //TODO: add a test for not logged in at all. 
});

describe("ensureUserOrAdmin", function () {
  test("works if username and req.params.username matches, does not have to be admin", 
  function () {
    expect.assertions(1);
    const req = { params:{ username : "u1" } };
    const res = { locals: { user: { username: "u1", isAdmin: false } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureUserOrAdmin(req, res, next);
  });

  test("works if admin and not same user", function () {
    const req = { params:{ username : "u1" } };
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureUserOrAdmin(req, res, next);
  });

  test("when not same user and not admin", function () {
    expect.assertions(1);
    const req = { params:{ username : "u1" } };
    const res = { locals: { user: { username: "u2", isAdmin: false } } };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureUserOrAdmin(req, res, next);
  });

});
