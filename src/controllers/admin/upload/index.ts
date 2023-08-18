import { Router } from 'express';
import uploadFile from './uploadFile';

const router = Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('file'), uploadFile);

export default router;
