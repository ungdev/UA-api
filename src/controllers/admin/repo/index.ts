import { Router } from 'express';
import getRepoItems from './getRepoItems';
import depositRepoItem from './depositRepoItem';
import removeRepoItem from './removeRepoItem';
import getRepoLogs from './getRepoLogs';

const router = Router();

router.get('/user', getRepoItems);
router.post('/user/{userId}/items', depositRepoItem);
router.delete('/user/:userId/items/:itemId', removeRepoItem);
router.get('/user/:userId/logs', getRepoLogs);

export default router;
