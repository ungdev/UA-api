import { Request, Response } from "express";
import { createFaq } from "../../../operations/faq";
import { hasPermission } from "../../../middlewares/authentication";
import { Permission } from "../../../types";

export default [
  ...hasPermission(Permission.admin),

  async function createFaqHandler(req: Request, res: Response) {
    try {
      const { category, question, answer, display } = req.body;

      if (!category || !question || !answer) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const faq = await createFaq(category, question, answer, display);
      return res.status(201).json(faq);
    } catch (err) {
      console.error("Error creating FAQ:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
];
