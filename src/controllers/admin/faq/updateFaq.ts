import { Request, Response } from "express";
import { updateFaq } from "../../../operations/faq";
import { hasPermission } from "../../../middlewares/authentication";
import { Permission } from "../../../types";

export default [
  ...hasPermission(Permission.admin),

  async function updateFaqHandler(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;

      const faq = await updateFaq(id, data.category, data.question, data.answer, data.display);
      return res.json(faq);
    } catch (err) {
      console.error("Error updating FAQ:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
];
