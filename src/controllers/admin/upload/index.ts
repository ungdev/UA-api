import { Router } from 'express';
import multer from 'multer';
import uploadFile from './uploadFile';
import deleteFile from './deleteFile';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.delete('/:path', deleteFile);
router.post('/', upload.single('file'), uploadFile);

export default router;
