import { Router } from "express";
import getFaq from "./getFaq";
import createFaq from "./createFaq";
import updateFaq from "./updateFaq";
import deleteFaq from "./deleteFaq";

const router = Router();

// Récupérer toutes les FAQ ou une seule par ID
router.get("/", getFaq);
router.get("/:id", getFaq);

// Créer une FAQ
router.post("/", createFaq);

// Mettre à jour une FAQ
router.put("/:id", updateFaq);

// Supprimer une FAQ
router.delete("/:id", deleteFaq);

export default router;
