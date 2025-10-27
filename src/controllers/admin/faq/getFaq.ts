import { Request, Response } from "express";
import { getAllFaqs, getFaqById } from "../../../operations/faq";
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';

export default[
  // Middlewares
   ...hasPermission(Permission.admin), 
async function getFaq(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (id) {
      const faq = await getFaqById(id);
      if (!faq) return res.status(404).json({ error: "FAQ not found" });
      return res.json(faq);
    }

    const faqs = await getAllFaqs();
    return res.json(faqs);
  } catch (err) {
    console.error("Error fetching FAQ:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
];