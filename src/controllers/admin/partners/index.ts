import { Router } from 'express';
import updatePartner from './updatePartner';
import addPartner from './addPartner';
import removePartner from './removePartner';

const router = Router();

router.post('/', addPartner);
router.patch('/:partnerId', updatePartner);
router.delete('/:partnerId', removePartner);

export default router;
