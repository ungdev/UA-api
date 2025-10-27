import {PrismaPromise } from '@prisma/client';
import type { PrimitiveFaq, Faq} from "../types";
import database from '../services/database';
import { nanoid } from 'nanoid';

// Récupère toutes les FAQs
export async function getAllFaqs(): Promise<Faq[]> {
  const faqs: PrimitiveFaq[] = await database.faq.findMany({
    orderBy: { category: "asc" },
  });

  // On convertit en Faq (ici, c’est identique, mais tu pourras enrichir plus tard)
  return faqs.map(faq => ({
    ...faq,
    id: String(faq.id),
    category: faq.category,
    question: faq.question,
    answer: faq.answer,
    display: faq.display,
  }));
}

// Récupère une FAQ par son ID
export async function getFaqById(id: string): Promise<Faq | null> {
  const faq = await database.faq.findUnique({ where: { id } });
  if (!faq) return null;

  return {
    ...faq,
    id: String(faq.id),
    category: faq.category,
    question: faq.question,
    answer: faq.answer,
    display: faq.display,
  };
}


// Crée une nouvelle FAQ
export async function createFaq(category:string, question:string, answer:string, display:boolean): Promise<Faq> {
  const faq = await database.faq.create({
    data: {
      id: nanoid(),
      category,
      question,
      answer,
      display,
    }
  });
  return { ...faq, id: String(faq.id) };
}



//Met à jour une FAQ existante
export async function updateFaq(id: string, category:string, question:string, answer:string, display:boolean): Promise<Faq> {
  const faq = await database.faq.update({
    where: { id },
    data: { category, question, answer, display },
  });
  return { ...faq, id: String(faq.id) };
}

// Supprime une FAQ
export async function deleteFaq(id: string): Promise<void> {
  await database.faq.delete({ where: { id } });
}
