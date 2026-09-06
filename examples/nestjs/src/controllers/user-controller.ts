// PLANTED VIOLATION: this file should be named UserController.ts to match
// the project's controller-naming convention (see the other file in this
// folder, PostController.ts).
import { UserService } from "../services/UserService";

export class UserControllerImpl {
  private readonly service = new UserService();

  list() {
    return this.service.findAll();
  }
}
