import { query } from "../database/connection";

export class UserService {
  findAll(): unknown[] {
    return query("SELECT * FROM users");
  }
}
