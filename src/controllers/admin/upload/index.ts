import { Router } from 'express';
import multer = require('multer');
import uploadFile from './uploadFile';
import deleteFile from './deleteFile';
import uploadPhoto from '../users/updateTrombi';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.delete('/:path', deleteFile);
router.post('/', upload.single('file'), uploadFile);

export default router;
