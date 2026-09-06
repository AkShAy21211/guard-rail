import express from "express";
import { usersRouter } from "./api/users";

const app = express();
app.use(usersRouter);

export default app;
