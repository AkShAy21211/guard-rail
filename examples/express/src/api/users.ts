import { Router } from "express";
// PLANTED VIOLATION: the API layer reaches straight into the database
// layer instead of going through UserService. guardrail check's
// api-must-go-through-services rule should flag this line.
import { query } from "../database/connection";

export const usersRouter = Router();

usersRouter.get("/users", (_req, res) => {
  res.json(query("SELECT * FROM users"));
});
