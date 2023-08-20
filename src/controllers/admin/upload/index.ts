import { Router } from 'express';
import multer = require('multer');
import uploadFile from './uploadFile';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('file'), uploadFile);

export default router;
