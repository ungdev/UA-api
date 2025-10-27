import { Request, Response } from "express";
import { deleteFaq } from "../../../operations/faq";
import { hasPermission } from "../../../middlewares/authentication";
import { Permission } from "../../../types";

export default [
  ...hasPermission(Permission.admin),

  async function deleteFaqHandler(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await deleteFaq(id);
      return res.status(204).send();
    } catch (err) {
      console.error("Error deleting FAQ:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
];
