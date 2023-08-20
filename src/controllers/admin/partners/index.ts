import { Router } from 'express';
import updatePartner from './updatePartner';
import addPartner from './addPartner';
import removePartner from './removePartner';
import getPartners from './getPartners';

const router = Router();

router.get('/', getPartners);
router.post('/', addPartner);
router.patch('/:partnerId', updatePartner);
router.delete('/:partnerId', removePartner);

export default router;
